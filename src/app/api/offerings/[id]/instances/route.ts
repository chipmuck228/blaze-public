import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { getInstanceAvailableCapacity, getFranchiseByCode, type Franchise } from "@/lib/db"

// GET: 获取offering的所有可用实例（公开 API，只返回已发布offerings的实例）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")

    // 检查offering是否存在且已发布
    const { data: offering, error: offeringError } = await supabaseAdmin
      .from('offerings_v2')
      .select('id, status')
      .eq('id', id)
      .single()

    if (offeringError || !offering) {
      return NextResponse.json(
        { error: "Offering not found" },
        { status: 404 }
      )
    }

    if (offering.status !== 'published') {
      // 已归档、暂停或草稿状态的offering不对外显示实例
      return NextResponse.json([], { status: 200 })
    }

    // 查询instance_v2表
    let instancesQuery = supabaseAdmin
      .from('instance_v2')
      .select(`
        *,
        offering:offerings_v2(
          id,
          name,
          slug,
          description,
          poster_url,
          base_price
        ),
        series:course_series(
          id,
          name,
          display_name,
          franchise_id
        ),
        category:course_categories(
          id,
          name,
          display_name
        )
      `)
      .eq('offering_id', id)
      .eq('is_active', true)
      .in('status', ['scheduled', 'ongoing'])
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true })

    // 如果指定了franchise，获取franchise信息（包括legacy_id映射）
    let franchise: Franchise | null = null
    const franchiseIds: string[] = []
    const legacyToNewMap: Map<string, string> = new Map()
    
    if (franchiseCode) {
      franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }
      
      // 获取franchise的所有可能ID（新表ID和旧表ID）
      franchiseIds.push(franchise.id)
      
      // 如果franchise来自新表，尝试获取legacy_id
      try {
        const { getFranchiseV2, getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
        const franchiseV2 = await getFranchiseV2(franchise.id)
        if (franchiseV2?.legacy_franchise_id) {
          franchiseIds.push(franchiseV2.legacy_franchise_id)
          legacyToNewMap.set(franchiseV2.legacy_franchise_id, franchise.id)
        }
        
        // 预先构建legacy_id到新表ID的映射，用于后续过滤
        // 如果series.franchise_id是旧表ID，我们需要知道它映射到哪个新表ID
        for (const legacyId of franchiseIds) {
          if (legacyId !== franchise.id) {
            // 这已经是legacy_id了，不需要再查询
            continue
          }
          // 检查franchise.id是否是新表ID，如果是，我们已经有了legacy映射
        }
      } catch (error) {
        // 如果获取失败，继续使用franchise.id
        console.warn(`[v2_franchise] Could not get franchise for ${franchise.id}:`, error)
      }
      
      // 构建查询条件：匹配franchise_id或为null
      const franchiseConditions = franchiseIds.map(id => `franchise_id.eq.${id}`).join(',')
      instancesQuery = instancesQuery.or(`${franchiseConditions},franchise_id.is.null`)
    }

    const { data: instancesData, error: instancesError } = await instancesQuery

    if (instancesError) {
      throw new Error(`Failed to fetch instances: ${instancesError.message}`)
    }

    let instances = (instancesData || []) as any[]

    // 如果指定了franchise，进一步过滤（从series.franchise_id）
    if (franchiseCode && franchise && franchiseIds.length > 0) {
      instances = instances.filter((instance) => {
        // 如果instance有franchise_id，必须匹配（包括legacy_id）
        if (instance.franchise_id && franchiseIds.includes(instance.franchise_id)) {
          return true
        }
        
        // 如果instance.franchise_id为null，从series.franchise_id推导
        if (!instance.franchise_id) {
          const series = Array.isArray(instance.series) ? instance.series[0] : instance.series
          if (series?.franchise_id) {
            // 检查series.franchise_id是否匹配（包括legacy_id）
            if (franchiseIds.includes(series.franchise_id)) {
              return true
            }
            
            // 检查legacy映射：如果series.franchise_id是旧表ID，检查是否映射到目标franchise
            if (legacyToNewMap.has(series.franchise_id)) {
              const mappedNewId = legacyToNewMap.get(series.franchise_id)
              if (mappedNewId === franchise.id) {
                return true
              }
            }
          }
        }
        
        return false
      })
    }

    // 批量获取所有相关的 campuses
    const locationIds = new Set<string>()
    const franchiseIdsForCampuses = new Set<string>()
    instances.forEach((inst) => {
      if (inst.location_id) {
        locationIds.add(inst.location_id)
      }
      if (inst.franchise_id) {
        franchiseIdsForCampuses.add(inst.franchise_id)
      } else {
        // 如果没有 franchise_id，尝试从 series 获取
        const series = Array.isArray(inst.series) ? inst.series[0] : inst.series
        if (series?.franchise_id) {
          franchiseIdsForCampuses.add(series.franchise_id)
        }
      }
    })

    // 批量查询 campuses
    const campusesMap = new Map<string, any>()
    if (locationIds.size > 0) {
      const { data: campusesData, error: campusesError } = await supabaseAdmin
        .from('campuses')
        .select('id, name, address, city, state, zip_code, franchise_id')
        .in('id', Array.from(locationIds))
        .eq('is_active', true)

      if (!campusesError && campusesData) {
        campusesData.forEach((campus) => {
          campusesMap.set(campus.id, campus)
        })
        console.log(`[Offerings Instances API] Loaded ${campusesData.length} campuses by location_id`)
      }
    }

    // 对于没有 location_id 的 instances，尝试通过 franchise_id 获取第一个 campus
    const franchiseCampusesMap = new Map<string, any>()
    if (franchiseIdsForCampuses.size > 0) {
      // 需要将 franchise_id 映射到 franchises_v2.id
      const franchiseIdsArray = Array.from(franchiseIdsForCampuses)
      const { data: franchiseCampusesData, error: franchiseCampusesError } = await supabaseAdmin
        .from('campuses')
        .select('id, name, address, city, state, zip_code, franchise_id')
        .in('franchise_id', franchiseIdsArray)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (!franchiseCampusesError && franchiseCampusesData) {
        // 为每个 franchise 存储第一个 campus
        franchiseCampusesData.forEach((campus) => {
          if (!franchiseCampusesMap.has(campus.franchise_id)) {
            franchiseCampusesMap.set(campus.franchise_id, campus)
          }
        })
        console.log(`[Offerings Instances API] Loaded campuses for ${franchiseCampusesMap.size} franchises`)
      }
    }

    // 获取每个实例的可用容量和折扣信息
    // 对于instance_v2表，直接使用表中的max_students和current_students字段
    // instance_v2表已经包含了容量信息，不需要查询course_enrollments表或考虑旧表映射
    const instancesWithCapacity = instances.map((instance) => {
      const maxStudents = instance.max_students ?? 0
      const currentStudents = instance.current_students ?? 0
      const availableCapacity = Math.max(0, maxStudents - currentStudents)
      
      // 获取 location (campus) 信息
      let location: Record<string, unknown> | null = null
      if (instance.location_id) {
        // 优先使用 location_id 匹配的 campus
        location = campusesMap.get(instance.location_id)
      }
      // 如果没有找到，尝试使用 franchise_id 获取第一个 campus
      if (!location) {
        const franchiseId = instance.franchise_id || (Array.isArray(instance.series) ? instance.series[0]?.franchise_id : instance.series?.franchise_id)
        if (franchiseId) {
          location = franchiseCampusesMap.get(franchiseId)
        }
      }
      
      // 计算折扣信息
      const offering = Array.isArray(instance.offering) ? instance.offering[0] : instance.offering
      const basePrice = offering?.base_price ?? 0
      const priceOverride = instance.price_override
      const hasDiscount = priceOverride !== null && priceOverride !== undefined && priceOverride < basePrice && basePrice > 0
      const discountAmount = hasDiscount ? basePrice - priceOverride : 0
      const discountPercentage = hasDiscount && basePrice > 0 
        ? Math.round((discountAmount / basePrice) * 100) 
        : 0
      
      return {
        ...instance,
        location: location,
        available_capacity: availableCapacity,
        is_full: availableCapacity <= 0,
        discount: hasDiscount ? {
          has_discount: true,
          original_price: basePrice,
          discounted_price: priceOverride,
          discount_amount: discountAmount,
          discount_percentage: discountPercentage,
        } : {
          has_discount: false,
        },
      }
    })

    // 只返回未来的实例（start_date >= today）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const futureInstances = instancesWithCapacity.filter(instance => {
      const startDate = new Date(instance.start_date)
      startDate.setHours(0, 0, 0, 0)
      return startDate >= today
    })

    // 调试日志：记录过滤结果
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Offering ${id} Instances] Summary:`, {
        total_instances: instances.length,
        instances_with_capacity: instancesWithCapacity.length,
        future_instances: futureInstances.length,
        all_full: futureInstances.length > 0 && futureInstances.every(inst => inst.is_full),
        instances_detail: futureInstances.map(inst => ({
          id: inst.id,
          start_date: inst.start_date,
          available_capacity: inst.available_capacity,
          is_full: inst.is_full,
          max_students: inst.max_students,
        })),
      })
    }

    return NextResponse.json(futureInstances)
  } catch (error: unknown) {
    console.error("Error fetching offering instances:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch offering instances" },
      { status: 500 }
    )
  }
}
