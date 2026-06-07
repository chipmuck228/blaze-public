#!/usr/bin/env node

/**
 * Extract Unified Instance Import CSV from Blaze raw data spreadsheet.
 *
 * Spec: scripts/design/unified-instance-import.md §11
 *
 * Usage:
 *   node scripts/extract-instances-from-raw.js [--file <path.xlsx>] [--out <path.csv>]
 *
 * Default input:  ../Blaze/Blaze-Data-Raw-0529.xlsx
 * Default output:  ../Blaze/Blaze-Instances-Unified.csv
 */

const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const DEFAULT_RAW =
  "/Users/zhen/Library/CloudStorage/OneDrive-个人/Blaze/Blaze-Data-Raw-0529.xlsx"
const DEFAULT_OUT =
  "/Users/zhen/Library/CloudStorage/OneDrive-个人/Blaze/Blaze-Instances-Unified.csv"

const UNIFIED_HEADERS = [
  "id",
  "Location Code",
  "Programs (category)",
  "Activity (program)",
  "Session Title",
  "Location Name",
  "Start Date",
  "End Date",
  "Start Time",
  "End Time",
  "Min Age",
  "Max Age",
  "Max Campers",
  "Price Override",
  "Meal Provided",
  "Camp Shirt Provided",
  "After Care Available",
  "Classes start on which days each week",
  "Target Grade",
  "Status",
  "Is Active",
  "Featured",
  "Amilia Link",
  "Notes",
]

const LOCATION_TO_CODE = {
  bellevue: "bellevue",
  "bellevue bel red": "bellevue",
  "chess4life bellevue": "bellevue",
  issaquah: "issaquah",
  "chess4life issaquah": "issaquah",
  sammamish: "sammamish",
  bothell: "bothell",
  "mill creek": "mill_creek",
}

const ACTIVITY_BY_TYPE = {
  camp: "2026 Summer Camps",
  course: "2026 Summer Courses",
}

const SUPPORTED_OFFERING_TYPES = new Set(["camp", "course"])

function parseArgs(argv) {
  const args = { file: DEFAULT_RAW, out: DEFAULT_OUT }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--file" && argv[i + 1]) args.file = argv[++i]
    else if (argv[i] === "--out" && argv[i + 1]) args.out = argv[++i]
  }
  return args
}

function parseXlsx(filePath) {
  const py = `
import json, sys, zipfile, xml.etree.ElementTree as ET
path = sys.argv[1]
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
def col_idx(ref):
    col = "".join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n - 1
z = zipfile.ZipFile(path)
ss = []
if "xl/sharedStrings.xml" in z.namelist():
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in root.findall(".//m:si", ns):
        ss.append("".join((t.text or "") for t in si.findall(".//m:t", ns)))
# first sheet
wb = ET.fromstring(z.read("xl/workbook.xml"))
rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
rid_map = {r.get("Id"): r.get("Target") for r in rels}
sheet_rid = wb.find(".//m:sheet", ns).get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
target = rid_map[sheet_rid]
if not target.startswith("xl/"): target = "xl/" + target.lstrip("/")
sheet = ET.fromstring(z.read(target))
rows = []
for row in sheet.findall(".//m:sheetData/m:row", ns):
    cells = {}
    for c in row.findall("m:c", ns):
        ref = c.get("r", "")
        t = c.get("t")
        v = c.find("m:v", ns)
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
    maxBuffer: 20 * 1024 * 1024,
  })
  return JSON.parse(out)
}

function normalizeKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function mapLocationCode(rawLocation) {
  const key = normalizeKey(rawLocation)
  return LOCATION_TO_CODE[key] || null
}

function parseExcelDate(val) {
  const v = String(val ?? "").trim()
  if (!v) return null
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
  return null
}

function parseAmPmClock(token) {
  const m = String(token).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ap = m[3].toUpperCase()
  if (ap === "PM" && h !== 12) h += 12
  if (ap === "AM" && h === 12) h = 0
  return `${String(h).padStart(2, "0")}:${min}`
}

function parseRawTime(timeStr) {
  const raw = String(timeStr || "").trim()
  if (!raw) throw new Error("Time is empty")

  const rangeMatch = raw.match(
    /(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i
  )
  if (!rangeMatch) throw new Error(`Cannot parse time range: ${raw}`)

  const startTime = parseAmPmClock(rangeMatch[1])
  const endTime = parseAmPmClock(rangeMatch[2])
  if (!startTime || !endTime) throw new Error(`Cannot parse clock times: ${raw}`)

  const lower = raw.toLowerCase()
  let daysOfWeek = ""
  if (lower.includes("every day")) {
    daysOfWeek = "0,1,2,3,4,5,6"
  } else if (lower.includes("monday") && lower.includes("wednesday")) {
    daysOfWeek = "1,3"
  } else if (lower.includes("tuesday") && lower.includes("thursday")) {
    daysOfWeek = "2,4"
  } else if (lower.includes("weekday")) {
    daysOfWeek = "1,2,3,4,5"
  }

  return { startTime, endTime, daysOfWeek }
}

function inferAgeRangeFromTitle(title) {
  const t = String(title || "")
  const gradesMatch = t.match(/rising grades?\s+([^)]+)/i)
  if (gradesMatch) {
    const nums = gradesMatch[1].match(/\d+/g)?.map(Number)
    if (nums?.length) {
      const minG = Math.min(...nums)
      const maxG = Math.max(...nums)
      return { minAge: minG + 5, maxAge: maxG + 6 }
    }
  }
  const agesMatch = t.match(/ages?\s+([^)]+)/i)
  if (agesMatch) {
    const nums = agesMatch[1].match(/\d+/g)?.map(Number)
    if (nums?.length) {
      return { minAge: Math.min(...nums), maxAge: Math.max(...nums) }
    }
  }
  return { minAge: "", maxAge: "" }
}

function inferTargetGradeFromTitle(title) {
  const m = String(title || "").match(/rising grades?\s+([^)]+)/i)
  if (!m) return ""
  return m[1]
    .replace(/\s+/g, "")
    .replace(/–/g, "-")
    .trim()
}

function parseYesNoFeatured(val) {
  const v = String(val ?? "").trim().toLowerCase()
  if (v === "yes" || v === "true" || v === "1") return "Yes"
  return "No"
}

function escapeCsv(val) {
  const s = String(val ?? "")
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function rowsToObjects(tableRows) {
  if (!tableRows.length) return []
  const headers = tableRows[0].map((h) => String(h || "").trim())
  return tableRows.slice(1).map((row, idx) => {
    const obj = { _rowNum: idx + 2 }
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]).trim() : ""
    })
    return obj
  })
}

function transformRow(row) {
  const title = row.Title
  if (!title) return { skip: true, code: "EMPTY_ROW", row: row._rowNum }

  const offeringType = String(row["Tag: Camp/Course/Workshop/Competition"] || "")
    .trim()
    .toLowerCase()
  if (!SUPPORTED_OFFERING_TYPES.has(offeringType)) {
    return {
      skip: true,
      code: "SKIPPED_UNSUPPORTED_TYPE",
      row: row._rowNum,
      detail: row["Tag: Camp/Course/Workshop/Competition"] || "(empty)",
    }
  }

  const locationCode = mapLocationCode(row.Location)
  if (!locationCode) {
    return {
      skip: true,
      code: "UNKNOWN_RAW_LOCATION",
      row: row._rowNum,
      detail: row.Location,
    }
  }

  const category = String(row["Tag: Explore/Learn/Compete"] || "").trim()
  if (!category) {
    return { skip: true, code: "MISSING_CATEGORY", row: row._rowNum }
  }

  const startDate = parseExcelDate(row["Start Date"])
  const endDate = parseExcelDate(row["End Date"])
  if (!startDate || !endDate) {
    return {
      skip: true,
      code: "PARSE_DATE",
      row: row._rowNum,
      detail: `Start=${row["Start Date"]} End=${row["End Date"]}`,
    }
  }

  let startTime = ""
  let endTime = ""
  let daysOfWeek = ""
  try {
    const parsed = parseRawTime(row.Time)
    startTime = parsed.startTime
    endTime = parsed.endTime
    daysOfWeek = parsed.daysOfWeek
  } catch (err) {
    return { skip: true, code: "PARSE_TIME", row: row._rowNum, detail: err.message }
  }

  const { minAge, maxAge } = inferAgeRangeFromTitle(title)
  const isCamp = offeringType === "camp"

  const out = {
    "Location Code": locationCode,
    "Programs (category)": category,
    "Activity (program)": ACTIVITY_BY_TYPE[offeringType],
    "Session Title": title,
    "Location Name": String(row.Location || "").trim(),
    "Start Date": startDate,
    "End Date": endDate,
    "Start Time": startTime,
    "End Time": endTime,
    "Min Age": minAge !== "" ? String(minAge) : "",
    "Max Age": maxAge !== "" ? String(maxAge) : "",
    "Max Campers": "",
    "Price Override": String(row.Price ?? "").trim(),
    "Meal Provided": isCamp ? "Yes" : "",
    "Camp Shirt Provided": isCamp ? "Yes" : "",
    "After Care Available": isCamp ? "No" : "",
    "Classes start on which days each week": isCamp ? "" : daysOfWeek,
    "Target Grade": isCamp ? "" : inferTargetGradeFromTitle(title),
    Status: "scheduled",
    "Is Active": "Yes",
    Featured: parseYesNoFeatured(row.IsFeatured),
    "Amilia Link": row["Amilia Link"] || "",
    Notes: `source_row=${row._rowNum}`,
  }

  if (!isCamp && !out["Classes start on which days each week"]) {
    return {
      skip: true,
      code: "MISSING_COURSE_DAYS",
      row: row._rowNum,
      detail: row.Time,
    }
  }

  return { skip: false, row: row._rowNum, data: out }
}

function main() {
  const args = parseArgs(process.argv)

  if (!fs.existsSync(args.file)) {
    console.error(`File not found: ${args.file}`)
    process.exit(1)
  }

  const startedAt = new Date().toISOString()
  console.log("Extract instances from raw → Unified Instance CSV")
  console.log("=".repeat(60))
  console.log(`Input:  ${args.file}`)
  console.log(`Output: ${args.out}`)
  console.log("")

  const tableRows = parseXlsx(args.file)
  const rawRows = rowsToObjects(tableRows).filter((r) => r.Title || r.Location)

  const report = {
    meta: {
      started_at: startedAt,
      source_file: args.file,
      output_file: args.out,
      source_rows_total: tableRows.length - 1,
      source_rows_with_data: rawRows.length,
    },
    summary: { written: 0, skipped: 0 },
    skipped_by_code: {},
    skipped: [],
    written_rows: [],
  }

  const unifiedRows = []

  for (const row of rawRows) {
    const result = transformRow(row)
    if (result.skip) {
      report.summary.skipped++
      report.skipped_by_code[result.code] = (report.skipped_by_code[result.code] || 0) + 1
      report.skipped.push({
        row: result.row,
        code: result.code,
        detail: result.detail || null,
      })
      console.error(`[${result.row}] SKIP ${result.code}${result.detail ? `: ${result.detail}` : ""}`)
      continue
    }

    unifiedRows.push(result.data)
    report.summary.written++
    report.written_rows.push({ row: result.row, sessionTitle: result.data["Session Title"] })
    console.log(
      `[${result.row}] OK ${result.data["Location Code"]}/${result.data["Programs (category)"]} ` +
        `${result.data["Session Title"].slice(0, 50)}… (${result.data["Start Date"]})`
    )
  }

  const csvLines = [UNIFIED_HEADERS.map(escapeCsv).join(",")]
  for (const data of unifiedRows) {
    csvLines.push(UNIFIED_HEADERS.map((h) => escapeCsv(data[h])).join(","))
  }

  const outDir = path.dirname(args.out)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(args.out, csvLines.join("\n") + "\n", "utf8")

  report.meta.finished_at = new Date().toISOString()
  report.meta.rows_written = unifiedRows.length

  const logDir = path.join(__dirname, "output")
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const logPath = path.join(logDir, `extract-instances-from-raw-${stamp}.json`)
  fs.writeFileSync(logPath, JSON.stringify(report, null, 2))

  console.log("")
  console.log("Summary:", report.summary)
  console.log("Skipped by code:", report.skipped_by_code)
  console.log(`CSV: ${args.out}`)
  console.log(`Log: ${logPath}`)

  if (report.summary.written === 0) process.exit(1)
}

main()
