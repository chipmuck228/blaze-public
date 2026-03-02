'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export interface InstanceItem {
  id: string
  start_date: string | null
  end_date: string | null
  program_display_name: string
  course_name: string
  category_slug: string
  franchise_name: string
  franchise_code: string
  location_name?: string
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return 'TBD'
  const startStr = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (!end || end === start) return startStr
  const endStr = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} – ${endStr}`
}

function isDateInRange(dayStr: string, start: string | null, end: string | null): boolean {
  if (!start) return false
  const endStr = end && end !== start ? end : start
  return dayStr >= start.slice(0, 10) && dayStr <= endStr.slice(0, 10)
}

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

interface CalendarByOfferingProps {
  instances: InstanceItem[]
}

export function CalendarByOffering({ instances }: CalendarByOfferingProps) {
  const [weekStart, setWeekStart] = useState(() => toYYYYMMDD(getWeekStart(new Date())))

  const offeringGroups = useMemo(() => {
    const map = new Map<string, InstanceItem[]>()
    for (const item of instances) {
      const name = item.course_name || 'Unnamed'
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(item)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [instances])

  const weekDays = useMemo(() => {
    const start = new Date(weekStart + 'T00:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return toYYYYMMDD(d)
    })
  }, [weekStart])

  const getInstancesForCell = useMemo(() => {
    return (offeringName: string, dateStr: string) => {
      const group = offeringGroups.find(([name]) => name === offeringName)?.[1] ?? []
      return group.filter((inst) => isDateInRange(dateStr, inst.start_date, inst.end_date))
    }
  }, [offeringGroups])

  const weekLabel = useMemo(() => {
    const start = new Date(weekStart + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }, [weekStart])

  const goPrevWeek = () => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() - 7)
    setWeekStart(toYYYYMMDD(d))
  }

  const goNextWeek = () => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    setWeekStart(toYYYYMMDD(d))
  }

  if (instances.length === 0) return null

  return (
    <section className="bg-slate-50/80 py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-900">Calendar by Offering</h2>
            <p className="text-slate-500 text-sm mt-1">
              Each row is an offering; cells show instances on that day. Click a badge to view and enroll.
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-700">{weekLabel}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrevWeek}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goNextWeek}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[520px] rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-2 font-semibold text-slate-700 sticky left-0 z-10 bg-slate-50 border-r border-slate-200 min-w-[180px]">
                      Offering
                    </th>
                    {weekDays.map((dateStr) => {
                      const d = new Date(dateStr + 'T00:00:00')
                      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                      const dayNum = d.getDate()
                      return (
                        <th
                          key={dateStr}
                          className="min-w-[140px] w-36 p-2 text-center text-xs font-medium text-slate-500 border-r border-slate-100 last:border-r-0"
                        >
                          <div>{dayName}</div>
                          <div className="font-semibold text-slate-700">{dayNum}</div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {offeringGroups.map(([offeringName]) => (
                    <tr key={offeringName} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="sticky left-0 z-10 bg-white p-2 border-r border-slate-100 font-medium text-slate-800 align-top min-w-[180px]">
                        {offeringName}
                      </td>
                      {weekDays.map((dateStr) => {
                        const cellInstances = getInstancesForCell(offeringName, dateStr)
                        return (
                          <td
                            key={dateStr}
                            className="min-w-[140px] w-36 p-1.5 align-top border-r border-slate-100 last:border-r-0"
                          >
                            {cellInstances.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                {cellInstances.map((inst) => {
                                  const href = inst.category_slug
                                    ? `/category/${inst.category_slug}${inst.franchise_code ? `?location=${encodeURIComponent(inst.franchise_code)}` : ''}`
                                    : '/programs'
                                  const location = inst.location_name || inst.franchise_name || inst.franchise_code || '—'
                                  return (
                                    <Link
                                      key={inst.id}
                                      href={href}
                                      className="block rounded-lg border border-slate-200 bg-slate-50/80 p-2 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
                                      title={`${inst.program_display_name} · ${location} · ${formatDateRange(inst.start_date, inst.end_date)}`}
                                    >
                                      <div className="font-semibold text-slate-800 text-xs leading-tight">
                                        {inst.program_display_name}
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                        {location}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        {formatDateRange(inst.start_date, inst.end_date)}
                                      </div>
                                    </Link>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-4 pb-1">
              <Link
                href="/programs"
                className="text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium inline-flex items-center gap-1"
              >
                See all programs →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
