/**
 * Helpers for instance_schema and instance_data_ext when schema uses object groups.
 * Use for display (instance detail, list, admin view) so nested ext is read correctly.
 */

export type SchemaFieldConfig = {
  type?: string
  label?: string
  display_scope?: string
  properties?: Record<string, SchemaFieldConfig>
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
): Generator<{ key: string; label: string; value: unknown; groupLabel?: string; type?: string; options?: string[] }> {
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
          yield { key: propKey, label: propConfig?.label || propKey, value, groupLabel, type: propConfig?.type, options: (propConfig as any)?.options }
        }
      }
    } else {
      const value = flatExt[fieldName]
      yield { key: fieldName, label: fieldConfig.label || fieldName, value, type: fieldConfig.type, options: (fieldConfig as any)?.options }
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
