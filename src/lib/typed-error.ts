import type { JsonRecord, JsonValue } from "@/types/json"

/** Shape shared by Error, PostgrestError, and API validation payloads. */
export interface ErrorLike {
  message?: string
  code?: string
}

export interface ValidationErrorLike extends ErrorLike {
  missingFields?: string[]
}

export function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === "object" && value !== null
}

/**
 * Extract a human-readable message from unknown errors (catch blocks, API JSON, Supabase).
 * @param fallback Used when no message can be derived (e.g. admin toast default).
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim()
  }
  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as ErrorLike).message === "string") {
      const message = (error as ErrorLike).message
      if (message) return message
    }
    if ("error" in error) {
      const inner = (error as { error?: unknown }).error
      if (typeof inner === "string" && inner.trim()) {
        return inner.trim()
      }
    }
  }
  const text = String(error)
  if (text && text !== "[object Object]") {
    return text
  }
  return fallback ?? text
}

export function getErrorCode(error: unknown): string | undefined {
  if (isErrorLike(error) && typeof error.code === "string") {
    return error.code
  }
  return undefined
}

export function hasMissingFields(
  error: unknown
): error is ValidationErrorLike & { missingFields: string[] } {
  return (
    isErrorLike(error) &&
    Array.isArray((error as ValidationErrorLike).missingFields)
  )
}

/** Writable DB/API patch object (replaces bare `any` for insert/update bags). */
export type StringKeyRecord = Record<
  string,
  string | number | boolean | null | undefined | JsonValue
>

export type ErrorResponseDetails = JsonRecord | JsonValue | undefined
