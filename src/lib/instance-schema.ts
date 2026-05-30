/**
 * Helpers for instance_schema and instance_data_ext when schema uses object groups.
 * Use for display (instance detail, list, admin view) so nested ext is read correctly.
 */

export type SchemaFieldConfig = {
  type?: string
  label?: string
  display_scope?: string
  multiline?: boolean
  properties?: Record<string, SchemaFieldConfig>
  /** For type=array: item shape when items.type=object */
  items?: { type?: string; properties?: Record<string, SchemaFieldConfig>; [k: string]: unknown }
}

/** Flatten nested instance_data_ext to a single-level record for display (e.g. schedule.start_date -> start_date, age_range.age_min -> age_min). */
export function flattenInstanceDataExtForDisplay(
  schemaFields: Record<string, SchemaFieldConfig> | null | undefined,
  ext: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!ext || typeof ext !== "object") return {}
  if (!schemaFields || typeof schemaFields !== "object") return { ...ext }
  const flat: Record<string, unknown> = {}
  for (const [fieldName, fieldConfig] of Object.entries(schemaFields)) {
    if (fieldConfig?.type === "object" && fieldConfig.properties && typeof ext[fieldName] === "object" && ext[fieldName] !== null && !Array.isArray(ext[fieldName])) {
      const obj = ext[fieldName] as Record<string, unknown>
      for (const [propKey, propConfig] of Object.entries(fieldConfig.properties)) {
        if (obj[propKey] !== undefined) flat[propKey] = obj[propKey]
      }
    } else {
      if (ext[fieldName] !== undefined) flat[fieldName] = ext[fieldName]
    }
  }
  return flat
}

/** Field config shape used when formatting a value for display (subset of SchemaFieldConfig + option_labels). */
export type SchemaFieldDisplayConfig = SchemaFieldConfig & {
  options?: unknown[]
  option_labels?: string[]
}

import { formatCalendarDate } from "@/lib/format-calendar-date"

/** Default weekday labels (0=周日 … 6=周六) for formatSchemaValueForDisplay. */
const DEFAULT_WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

/**
 * Format a single object item for display (array of objects). Uses option_labels, weekday mapping, and frequency fallback.
 */
function formatObjectItemForDisplay(
  item: Record<string, unknown>,
  itemSchema: Record<string, SchemaFieldDisplayConfig>,
  weekdayNames: string[] = DEFAULT_WEEKDAY_NAMES
): string {
  const parts: string[] = []
  const freqLabels: Record<string, string> = { weekly: "每周一次", biweekly: "每两周一次" }
  for (const [propKey, propConfig] of Object.entries(itemSchema)) {
    const val = item[propKey]
    if (val === undefined || val === null) continue
    if (propConfig?.option_labels && Array.isArray(propConfig.options)) {
      const idx = propConfig.options.findIndex((o) => String(o) === String(val) || Number(o) === Number(val))
      parts.push(idx >= 0 ? (propConfig.option_labels[idx] ?? String(val)) : String(val))
    } else if (propKey === "weekday" && (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val)))) {
      const n = typeof val === "number" ? val : parseInt(String(val), 10)
      if (n >= 0 && n <= 6) parts.push(weekdayNames[n])
      else parts.push(String(val))
    } else if (propKey === "frequency" && typeof val === "string") {
      parts.push(freqLabels[val] ?? val)
    } else {
      parts.push(String(val))
    }
  }
  return parts.join("")
}

/**
 * Format any schema field value for display (string). Handles all schema types so the detail page
 * can render arbitrary offering_schema / instance_schema fields without key-specific logic.
 * Returns "—" for null/undefined/empty; otherwise a human-readable string.
 */
export function formatSchemaValueForDisplay(
  value: unknown,
  fieldConfig: SchemaFieldDisplayConfig | null | undefined,
  options?: { weekdayNames?: string[] }
): string {
  const empty = "—"
  if (value === undefined || value === null) return empty
  const cfg = fieldConfig ?? {}
  const type = cfg.type ?? (typeof value === "number" ? "number" : Array.isArray(value) ? "array" : "text")
  const weekdayNames = options?.weekdayNames ?? DEFAULT_WEEKDAY_NAMES

  switch (type) {
    case "boolean":
      return typeof value === "boolean" ? (value ? "是" : "否") : String(value)
    case "number":
      return typeof value === "number" ? String(value) : String(value)
    case "date": {
      const s = String(value).trim()
      if (!s) return empty
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return formatCalendarDate(s)
      return s
    }
    case "time":
    case "text":
      return String(value).trim() || empty
    case "select": {
      const opts = cfg.options ?? []
      const labels = cfg.option_labels ?? opts.map(String)
      const idx = opts.findIndex((o) => String(o) === String(value) || Number(o) === Number(value))
      return idx >= 0 ? (labels[idx] ?? String(value)) : String(value)
    }
    case "multiselect": {
      const arr = Array.isArray(value) ? value : [value]
      const opts = cfg.options ?? []
      const labels = cfg.option_labels ?? opts.map(String)
      const parts = arr.map((v) => {
        const i = opts.findIndex((o) => String(o) === String(v) || Number(o) === Number(v))
        return i >= 0 ? (labels[i] ?? String(v)) : String(v)
      })
      return parts.length ? parts.join("、") : empty
    }
    case "array": {
      const arr = Array.isArray(value) ? value : []
      const items = (cfg as SchemaFieldConfig).items
      if (items?.type === "object" && items?.properties) {
        const itemSchema = items.properties as Record<string, SchemaFieldDisplayConfig>
        const formatted = (arr as Record<string, unknown>[])
          .filter((item) => item != null && typeof item === "object")
          .map((item) => formatObjectItemForDisplay(item as Record<string, unknown>, itemSchema, weekdayNames))
          .filter(Boolean)
        return formatted.length ? formatted.join("、") : empty
      }
      if (items?.type === "string" || !items) {
        return arr.map((x) => (x != null && typeof x === "object" ? JSON.stringify(x) : String(x))).join("、") || empty
      }
      return arr.map(String).join("、") || empty
    }
    case "object":
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return Object.entries(value as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${v == null ? empty : String(v)}`)
          .join("；") || empty
      }
      return empty
    default:
      if (Array.isArray(value)) return (value as unknown[]).map(String).join("、") || empty
      if (typeof value === "object") return JSON.stringify(value)
      return String(value)
  }
}

/** Get display value for a key: from flat ext (e.g. age_min from flatExt, or start_date). Prefer row columns when provided. */
export function getInstanceDisplayValue(
  key: string,
  flatExt: Record<string, unknown>,
  row?: { start_date?: unknown; end_date?: unknown; start_time?: unknown; end_time?: unknown; max_students?: unknown; price_override?: unknown }
): unknown {
  const rowKey = key as keyof NonNullable<typeof row>
  if (row && (rowKey === "start_date" || rowKey === "end_date" || rowKey === "start_time" || rowKey === "end_time" || rowKey === "max_students" || rowKey === "price_override")) {
    const v = row[rowKey]
    if (v !== undefined && v !== null && v !== "") return v
  }
  return flatExt[key]
}

/** Iterate schema fields for display: yields { key, label, value, groupLabel?, type? } for each displayable field. */
export function* iterateInstanceSchemaFieldsForDisplay(
  schemaFields: Record<string, SchemaFieldConfig> | null | undefined,
  ext: Record<string, unknown> | null | undefined,
  options?: { displayScope?: "admin" | "web" | "both"; flatten?: boolean }
): Generator<{ key: string; label: string; value: unknown; groupLabel?: string; type?: string; options?: unknown[]; option_labels?: string[]; multiline?: boolean; items?: SchemaFieldConfig["items"] }> {
  if (!schemaFields || !ext) return
  const scope = options?.displayScope ?? "both"
  const flatExt = options?.flatten !== false ? flattenInstanceDataExtForDisplay(schemaFields, ext) : ext
  for (const [fieldName, fieldConfig] of Object.entries(schemaFields)) {
    if (!fieldConfig) continue
    const fieldScope = fieldConfig.display_scope ?? "admin"
    if (scope !== "both" && fieldScope !== scope && fieldScope !== "both") continue
    if (fieldConfig.type === "object" && fieldConfig.properties) {
      const obj = ext[fieldName] as Record<string, unknown> | undefined
      const groupLabel = fieldConfig.label || fieldName
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const [propKey, propConfig] of Object.entries(fieldConfig.properties)) {
          const propScope = propConfig?.display_scope ?? "admin"
          if (scope !== "both" && propScope !== scope && propScope !== "both") continue
          const value = obj[propKey]
          const c = propConfig as any
          yield { key: propKey, label: propConfig?.label || propKey, value, groupLabel, type: c?.type, options: c?.options, option_labels: c?.option_labels, multiline: c?.multiline, items: c?.items }
        }
      }
    } else {
      const value = flatExt[fieldName]
      const c = fieldConfig as any
      yield { key: fieldName, label: fieldConfig.label || fieldName, value, type: c?.type, options: c?.options, option_labels: c?.option_labels, multiline: c?.multiline, items: c?.items }
    }
  }
}

/** Include when display_scope is "web" or "both" (for C-end). Supports nested: object fields are included with their properties filtered. */
function allowedForWeb(scope: string): boolean {
  return scope === "web" || scope === "both"
}

/** Filter instance_data_ext by schema display_scope (web or both). Supports nested: object fields are included with their properties filtered by display_scope. */
export function filterInstanceDataExtByDisplayScope(
  schema: { fields?: Record<string, SchemaFieldConfig> } | null,
  data: Record<string, unknown> | null
): Record<string, unknown> {
  if (!data || typeof data !== "object") return {}
  if (!schema?.fields || typeof schema.fields !== "object") return { ...data }
  const out: Record<string, unknown> = {}
  for (const [key, config] of Object.entries(schema.fields)) {
    const fieldScope = config?.display_scope ?? "admin"
    if (!allowedForWeb(fieldScope)) continue
    if (config?.type === "object" && config.properties) {
      const obj = data[key]
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        const filteredObj: Record<string, unknown> = {}
        for (const [propKey, propConfig] of Object.entries(config.properties)) {
          const propScope = propConfig?.display_scope ?? "admin"
          if (allowedForWeb(propScope) && (obj as Record<string, unknown>)[propKey] !== undefined) {
            filteredObj[propKey] = (obj as Record<string, unknown>)[propKey]
          }
        }
        if (Object.keys(filteredObj).length > 0) out[key] = filteredObj
      }
    } else {
      if (data[key] !== undefined) out[key] = data[key]
    }
  }
  return out
}
