/** Supabase nested selects may return a single object or an array. */
export function unwrapRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (value == null) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}
