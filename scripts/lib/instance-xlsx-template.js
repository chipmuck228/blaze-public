/**
 * Generate schema-driven instance xlsx templates with lookup dropdowns and column protection.
 */

const ExcelJS = require("exceljs")
const { isCatalogV3 } = require("./catalog-db")
const {
  instanceToCsvRow,
  OPERATOR_FIXED_HEADERS,
  exportOperatorHeaders,
} = require("./import-instances-common")

const STATUS_VALUES = ["scheduled", "ongoing", "completed", "cancelled"]
const YES_NO_VALUES = ["Yes", "No"]
const ALWAYS_READONLY_COLUMNS = new Set(["id"])
const COMMON_DROPDOWN_COLUMNS = {
  compus_code: "campus_codes",
  stage: "stage_names",
  series_id: "series_names",
  location_code: "location_names",
  status: "status_values",
  is_Active: "yes_no",
  Featured: "yes_no",
}

const CAMP_DROPDOWN_COLUMNS = {
  "camp_services|meal_provided": "yes_no",
  "camp_services|camp_shirt_provided": "yes_no",
  "camp_services|after_care_available": "yes_no",
}

const TEMPLATE_EMPTY_ROWS = 100
const EXTRA_VALIDATION_ROWS = 50

function unwrapJoin(val) {
  return Array.isArray(val) ? val[0] : val
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
  )
}

function fetchLookupLists(ctx) {
  const campusCodes = uniqueSorted([...ctx.franchiseByCode.values()].map((f) => f.code))

  const stageById = new Map()
  for (const stage of ctx.categoriesByKey.values()) {
    if (stage.is_active === false) continue
    stageById.set(stage.id, stage.name)
  }
  const stageNames = uniqueSorted([...stageById.values()])

  const seriesNames = new Set()
  for (const programs of ctx.programsByFranchise.values()) {
    for (const program of programs) {
      if (program.is_active === false) continue
      if (program.name) seriesNames.add(program.name)
    }
  }

  const locationNames = new Set()
  for (const locations of ctx.campusesByFranchise.values()) {
    for (const location of locations) {
      if (location.name) locationNames.add(location.name)
    }
  }

  return {
    campus_codes: campusCodes,
    stage_names: stageNames,
    series_names: uniqueSorted([...seriesNames]),
    location_names: uniqueSorted([...locationNames]),
    status_values: STATUS_VALUES,
    yes_no: YES_NO_VALUES,
  }
}

function getDropdownConfig(typeCode, schemaColumns) {
  const config = { ...COMMON_DROPDOWN_COLUMNS }

  if (typeCode === "camp") {
    Object.assign(config, CAMP_DROPDOWN_COLUMNS)
  }

  for (const col of schemaColumns) {
    if (col.type === "boolean" && !config[col.header]) {
      config[col.header] = "yes_no"
    }
  }

  return config
}

function instanceToOperatorRow(instance, schemaColumns) {
  const csvRow = instanceToCsvRow(instance, schemaColumns)
  const prog = unwrapJoin(instance.program)
  const category = unwrapJoin(prog?.category)
  const campus = isCatalogV3()
    ? instance.location_id
      ? unwrapJoin(instance.campus)
      : null
    : instance.campus_id
      ? unwrapJoin(instance.campus)
      : null

  const row = {
    id: csvRow.id || "",
    compus_code: csvRow["Location Code"] || "",
    stage: category?.name || "",
    series_id: prog?.name || "",
    offering_name: csvRow["Session Title"] || "",
    location_code: campus?.name || "",
    status: csvRow.Status || "scheduled",
    is_Active: csvRow["Is Active"] || "Yes",
    Featured: csvRow.Featured || "No",
    "Amilia Link": csvRow["Amilia Link"] || "",
    Notes: csvRow.Notes || "",
  }

  for (const col of schemaColumns) {
    if (row[col.header] !== undefined) continue
    row[col.header] = csvRow[col.header] ?? ""
  }

  return row
}

function colLetter(index) {
  let n = index + 1
  let letters = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

function lookupColumnIndex(lookupKey, lookupKeys) {
  const idx = lookupKeys.indexOf(lookupKey)
  return idx >= 0 ? idx : null
}

function writeLookupSheet(sheet, lookups) {
  const lookupKeys = Object.keys(lookups)
  lookupKeys.forEach((key, colIdx) => {
    const values = lookups[key]
    sheet.getCell(1, colIdx + 1).value = key
    values.forEach((value, rowIdx) => {
      sheet.getCell(rowIdx + 2, colIdx + 1).value = value
    })
  })
  return lookupKeys
}

function listValidationFormula(sheetName, colIdx, valueCount) {
  if (!valueCount) return '"_"'
  const col = colLetter(colIdx)
  const lastRow = valueCount + 1
  return `'${sheetName}'!$${col}$2:$${col}$${lastRow}`
}

async function writeInstanceXlsxTemplate({
  headers,
  rows,
  lookups,
  dropdownConfig,
  outPath,
}) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Blaze export-instance-xlsx-template"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Instances")
  const lookupSheet = workbook.addWorksheet("_Lookups")
  const lookupKeys = writeLookupSheet(lookupSheet, lookups)
  lookupSheet.state = "veryHidden"

  sheet.views = [{ state: "frozen", ySplit: 1 }]

  sheet.addRow(headers)

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }

  for (const row of rows) {
    sheet.addRow(headers.map((header) => row[header] ?? ""))
  }

  const targetDataRows = Math.max(rows.length + EXTRA_VALIDATION_ROWS, TEMPLATE_EMPTY_ROWS)
  const currentRows = sheet.rowCount
  for (let i = currentRows; i < targetDataRows; i++) {
    sheet.addRow(headers.map(() => ""))
  }

  const headerIndex = new Map(headers.map((header, idx) => [header, idx]))
  const alwaysReadonlyColIndexes = new Set(
    [...ALWAYS_READONLY_COLUMNS].map((header) => headerIndex.get(header)).filter((idx) => idx != null)
  )
  const idColIdx = headerIndex.get("id")
  const offeringNameColIdx = headerIndex.get("offering_name")
  const dropdownColIndexes = new Map()
  for (const [header, lookupKey] of Object.entries(dropdownConfig)) {
    const idx = headerIndex.get(header)
    if (idx != null) dropdownColIndexes.set(idx, lookupKey)
  }

  const lastValidationRow = targetDataRows + 1
  for (let rowNum = 2; rowNum <= lastValidationRow; rowNum++) {
    const row = sheet.getRow(rowNum)
    const idCell = idColIdx != null ? row.getCell(idColIdx + 1) : null
    const hasExistingId =
      idCell != null && idCell.value != null && String(idCell.value).trim() !== ""

    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const cell = row.getCell(colIdx + 1)
      const isReadonly =
        alwaysReadonlyColIndexes.has(colIdx) ||
        (colIdx === offeringNameColIdx && hasExistingId)
      const lookupKey = dropdownColIndexes.get(colIdx)
      cell.protection = { locked: isReadonly }

      if (lookupKey) {
        const lookupColIdx = lookupColumnIndex(lookupKey, lookupKeys)
        const valueCount = lookups[lookupKey]?.length || 0
        if (lookupColIdx != null && valueCount > 0) {
          cell.dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [listValidationFormula("_Lookups", lookupColIdx, valueCount)],
            showErrorMessage: true,
            errorStyle: "stop",
            errorTitle: "Invalid value",
            error: "Please select a value from the dropdown list.",
          }
        }
      }
    }
  }

  for (let colIdx = 0; colIdx < headers.length; colIdx++) {
    const column = sheet.getColumn(colIdx + 1)
    column.width = Math.min(Math.max(String(headers[colIdx]).length + 4, 12), 40)
  }

  await sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  })

  await workbook.xlsx.writeFile(outPath)
}

module.exports = {
  TEMPLATE_EMPTY_ROWS,
  fetchLookupLists,
  getDropdownConfig,
  instanceToOperatorRow,
  exportOperatorHeaders,
  writeInstanceXlsxTemplate,
}
