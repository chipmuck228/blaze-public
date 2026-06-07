import { supabaseAdmin } from "@/lib/supabase"
import { catalogTables } from "@/lib/catalog-db"

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message
    if (typeof msg === "string") return msg
  }
  return String(error)
}

export interface AdminTestimonial {
  id: string
  user_id: string
  campus_id: string | null
  comment: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  name: string
  email: string | null
  image_url: string | null
  location_name: string | null
}

export interface TestimonialCreateInput {
  user_id: string
  comment: string
  campus_id?: string | null
  display_order?: number
  is_active?: boolean
}

export interface TestimonialUpdateInput {
  comment: string
  campus_id?: string | null
  display_order?: number
  is_active?: boolean
}

const TESTIMONIAL_SELECT = `
  id,
  user_id,
  campus_id,
  comment,
  display_order,
  is_active,
  created_at,
  updated_at,
  user:users(id, name, email, image)
`

type CampusRef = { id: string; name: string; display_name: string | null }

function normalizeCampusId(campusId: string | null | undefined): string | null {
  if (!campusId || typeof campusId !== "string") return null
  const trimmed = campusId.trim()
  if (!trimmed || trimmed === "all") return null
  return trimmed
}

async function lookupCampusesByIds(
  campusIds: Array<string | null | undefined>
): Promise<Map<string, CampusRef>> {
  const unique = [...new Set(campusIds.filter((id): id is string => Boolean(id)))]
  if (unique.length === 0) return new Map()

  const { data, error } = await supabaseAdmin
    .from(catalogTables.location)
    .select("id, name, display_name")
    .in("id", unique)

  if (error) {
    throw new Error(toErrorMessage(error))
  }

  const map = new Map<string, CampusRef>()
  for (const row of data || []) {
    map.set(row.id, row)
  }
  return map
}

async function resolveCampusIdForWrite(
  campusId: string | null | undefined
): Promise<string | null> {
  const normalized = normalizeCampusId(campusId)
  if (!normalized) return null

  const { data, error } = await supabaseAdmin
    .from(catalogTables.location)
    .select("id")
    .eq("id", normalized)
    .maybeSingle()

  if (error) {
    throw new Error(toErrorMessage(error))
  }
  if (!data) {
    throw new Error(
      "Location not found. Choose a location from the list or use network-wide."
    )
  }
  return data.id
}

async function assertUserExists(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, role, is_test_user")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(toErrorMessage(error))
  }
  if (!data) {
    throw new Error("User not found")
  }
  if (data.role !== "user" || data.is_test_user) {
    throw new Error("Selected user must be a non-test user account")
  }
}

function formatRow(
  row: Record<string, unknown>,
  campusById: Map<string, CampusRef>
): AdminTestimonial {
  const user = Array.isArray(row.user)
    ? (row.user[0] as Record<string, unknown> | undefined)
    : (row.user as Record<string, unknown> | undefined)
  const campusId = (row.campus_id as string | null) ?? null
  const campus = campusId ? campusById.get(campusId) : undefined

  return {
    id: row.id as string,
    user_id: row.user_id as string,
    campus_id: campusId,
    comment: row.comment as string,
    display_order: (row.display_order as number) ?? 0,
    is_active: (row.is_active as boolean) ?? true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    name: (user?.name as string) || "Anonymous",
    email: (user?.email as string | null) ?? null,
    image_url: (user?.image as string | null) ?? null,
    location_name: campus ? campus.display_name || campus.name : null,
  }
}

export async function listTestimonialsAdmin(): Promise<AdminTestimonial[]> {
  const { data, error } = await supabaseAdmin
    .from("testimonials")
    .select(TESTIMONIAL_SELECT)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(toErrorMessage(error))
  }

  const rows = data || []
  const campusById = await lookupCampusesByIds(
    rows.map((row) => row.campus_id as string | null)
  )
  return rows.map((row) => formatRow(row as Record<string, unknown>, campusById))
}

export async function getTestimonialAdmin(id: string): Promise<AdminTestimonial | null> {
  const { data, error } = await supabaseAdmin
    .from("testimonials")
    .select(TESTIMONIAL_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(toErrorMessage(error))
  }

  if (!data) return null

  const campusById = await lookupCampusesByIds([data.campus_id as string | null])
  return formatRow(data as Record<string, unknown>, campusById)
}

export async function createTestimonialAdmin(
  input: TestimonialCreateInput
): Promise<AdminTestimonial> {
  const comment = input.comment.trim()
  if (!comment) {
    throw new Error("Comment is required")
  }
  if (!input.user_id?.trim()) {
    throw new Error("User is required")
  }

  await assertUserExists(input.user_id.trim())
  const campus_id = await resolveCampusIdForWrite(input.campus_id)

  const { data, error } = await supabaseAdmin
    .from("testimonials")
    .insert({
      user_id: input.user_id.trim(),
      campus_id,
      comment,
      display_order: input.display_order ?? 0,
      is_active: input.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(toErrorMessage(error))
  }

  const created = await getTestimonialAdmin(data.id as string)
  if (!created) {
    throw new Error("Failed to load created testimonial")
  }

  return created
}

export async function updateTestimonialAdmin(
  id: string,
  input: TestimonialUpdateInput
): Promise<AdminTestimonial> {
  const existing = await getTestimonialAdmin(id)
  if (!existing) {
    throw new Error("Testimonial not found")
  }

  const comment = input.comment.trim()
  if (!comment) {
    throw new Error("Comment is required")
  }

  const campus_id = await resolveCampusIdForWrite(input.campus_id)

  const { error } = await supabaseAdmin
    .from("testimonials")
    .update({
      comment,
      campus_id,
      display_order: input.display_order ?? 0,
      is_active: input.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    throw new Error(toErrorMessage(error))
  }

  const updated = await getTestimonialAdmin(id)
  if (!updated) {
    throw new Error("Failed to load updated testimonial")
  }

  return updated
}

export async function deleteTestimonialAdmin(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("testimonials").delete().eq("id", id)
  if (error) {
    throw new Error(toErrorMessage(error))
  }
}
