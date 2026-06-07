#!/usr/bin/env node
/**
 * Generate one test instance row per offering from exported offerings CSV.
 * Usage: node scripts/generate-test-instance-inserts.js [--type camp|course|all]
 */

const fs = require("fs")
const path = require("path")
const { parseCsv, escapeCsv } = require("./lib/import-offerings-common")

const OUTPUT = path.join(__dirname, "output")

const CAMP_HEADERS = [
  "id",
  "Location Code",
  "Programs (category)",
  "Activity (program)",
  "Session Title",
  "Location Name",
  "Status",
  "Is Active",
  "Featured",
  "Amilia Link",
  "Notes",
  "schedule|end_date",
  "schedule|start_date",
  "age_range|age_max",
  "age_range|age_min",
  "additional|special_needs",
  "camp_services|meal_provided",
  "camp_services|camp_shirt_provided",
  "camp_services|after_care_available",
  "capacity_price|max_students",
]

const COURSE_HEADERS = [
  "id",
  "Location Code",
  "Programs (category)",
  "Activity (program)",
  "Session Title",
  "Location Name",
  "Status",
  "Is Active",
  "Featured",
  "Amilia Link",
  "Notes",
  "audience|target_grades",
  "schedule|end_date",
  "schedule|end_time",
  "schedule|start_date",
  "schedule|start_time",
  "schedule|days_of_week",
  "age_range|age_max",
  "age_range|age_min",
  "class_info|instructor_name",
  "class_info|classroom_number",
  "class_info|special_equipment",
  "capacity_price|max_students",
  "capacity_price|price_override",
]

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T12:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function offeringsToRows(typeCode, offeringsPath, baseStart = "2026-09-01") {
  const table = parseCsv(offeringsPath)
  const headers = table[0]
  const titleIdx = headers.indexOf("Title")
  const tagIdx = headers.indexOf("Program (tag)")
  const rows = []
  let dayOffset = 0
  for (let i = 1; i < table.length; i++) {
    const row = table[i]
    const title = row[titleIdx]
    const category = row[tagIdx]
    if (!title) continue
    const start = addDays(baseStart, dayOffset)
    const end = addDays(start, 4)
    dayOffset += 7

    if (typeCode === "camp") {
      rows.push({
        id: "",
        "Location Code": "bellevue",
        "Programs (category)": category,
        "Activity (program)": "2026 Summer Camps",
        "Session Title": title,
        "Location Name": "Bellevue, WA",
        Status: "scheduled",
        "Is Active": "Yes",
        Featured: "No",
        "Amilia Link": "",
        Notes: `CSV import test instance (${typeCode})`,
        "schedule|end_date": end,
        "schedule|start_date": start,
        "age_range|age_max": "12",
        "age_range|age_min": "8",
        "additional|special_needs": "",
        "camp_services|meal_provided": "No",
        "camp_services|camp_shirt_provided": "No",
        "camp_services|after_care_available": "No",
        "capacity_price|max_students": "12",
      })
    } else {
      rows.push({
        id: "",
        "Location Code": "bellevue",
        "Programs (category)": category,
        "Activity (program)": "2026 Summer Courses",
        "Session Title": title,
        "Location Name": "Bellevue, WA",
        Status: "scheduled",
        "Is Active": "Yes",
        Featured: "No",
        "Amilia Link": "",
        Notes: `CSV import test instance (${typeCode})`,
        "audience|target_grades": "3|4|5",
        "schedule|end_date": end,
        "schedule|end_time": "19:30:00",
        "schedule|start_date": start,
        "schedule|start_time": "16:30:00",
        "schedule|days_of_week": "1|3",
        "age_range|age_max": "13",
        "age_range|age_min": "8",
        "class_info|instructor_name": "",
        "class_info|classroom_number": "",
        "class_info|special_equipment": "",
        "capacity_price|max_students": "15",
        "capacity_price|price_override": "",
      })
    }
  }
  return rows
}

function writeTypeCsv(typeCode) {
  const offeringsPath = path.join(OUTPUT, `Blaze-Offerings-${typeCode}.csv`)
  if (!fs.existsSync(offeringsPath)) {
    throw new Error(`Missing ${offeringsPath} — run export-offerings.js --type ${typeCode} first`)
  }
  const headers = typeCode === "camp" ? CAMP_HEADERS : COURSE_HEADERS
  const rows = offeringsToRows(typeCode, offeringsPath)
  const outCsv = path.join(OUTPUT, `test-insert-instances-${typeCode}.csv`)
  const lines = [headers.map(escapeCsv).join(",")]
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsv(r[h] ?? "")).join(","))
  }
  fs.writeFileSync(outCsv, lines.join("\n") + "\n", "utf8")

  const srcManifest = path.join(
    __dirname,
    "templates",
    `instances-${typeCode}-template-schema.json`
  )
  const dstManifest = path.join(OUTPUT, `test-insert-instances-${typeCode}-schema.json`)
  if (fs.existsSync(srcManifest)) {
    fs.copyFileSync(srcManifest, dstManifest)
  }
  return { outCsv, count: rows.length }
}

function main() {
  let types = ["camp", "course"]
  const arg = process.argv.find((a, i) => process.argv[i - 1] === "--type")
  if (arg) types = [arg]

  for (const typeCode of types) {
    const { outCsv, count } = writeTypeCsv(typeCode)
    console.log(`${typeCode}: ${count} row(s) → ${outCsv}`)
  }
}

main()
