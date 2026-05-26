'use client'

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface LocationFeatureProps {
  franchiseCode: string
}

interface FranchiseV2 {
  id: string
  code: string
  name: string
  branding_config: Record<string, any> | null
}

export function LocationFeature({ franchiseCode }: LocationFeatureProps) {
  const [franchise, setFranchise] = useState<FranchiseV2 | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFranchise = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/public/franchises-v2/${encodeURIComponent(franchiseCode.toLowerCase())}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError("Franchise not found")
            return
          }
          throw new Error(`Failed to fetch franchise: ${response.statusText}`)
        }
        const franchiseData = await response.json()
        setFranchise(franchiseData)
      } catch (err: any) {
        console.error("Error fetching franchise:", err)
        setError(err.message || "Failed to load franchise data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchFranchise()
  }, [franchiseCode])

  if (isLoading) {
    return (
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </section>
    )
  }

  if (error || !franchise) {
    return null // 如果出错或没有数据，不显示组件
  }

  const brandingConfig = franchise.branding_config
  if (!brandingConfig || typeof brandingConfig !== 'object') {
    return null // 如果没有 branding_config，不显示组件
  }

  // 从 branding_config 中提取 features 信息
  // branding_config 的结构可能是：
  // {
  //   features?: {
  //     title?: string
  //     description?: string
  //     items?: Array<{
  //       title: string
  //       description: string
  //       icon?: string
  //     }>
  //   }
  // }
  const features = brandingConfig.features

  if (!features || !features.items || !Array.isArray(features.items) || features.items.length === 0) {
    return null // 如果没有 features 数据，不显示组件
  }

  return (
    <section className="py-16 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {(features.title || features.description) && (
          <div className="text-center mb-12">
            {features.title && (
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {features.title}
              </h2>
            )}
            {features.description && (
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                {features.description}
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.items.map((item: any, index: number) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-shadow"
            >
              {item.icon && (
                <div className="text-4xl mb-4">{item.icon}</div>
              )}
              {item.title && (
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {item.title}
                </h3>
              )}
              {item.description && (
                <p className="text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
