/**
 * Shared schema-driven CSV column helpers for offering/instance import-export.
 */

const { execFileSync } = require("child_process")
const crypto = require("crypto")

function decodeHtmlEntities(text) {
  if (!text) return text
  return String(text)
    .replace(/&mdash;/g, "\u2014")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim()
}

function parseYesNo(val, defaultVal) {
  const v = String(val ?? "")
    .trim()
    .toLowerCase()
  if (!v) return defaultVal
  if (v === "yes" || v === "true" || v === "1") return true
  if (v === "no" || v === "false" || v === "0") return false
  throw new Error(`Invalid Yes/No: ${val}`)
}

function parseDateCell(val, label) {
  const v = String(val ?? "").trim()
  if (!v) throw new Error(`${label} is required`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const serial = Number(v)
  if (!Number.isNaN(serial) && serial > 20000 && serial < 80000) {
    const epoch = Date.UTC(1899, 11, 30)
    const d = new Date(epoch + serial * 86400000)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const [, month, day, year] = mdy
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date for ${label}: ${val}`)
  return d.toISOString().slice(0, 10)
}

function parseOptionalTimeCell(val) {
  const v = String(val ?? "").trim()
  if (!v) return null
  if (/^\d{1,2}:\d{2}$/.test(v)) return `${v}:00`
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(v)) return v
  const serial = Number(v)
  if (!Number.isNaN(serial) && serial >= 0 && serial < 1) {
    const totalMinutes = Math.round(serial * 24 * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
  }
  return v
}

function computeSchemaHash(schema) {
  return crypto.createHash("sha256").update(JSON.stringify(schema || {})).digest("hex").slice(0, 16)
}

/** Expand schema.fields into flat CSV column descriptors. */
function buildSchemaColumns(schema) {
  const columns = []
  const fields = schema?.fields || {}
  if (typeof fields !== "object") return columns

  for (const [groupName, fieldConfig] of Object.entries(fields)) {
    if (!fieldConfig || typeof fieldConfig !== "object") continue
    if (fieldConfig.type === "object" && fieldConfig.properties) {
      for (const [propKey, propConfig] of Object.entries(fieldConfig.properties)) {
        columns.push({
          header: `${groupName}|${propKey}`,
          path: `${groupName}.${propKey}`,
          group: groupName,
          field: propKey,
          type: propConfig?.type || "text",
          required: !!propConfig?.required,
          label: propConfig?.label || propKey,
          isComplex: false,
          options: propConfig?.options,
        })
      }
    } else {
      columns.push({
        header: groupName,
        path: groupName,
        group: groupName,
        field: groupName,
        type: fieldConfig.type || "text",
        required: !!fieldConfig.required,
        label: fieldConfig.label || groupName,
        isComplex: fieldConfig.type === "array" || fieldConfig.type === "object",
        options: fieldConfig.options,
      })
    }
  }
  return columns
}

function getNestedValue(obj, pathStr) {
  const parts = pathStr.split(".")
  let cur = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = cur[p]
  }
  return cur
}

function setNestedValue(obj, pathStr, value) {
  const parts = pathStr.split(".")
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = value
}

function serializeCellValue(value, column) {
  if (value === undefined || value === null) return ""
  if (column.type === "boolean") return value ? "Yes" : "No"
  if (column.type === "multiselect" && Array.isArray(value)) {
    return value.map(String).join("|")
  }
  if (column.isComplex || column.type === "array" || column.type === "object") {
    return typeof value === "string" ? value : JSON.stringify(value)
  }
  return String(value)
}

function parseCellValue(raw, column) {
  const s = String(raw ?? "").trim()
  if (!s) return column.type === "boolean" ? false : null
  if (column.type === "boolean") return parseYesNo(s, false)
  if (column.type === "number") {
    const n = Number(s)
    if (Number.isNaN(n)) throw new Error(`${column.header} must be a number`)
    return n
  }
  if (column.type === "multiselect") {
    const parts = s.split("|").map((v) => v.trim()).filter(Boolean)
    if (column.path.includes("days_of_week")) {
      return parts.map((p) => Number(p)).filter((n) => !Number.isNaN(n))
    }
    return parts
  }
  if (column.type === "date") {
    return parseDateCell(s, column.header)
  }
  if (column.type === "time") {
    return parseOptionalTimeCell(s)
  }
  if (column.type === "select" && column.options?.length) {
    const match = column.options.find((o) => String(o).toLowerCase() === s.toLowerCase())
    if (!match) {
      throw new Error(`${column.header} must be one of: ${column.options.join(", ")}`)
    }
    return String(match)
  }
  if (column.isComplex || column.type === "array" || column.type === "object") {
    try {
      return JSON.parse(s)
    } catch {
      throw new Error(`${column.header} must be valid JSON`)
    }
  }
  return decodeHtmlEntities(s)
}

function flattenToRow(data, schemaColumns) {
  const row = {}
  for (const col of schemaColumns) {
    const val = getNestedValue(data || {}, col.path)
    row[col.header] = serializeCellValue(val, col)
  }
  return row
}

function buildFromRow(row, schemaColumns) {
  const config = {}
  for (const col of schemaColumns) {
    const raw = row[col.header]
    if (raw === undefined || raw === "") continue
    const val = parseCellValue(raw, col)
    if (val !== null && val !== undefined && val !== "") {
      setNestedValue(config, col.path, val)
    }
  }
  return config
}

function normalizeConfigForCompare(obj) {
  if (obj === null || obj === undefined) return null
  if (typeof obj !== "object") return obj
  if (Array.isArray(obj)) {
    return obj.map((v) => normalizeConfigForCompare(v))
  }
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (typeof v === "object" && !Array.isArray(v)) {
      const nested = normalizeConfigForCompare(v)
      if (nested && Object.keys(nested).length > 0) out[k] = nested
    } else if (Array.isArray(v)) {
      out[k] = normalizeConfigForCompare(v)
    } else {
      out[k] = v
    }
  }
  return out
}

function stableStringify(value) {
  if (value === null || value === undefined) return "null"
  if (typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`
  }
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`
}

/** Parse .xlsx sheet1 to row arrays (handles OOXML and SpreadsheetML namespaces). */
function parseXlsxSpreadsheet(filePath) {
  const py = `
import json, sys, zipfile, xml.etree.ElementTree as ET
path = sys.argv[1]
def ns_from(elem):
    if elem.tag.startswith("{"):
        return elem.tag.split("}")[0][1:]
    return "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
def col_idx(ref):
    col = "".join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n - 1
z = zipfile.ZipFile(path)
ss = []
ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
ns = ns_from(ss_root)
for si in ss_root.findall(f".//{{{ns}}}si"):
    ss.append("".join((t.text or "") for t in si.findall(f".//{{{ns}}}t")))
sheet_root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
ns = ns_from(sheet_root)
rows = []
for row in sheet_root.findall(f".//{{{ns}}}sheetData/{{{ns}}}row"):
    cells = {}
    for c in row.findall(f"{{{ns}}}c"):
        ref = c.get("r", "")
        t = c.get("t")
        v = c.find(f"{{{ns}}}v")
        val = v.text if v is not None else ""
        if t == "s" and val.isdigit():
            val = ss[int(val)]
        cells[col_idx(ref)] = val
    if not cells:
        continue
    max_i = max(cells)
    rows.append([cells.get(i, "") for i in range(max_i + 1)])
print(json.dumps(rows))
`
  const out = execFileSync("python3", ["-c", py, filePath], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  })
  return JSON.parse(out)
}

module.exports = {
  decodeHtmlEntities,
  parseYesNo,
  parseDateCell,
  parseOptionalTimeCell,
  computeSchemaHash,
  buildSchemaColumns,
  getNestedValue,
  setNestedValue,
  serializeCellValue,
  parseCellValue,
  flattenToRow,
  buildFromRow,
  normalizeConfigForCompare,
  stableStringify,
  parseXlsxSpreadsheet,
}
