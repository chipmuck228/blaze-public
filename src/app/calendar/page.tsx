'use client'

import { useState, useEffect, useMemo } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AIChatButton } from '@/components/location/AIChatButton'
import { AboutHero } from '@/components/about/AboutHero'
import { CalendarByOffering } from '@/components/calendar/CalendarByOffering'
import { Calendar as CalendarIcon, ChevronRight, Loader2, MapPin } from 'lucide-react'
import Link from 'next/link'

type Holiday = { date: string; name: string; year: number }

const usFederalHolidays: Holiday[] = [
  { year: 2025, date: 'Jan 1', name: "New Year's Day" },
  { year: 2025, date: 'Jan 20', name: "Martin Luther King Jr. Day" },
  { year: 2025, date: 'Feb 17', name: "Washington's Birthday" },
  { year: 2025, date: 'May 26', name: 'Memorial Day' },
  { year: 2025, date: 'Jun 19', name: 'Juneteenth National Independence Day' },
  { year: 2025, date: 'Jul 4', name: 'Independence Day' },
  { year: 2025, date: 'Sep 1', name: 'Labor Day' },
  { year: 2025, date: 'Oct 13', name: "Columbus Day" },
  { year: 2025, date: 'Nov 11', name: 'Veterans Day' },
  { year: 2025, date: 'Nov 27', name: 'Thanksgiving Day' },
  { year: 2025, date: 'Dec 25', name: 'Christmas Day' },
  { year: 2026, date: 'Jan 1', name: "New Year's Day" },
  { year: 2026, date: 'Jan 19', name: "Martin Luther King Jr. Day" },
  { year: 2026, date: 'Feb 16', name: "Washington's Birthday" },
  { year: 2026, date: 'May 25', name: 'Memorial Day' },
  { year: 2026, date: 'Jun 19', name: 'Juneteenth National Independence Day' },
  { year: 2026, date: 'Jul 3', name: 'Independence Day (observed)' },
  { year: 2026, date: 'Sep 7', name: 'Labor Day' },
  { year: 2026, date: 'Oct 12', name: "Columbus Day" },
  { year: 2026, date: 'Nov 11', name: 'Veterans Day' },
  { year: 2026, date: 'Nov 26', name: 'Thanksgiving Day' },
  { year: 2026, date: 'Dec 25', name: 'Christmas Day' },
]

interface InstanceItem {
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

export default function CalendarPage() {
  const [programItems, setProgramItems] = useState<InstanceItem[]>([])
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true)
  const [currentYear, setCurrentYear] = useState(2025)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        setIsLoadingPrograms(true)
        const res = await fetch('/api/public/instances-v2')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        const list: InstanceItem[] = []
        const franchises = data.franchises || []
        for (const f of franchises) {
          for (const p of f.programs || []) {
            const categorySlug = (p.category?.name || '').replace(/_/g, '-')
            for (const inst of p.instances || []) {
              if (inst.start_date) {
                list.push({
                  id: inst.id,
                  start_date: inst.start_date,
                  end_date: inst.end_date || null,
                  program_display_name: p.display_name || p.name || 'Program',
                  course_name: inst.course?.name || inst.offering?.name || 'Class',
                  category_slug: categorySlug,
                  franchise_name: f.name || '',
                  franchise_code: f.code || '',
                  location_name: inst.location?.name,
                })
              }
            }
          }
        }
        list.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
        setProgramItems(list)
      } catch (e) {
        console.error(e)
        setProgramItems([])
      } finally {
        setIsLoadingPrograms(false)
      }
    }
    fetchInstances()
  }, [])

  const currentYearHolidays = useMemo(() => {
    return usFederalHolidays.filter((h) => h.year === currentYear)
  }, [currentYear])

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <div className="pb-24 bg-white">
          <AboutHero />

          {/* Two columns: light cards, clear hierarchy */}
          <section className="py-16 md:py-20 bg-slate-50/80">
            <div className="max-w-6xl mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                {/* US Federal Holidays */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">US Federal Holidays</h2>
                        <p className="text-slate-500 text-sm mt-0.5">{currentYear} · Campus schedules may vary</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {currentYearHolidays.length === 0 ? (
                      <p className="text-slate-500 text-sm">No holiday data for {currentYear}.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {currentYearHolidays.map((h, i) => (
                          <li key={`${currentYear}-${i}`} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                            <span className="text-slate-400 font-medium text-sm tabular-nums w-14 shrink-0">{h.date}</span>
                            <span className="text-slate-700 text-sm">{h.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Program & Class Dates */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <h2 className="text-xl font-bold text-slate-900">Program & Class Dates</h2>
                    <p className="text-slate-500 text-sm mt-1">Session dates · Tap to view and enroll</p>
                  </div>
                  <div className="p-6 flex-1 min-h-0 flex flex-col">
                    {isLoadingPrograms ? (
                      <div className="flex items-center justify-center py-14">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      </div>
                    ) : programItems.length === 0 ? (
                      <div className="py-8">
                        <p className="text-slate-500 text-sm">No upcoming programs at the moment.</p>
                        <Link
                          href="/programs"
                          className="inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:underline text-sm mt-3"
                        >
                          View Programs <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2 overflow-y-auto max-h-[380px] -mr-1 pr-1">
                        {programItems.map((item) => {
                          const href = item.category_slug
                            ? `/category/${item.category_slug}${item.franchise_code ? `?location=${encodeURIComponent(item.franchise_code)}` : ''}`
                            : '/programs'
                          return (
                            <Link
                              key={item.id}
                              href={href}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:border-blue-200 hover:bg-blue-50/30 transition-colors group"
                            >
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {item.program_display_name}
                                </h3>
                                <p className="text-slate-500 text-xs mt-0.5">{item.course_name}</p>
                                {(item.location_name || item.franchise_name) && (
                                  <div className="flex items-center text-slate-400 text-xs mt-1.5">
                                    <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                                    {item.location_name || item.franchise_name}
                                  </div>
                                )}
                              </div>
                              <div className="sm:text-right shrink-0">
                                <span className="text-xs text-slate-500 font-medium">
                                  {formatDateRange(item.start_date, item.end_date)}
                                </span>
                                <span className="sm:ml-2 inline-flex items-center text-blue-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                  Enroll <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </Link>
                          )
                        })}
                        <div className="pt-4 pb-1">
                          <Link
                            href="/programs"
                            className="text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium inline-flex items-center gap-1"
                          >
                            See all programs →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <CalendarByOffering instances={programItems} />
        </div>
      </main>
      <Footer />
      <AIChatButton franchiseCode="general" franchiseName="Blaze Robotics Academy" />
    </>
  )
}
