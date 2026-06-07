"use client"

import { Search, X, MapPin } from "lucide-react"
import {
  PROGRAMS_CATALOG_GRADE_OPTIONS,
  type ProgramsCatalogFilterState,
  type ProgramsCatalogGradeRange,
  type ProgramsCatalogLocationRef,
  type ProgramsCatalogOfferingType,
} from "@/lib/programs-catalog-tree"
import {
  OfferingTypeIcon,
  offeringTypeLabel,
} from "@/components/programs/SessionCatalogMetaIcons"
import styles from "@/app/programs/programs.module.css"

interface ProgramsCatalogFiltersProps {
  filterLocations: ProgramsCatalogLocationRef[]
  filterOfferingTypes: ProgramsCatalogOfferingType[]
  filters: ProgramsCatalogFilterState
  onFiltersChange: (next: ProgramsCatalogFilterState) => void
}

export function hasActiveProgramsCatalogFilters(filters: ProgramsCatalogFilterState): boolean {
  return (
    filters.searchQuery.trim().length > 0 ||
    filters.locationId !== "all" ||
    filters.gradeRange !== "all" ||
    filters.offeringTypeCode !== "all"
  )
}

export function ProgramsCatalogFilters({
  filterLocations,
  filterOfferingTypes,
  filters,
  onFiltersChange,
}: ProgramsCatalogFiltersProps) {
  const hasSearch = filters.searchQuery.trim().length > 0
  const hasActive = hasActiveProgramsCatalogFilters(filters)

  const selectedLocation =
    filters.locationId === "all"
      ? null
      : filterLocations.find((loc) => loc.id === filters.locationId)

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterRow}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} aria-hidden />
          <input
            type="search"
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Search offerings…"
            className={styles.searchInput}
            aria-label="Search offerings"
          />
          {hasSearch ? (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {filterLocations.length > 0 ? (
          <div className={styles.locationWrap}>
            <MapPin className={styles.locationIcon} aria-hidden />
            <select
              value={filters.locationId}
              onChange={(e) => onFiltersChange({ ...filters, locationId: e.target.value })}
              className={styles.locationSelect}
              aria-label="Filter by location"
            >
              <option value="all">All Locations</option>
              {filterLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {filterOfferingTypes.length > 0 ? (
        <div className={styles.gradeRow}>
          <span className={styles.gradeLabel}>Type</span>
          <div className={styles.gradeChips} role="group" aria-label="Filter by offering type">
            <button
              type="button"
              className={
                filters.offeringTypeCode === "all"
                  ? `${styles.gradeChip} ${styles.gradeChipActive}`
                  : styles.gradeChip
              }
              onClick={() => onFiltersChange({ ...filters, offeringTypeCode: "all" })}
              aria-pressed={filters.offeringTypeCode === "all"}
            >
              All Types
            </button>
            {filterOfferingTypes.map((ot) => (
              <button
                key={ot.code}
                type="button"
                className={
                  filters.offeringTypeCode === ot.code
                    ? `${styles.typeChip} ${styles.typeChipActive}`
                    : styles.typeChip
                }
                onClick={() => onFiltersChange({ ...filters, offeringTypeCode: ot.code })}
                aria-pressed={filters.offeringTypeCode === ot.code}
              >
                <OfferingTypeIcon code={ot.code} className={styles.typeChipIcon} />
                <span>{ot.name || offeringTypeLabel(ot.code)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.gradeRow}>
        <span className={styles.gradeLabel}>Grade</span>
        <div className={styles.gradeChips} role="group" aria-label="Filter by grade">
          {PROGRAMS_CATALOG_GRADE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={
                filters.gradeRange === opt.value
                  ? `${styles.gradeChip} ${styles.gradeChipActive}`
                  : styles.gradeChip
              }
              onClick={() =>
                onFiltersChange({ ...filters, gradeRange: opt.value as ProgramsCatalogGradeRange })
              }
              aria-pressed={filters.gradeRange === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {hasActive ? (
          <button
            type="button"
            className={styles.clearFiltersBtn}
            onClick={() =>
              onFiltersChange({
                searchQuery: "",
                locationId: "all",
                gradeRange: "all",
                offeringTypeCode: "all",
              })
            }
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {selectedLocation ? (
        <p className={styles.filterHint}>
          Showing offerings with sessions at <strong>{selectedLocation.name}</strong>
        </p>
      ) : null}
    </div>
  )
}
