/**
 * US phone number validation and formatting.
 * Accepts: 10 digits, or 1 + 10 digits (e.g. 4255550123, 14255550123).
 * Optional formatting characters (spaces, dashes, parens) are stripped for validation.
 */

const US_PHONE_DIGITS_ONLY = /^\d{10}$|^1\d{10}$/

export function normalizeUSPhone(input: string): string {
  const digits = input.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  return digits
}

export function isValidUSPhone(value: string): boolean {
  if (!value || typeof value !== "string") return true // empty is valid (optional field)
  const digits = value.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1).length === 10
  return digits.length === 10 && /^\d{10}$/.test(digits)
}

/** Format 10 digits as (XXX) XXX-XXXX */
export function formatUSPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10)
  if (d.length < 10) return digits
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/** Normalize for storage: store as (XXX) XXX-XXXX if 10 digits, otherwise store as provided (after validation) */
export function formatUSPhoneForStorage(value: string): string {
  if (!value || typeof value !== "string") return ""
  const digits = normalizeUSPhone(value)
  if (digits.length === 10 && /^\d{10}$/.test(digits)) return formatUSPhoneDisplay(digits)
  if (digits.length === 11 && digits.startsWith("1")) return formatUSPhoneDisplay(digits.slice(1))
  return value.trim()
}
