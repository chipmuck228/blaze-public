'use client'

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Navbar } from "@/components/Navbar"
import { MobileLayout } from "@/app/mobile-layout"
import { usePlatform } from "@/hooks/usePlatform"
import { Footer } from "@/components/Footer"
import { Loader2, FileText, Calendar, MapPin, Clock, ChevronRight, ShoppingCart, AlertCircle, CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Enrollment {
  id: string
  user_id: string
  payer_user_id: string
  instance_id: string
  student_id: string | null
  student_name: string
  status: 'cart' | 'reserved' | 'enrolled' | 'waitlisted' | 'cancelled' | 'expired' | 'completed' | 'dropped' | 'credited'
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'credited'
  amount_paid: number | null
  tax_amount: number | null
  enrolled_at: string | null
  waitlist_position: number | null
  created_at: string
  updated_at: string
  instance: {
    id: string
    start_date: string
    end_date: string | null
    start_time: string | null
    end_time: string | null
    offering: {
      id: string
      name: string
      description: string | null
      base_price: number
    } | null
    location: {
      id: string
      name: string
      address: string | null
    } | null
    franchise: {
      id: string
      code: string
      name: string
    } | null
  } | null
}

export default function EnrollmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isNative, isReady } = usePlatform()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'waitlisted' | 'cancelled' | 'cart'>('all')

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user) {
      fetchEnrollments()
    }
  }, [status, session, router, filter])

  const fetchEnrollments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/user/enrollments${filter !== 'all' ? `?status=${filter}` : ''}`)
      if (response.ok) {
        const data = await response.json()
        setEnrollments(data || [])
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }
    > = {
      enrolled: { variant: 'default', label: 'Enrolled', className: 'bg-green-100 text-green-700' },
      waitlisted: { variant: 'secondary', label: 'Waitlisted', className: 'bg-yellow-100 text-yellow-700' },
      cancelled: { variant: 'destructive', label: 'Cancelled', className: 'bg-red-100 text-red-700' },
      cart: { variant: 'outline', label: 'In Cart', className: 'bg-blue-100 text-blue-700' },
      reserved: { variant: 'outline', label: 'Reserved', className: 'bg-purple-100 text-purple-700' },
      completed: { variant: 'default', label: 'Completed', className: 'bg-green-100 text-green-700' },
      expired: { variant: 'destructive', label: 'Expired', className: 'bg-red-100 text-red-700' },
      dropped: { variant: 'destructive', label: 'Dropped', className: 'bg-red-100 text-red-700' },
      credited: { variant: 'secondary', label: 'Credited', className: 'bg-gray-100 text-gray-700' },
    }
    const config = variants[status] || { variant: 'outline', label: status, className: 'bg-gray-100 text-gray-700' }
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const filteredEnrollments = filter === 'all' 
    ? enrollments 
    : enrollments.filter(e => e.status === filter)

  const stats = {
    total: enrollments.length,
    enrolled: enrollments.filter(e => e.status === 'enrolled').length,
    waitlisted: enrollments.filter(e => e.status === 'waitlisted').length,
    cart: enrollments.filter(e => e.status === 'cart').length,
  }

  if (status === "loading" || isLoading) {
    return (
      <>
        <Navbar />
        <div className="pt-14 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!session) {
    return null
  }

  const content = (
    <div className="pb-24 bg-slate-50 min-h-screen">
      {/* Header */}
      <section className="bg-[#0f172a] py-16 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black mb-2">My Enrollments</h1>
              <p className="text-slate-400">View and manage your course enrollments, orders, and waitlist positions.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Enrolled</p>
                    <p className="text-2xl font-black text-green-600">{stats.enrolled}</p>
                  </div>
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Waitlisted</p>
                    <p className="text-2xl font-black text-yellow-600">{stats.waitlisted}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">In Cart</p>
                    <p className="text-2xl font-black text-blue-600">{stats.cart}</p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Enrollment History</h3>
                </div>
              </div>
              <div className="p-8">
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {[
                    { key: 'all', label: 'All Enrollments' },
                    { key: 'enrolled', label: 'Enrolled' },
                    { key: 'waitlisted', label: 'Waitlisted' },
                    { key: 'cart', label: 'In Cart' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map((filterOption) => (
                    <button
                      key={filterOption.key}
                      onClick={() =>
                        setFilter(filterOption.key as typeof filter)
                      }
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                        filter === filterOption.key
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>

                {/* Enrollments List */}
                {filteredEnrollments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">
                      {filter === 'all' 
                        ? 'No enrollments found' 
                        : `No ${filter} enrollments found`}
                    </p>
                    <Button asChild>
                      <Link href="/programs">Browse Programs</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredEnrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:border-blue-300 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-slate-900">
                                {enrollment.instance?.offering?.name || 'Course'}
                              </h4>
                              {getStatusBadge(enrollment.status)}
                            </div>
                            <p className="text-sm text-slate-500 mb-3">
                              Student: <span className="font-medium text-slate-700">{enrollment.student_name}</span>
                            </p>
                          </div>
                        </div>

                        {enrollment.instance && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {enrollment.instance.start_date && (
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span>
                                  {formatDate(enrollment.instance.start_date)}
                                  {enrollment.instance.end_date && ` - ${formatDate(enrollment.instance.end_date)}`}
                                </span>
                              </div>
                            )}
                            {enrollment.instance.start_time && enrollment.instance.end_time && (
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>
                                  {formatTime(enrollment.instance.start_time)} - {formatTime(enrollment.instance.end_time)}
                                </span>
                              </div>
                            )}
                            {enrollment.instance.location && (
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span>{enrollment.instance.location.name}</span>
                              </div>
                            )}
                            {enrollment.amount_paid && (
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <span className="font-bold text-slate-900">${enrollment.amount_paid.toFixed(2)}</span>
                                {enrollment.tax_amount && (
                                  <span className="text-slate-400">+ ${enrollment.tax_amount.toFixed(2)} tax</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {enrollment.status === 'waitlisted' && enrollment.waitlist_position && (
                          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-800">
                                Waitlist Position: #{enrollment.waitlist_position}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-slate-200">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/enrollments/orders/${enrollment.id}`)}
                            className="flex items-center space-x-2"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                          {enrollment.status === 'cart' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push('/enrollments/cart')}
                            >
                              Go to Cart
                            </Button>
                          )}
                          {enrollment.status === 'waitlisted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push('/enrollments/waitlist')}
                            >
                              View Waitlist
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Quick Actions</h3>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="/enrollments/cart"
                    className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShoppingCart className="w-6 h-6 text-blue-600" />
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">Shopping Cart</h4>
                    <p className="text-xs text-slate-500">View items in your cart</p>
                  </Link>
                  <Link
                    href="/enrollments/waitlist"
                    className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:border-yellow-300 hover:bg-yellow-50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-yellow-600 transition-colors" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">Waitlist</h4>
                    <p className="text-xs text-slate-500">Check waitlist positions</p>
                  </Link>
                  <Link
                    href="/enrollments/credits"
                    className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:border-green-300 hover:bg-green-50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-6 h-6 text-green-600" />
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">Credits</h4>
                    <p className="text-xs text-slate-500">View available credits</p>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )

  // 移动端：使用移动端布局
  if (isReady && isNative) {
    return (
      <MobileLayout>
        {content}
      </MobileLayout>
    )
  }

  // Web 端：使用完整布局
  return (
    <>
      <Navbar />
      <div className="pt-14">
        {content}
      </div>
      <Footer />
    </>
  )
}
