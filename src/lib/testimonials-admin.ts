import bcrypt from "bcryptjs"
import crypto from "crypto"
import { getUserByEmail } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

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
  franchise_id: string | null
  comment: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  name: string
  email: string | null
  image_url: string | null
  franchise_code: string | null
  franchise_name: string | null
}

export interface TestimonialWriteInput {
  name: string
  email?: string | null
  image_url?: string | null
  comment: string
  franchise_id?: string | null
  display_order?: number
  is_active?: boolean
  user_id?: string | null
  created_by?: string | null
}

const TESTIMONIAL_SELECT = `
  id,
  user_id,
  franchise_id,
  comment,
  display_order,
  is_active,
  created_at,
  updated_at,
  user:users(id, name, email, image)
`

type V2FranchiseRef = { id: string; code: string; name: string }

async function lookupV2FranchisesByIds(
  franchiseIds: Array<string | null | undefined>
): Promise<Map<string, V2FranchiseRef>> {
  const unique = [...new Set(franchiseIds.filter((id): id is string => Boolean(id)))]
  if (unique.length === 0) return new Map()

  const { data, error } = await supabaseAdmin
    .from("v2_franchise")
    .select("id, code, name")
    .in("id", unique)

  if (error) {
    throw new Error(toErrorMessage(error))
  }

  const map = new Map<string, V2FranchiseRef>()
  for (const row of data || []) {
    map.set(row.id, row)
  }
  return map
}

async function assertV2FranchiseId(franchiseId: string | null | undefined): Promise<void> {
  if (!franchiseId) return

  const { data, error } = await supabaseAdmin
    .from("v2_franchise")
    .select("id")
    .eq("id", franchiseId)
    .maybeSingle()

  if (error) {
    throw new Error(toErrorMessage(error))
  }
  if (!data) {
    throw new Error("Invalid franchise_id. Campus must exist in v2_franchise.")
  }
}

function formatRow(
  row: Record<string, unknown>,
  franchiseById: Map<string, V2FranchiseRef>
): AdminTestimonial {
  const user = Array.isArray(row.user)
    ? (row.user[0] as Record<string, unknown> | undefined)
    : (row.user as Record<string, unknown> | undefined)
  const franchiseId = (row.franchise_id as string | null) ?? null
  const franchise = franchiseId ? franchiseById.get(franchiseId) : undefined

  return {
    id: row.id as string,
    user_id: row.user_id as string,
    franchise_id: (row.franchise_id as string | null) ?? null,
    comment: row.comment as string,
    display_order: (row.display_order as number) ?? 0,
    is_active: (row.is_active as boolean) ?? true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    name: (user?.name as string) || "Anonymous",
    email: (user?.email as string | null) ?? null,
    image_url: (user?.image as string | null) ?? null,
    franchise_code: (franchise?.code as string | null) ?? null,
    franchise_name: (franchise?.name as string | null) ?? null,
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
  const franchiseById = await lookupV2FranchisesByIds(
    rows.map((row) => row.franchise_id as string | null)
  )
  return rows.map((row) => formatRow(row as Record<string, unknown>, franchiseById))
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

  const franchiseById = await lookupV2FranchisesByIds([data.franchise_id as string | null])
  return formatRow(data as Record<string, unknown>, franchiseById)
}

async function resolveTestimonialAuthor(params: TestimonialWriteInput): Promise<string> {
  const name = params.name.trim()
  if (!name) {
    throw new Error("Name is required")
  }

  if (params.user_id) {
    const updates: Record<string, string> = { name }
    if (params.image_url) updates.image = params.image_url
    if (params.email?.trim()) updates.email = params.email.trim().toLowerCase()

    const { error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", params.user_id)

    if (error) {
      throw new Error(toErrorMessage(error))
    }

    return params.user_id
  }

  const email = params.email?.trim().toLowerCase()
  if (email) {
    const existing = await getUserByEmail(email)
    if (existing) {
      const updates: Record<string, string> = { name }
      if (params.image_url) updates.image = params.image_url

      await supabaseAdmin.from("users").update(updates).eq("id", existing.id)
      return existing.id
    }
  }

  const userEmail = email || `testimonial-${crypto.randomUUID()}@testimonials.blaze.local`
  const password_hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10)
  const insertData: Record<string, unknown> = {
    name,
    email: userEmail,
    password_hash,
    email_verified: false,
    role: "user",
    is_test_user: true,
  }

  if (params.image_url) insertData.image = params.image_url
  if (params.created_by) insertData.created_by = params.created_by

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .insert(insertData)
    .select("id")
    .single()

  if (error) {
    throw new Error(`Failed to create testimonial author: ${toErrorMessage(error)}`)
  }

  return user.id as string
}

export async function createTestimonialAdmin(
  input: TestimonialWriteInput
): Promise<AdminTestimonial> {
  const comment = input.comment.trim()
  if (!comment) {
    throw new Error("Comment is required")
  }

  const user_id = await resolveTestimonialAuthor(input)

  const { data, error } = await supabaseAdmin
    .from("testimonials")
    .insert({
      user_id,
      franchise_id: input.franchise_id || null,
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
  input: TestimonialWriteInput
): Promise<AdminTestimonial> {
  const existing = await getTestimonialAdmin(id)
  if (!existing) {
    throw new Error("Testimonial not found")
  }

  const comment = input.comment.trim()
  if (!comment) {
    throw new Error("Comment is required")
  }

  const user_id = await resolveTestimonialAuthor({
    ...input,
    user_id: existing.user_id,
  })
  await assertV2FranchiseId(input.franchise_id)

  const { error } = await supabaseAdmin
    .from("testimonials")
    .update({
      user_id,
      franchise_id: input.franchise_id || null,
      comment,
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
