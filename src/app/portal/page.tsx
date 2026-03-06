'use client'

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Navbar } from "@/components/Navbar"
import { MobileLayout } from "@/app/mobile-layout"
import { usePlatform } from "@/hooks/usePlatform"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  MapPin, 
  Clock,
  CheckCircle2,
  Loader2,
  FileText,
  ExternalLink,
  Send,
  Bell,
  ShieldCheck
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddPaymentMethodDialog } from "@/components/payment/AddPaymentMethodDialog"
import { Trash2, Star } from "lucide-react"
import { Footer } from "@/components/Footer"
import Link from "next/link"

interface UserProfile {
  id: string
  name: string
  email: string
  email_verified: boolean
  image?: string
  created_at: string
}

interface Enrollment {
  id: string
  instance_id: string
  status: 'cart' | 'reserved' | 'enrolled' | 'waitlisted' | 'cancelled' | 'expired' | 'completed'
  enrolled_at?: string
  waitlist_position?: number
  instance?: {
    id: string
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
    is_course_type?: boolean
    offering?: {
      id?: string
      name?: string
      description?: string
      base_price?: number
    }
    assignment?: {
      course?: {
        name: string
        base_price?: number
      }
      category?: {
        name: string
        display_name?: string
      }
      series?: {
        name: string
        display_name?: string
      }
      location?: {
        name: string
      }
    }
    location?: {
      name: string
    }
  }
}

interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank'
  card?: {
    brand?: string
    last4?: string
    exp_month?: number
    exp_year?: number
  }
  last4?: string
  brand?: string
  is_default: boolean
  expires_at?: string
  created?: number
}

interface BillingRecord {
  id: string
  amount: number
  currency: string
  payment_status: 'paid' | 'refunded'
  payment_transaction_id?: string
  stripe_checkout_session_id?: string
  stripe_payment_intent_id?: string
  enrolled_at?: string
  created_at: string
  course?: {
    id: string
    name: string
    slug?: string
  }
  category?: {
    id: string
    name: string
    display_name?: string
  }
  series?: {
    id: string
    name: string
    display_name?: string
  }
  location?: {
    id: string
    name: string
  }
  instance?: {
    id: string
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
  }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isNative, isReady } = usePlatform()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false)
  const [isRemovingPaymentMethod, setIsRemovingPaymentMethod] = useState<string | null>(null)
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null)
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [sendingInvoiceIds, setSendingInvoiceIds] = useState<Set<string>>(new Set())
  const [cartItems, setCartItems] = useState<any[]>([])
  const [waitlistItems, setWaitlistItems] = useState<any[]>([])
  const [credits, setCredits] = useState<any[]>([])
  const [students, setStudents] = useState<{ id: string; name: string; can_view_progress: boolean }[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user) {
      fetchProfile()
      fetchEnrollments()
      fetchPaymentMethods()
      fetchBillingHistory()
      fetchCart()
      fetchWaitlist()
      fetchCredits()
      fetchStudents()
    }
  }, [status, session, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const response = await fetch("/api/enrollments/orders")
      if (response.ok) {
        const data = await response.json()
        setEnrollments(data.enrollments || [])
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error)
    }
  }

  const fetchBillingHistory = async () => {
    try {
      const response = await fetch("/api/user/billing-history")
      if (response.ok) {
        const data = await response.json()
        setBillingHistory(data.billingHistory || [])
      }
    } catch (error) {
      console.error("Error fetching billing history:", error)
    }
  }

  const handleViewInvoice = async (recordId: string) => {
    try {
      setViewingInvoiceId(recordId)
      const response = await fetch(`/api/user/invoice/${recordId}`)
      if (response.ok) {
        const data = await response.json()
        setInvoiceData(data.invoice)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to load invoice')
        setViewingInvoiceId(null)
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      toast.error('Failed to load invoice')
      setViewingInvoiceId(null)
    }
  }

  const handleSendInvoice = async (recordId: string) => {
    try {
      setSendingInvoiceIds(prev => new Set(prev).add(recordId))
      const response = await fetch(`/api/user/invoice/${recordId}/send`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Invoice sent successfully to your email!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send invoice')
      }
    } catch (error) {
      console.error("Error sending invoice:", error)
      toast.error('Failed to send invoice')
    } finally {
      setSendingInvoiceIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(recordId)
        return newSet
      })
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch("/api/user/payment-methods")
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data || [])
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    }
  }

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/enrollments/cart")
      if (res.ok) {
        const data = await res.json()
        setCartItems(data.items || [])
      }
    } catch (e) {
      console.error("Error fetching cart:", e)
    }
  }

  const fetchWaitlist = async () => {
    try {
      const res = await fetch("/api/enrollments/waitlist")
      if (res.ok) {
        const data = await res.json()
        setWaitlistItems(data.waitlist || data.items || [])
      }
    } catch (e) {
      console.error("Error fetching waitlist:", e)
    }
  }

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/enrollments/credits")
      if (res.ok) {
        const data = await res.json()
        setCredits(data.credits || [])
      }
    } catch (e) {
      console.error("Error fetching credits:", e)
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students")
      if (res.ok) {
        const data = await res.json()
        setStudents((data.students || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          can_view_progress: !!s.can_view_progress,
        })))
      }
    } catch (e) {
      console.error("Error fetching students:", e)
    }
  }

  const removeFromCart = async (enrollmentId: string) => {
    try {
      const res = await fetch(`/api/enrollments/cart/${enrollmentId}`, { method: "DELETE" })
      if (res.ok) {
        fetchCart()
        toast.success("Removed from cart")
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to remove")
      }
    } catch {
      toast.error("Failed to remove")
    }
  }

  const removeFromWaitlist = async (enrollmentId: string) => {
    try {
      const res = await fetch(`/api/enrollments/waitlist/${enrollmentId}`, { method: "DELETE" })
      if (res.ok) {
        fetchWaitlist()
        toast.success("Removed from waitlist")
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to remove")
      }
    } catch {
      toast.error("Failed to remove")
    }
  }

  const handleAddPaymentMethodSuccess = () => {
    fetchPaymentMethods()
  }

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return
    }

    setIsRemovingPaymentMethod(paymentMethodId)
    try {
      const response = await fetch(`/api/user/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchPaymentMethods()
        toast.success('Payment method removed successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove payment method')
      }
    } catch (error: any) {
      console.error('Error removing payment method:', error)
      toast.error('Failed to remove payment method')
    } finally {
      setIsRemovingPaymentMethod(null)
    }
  }

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    setIsSettingDefault(paymentMethodId)
    try {
      const response = await fetch(`/api/user/payment-methods/${paymentMethodId}`, {
        method: 'PATCH',
      })

      if (response.ok) {
        await fetchPaymentMethods()
        toast.success('Default payment method updated')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to set default payment method')
      }
    } catch (error: any) {
      console.error('Error setting default payment method:', error)
      toast.error('Failed to set default payment method')
    } finally {
      setIsSettingDefault(null)
    }
  }

  const getCardBrandDisplay = (method: PaymentMethod): string => {
    if (method.card?.brand) {
      return method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)
    }
    if (method.brand) {
      return method.brand.charAt(0).toUpperCase() + method.brand.slice(1)
    }
    return method.type.toUpperCase()
  }

  const getCardLast4 = (method: PaymentMethod): string | undefined => {
    return method.card?.last4 || method.last4
  }

  const getCardExpiry = (method: PaymentMethod): string | undefined => {
    if (method.card?.exp_month && method.card?.exp_year) {
      return `${String(method.card.exp_month).padStart(2, '0')}/${method.card.exp_year}`
    }
    if (method.expires_at) {
      return formatDate(method.expires_at)
    }
    return undefined
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return ""
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "enrolled":
        return "default"
      case "completed":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "cart":
        return "outline"
      case "reserved":
        return "outline"
      case "waitlisted":
        return "secondary"
      case "expired":
        return "destructive"
      default:
        return "outline"
    }
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

  if (!session || !profile) {
    return null
  }

  // Course-only enrollments (Portal shows these in Next class, My Courses, Course Summary, Schedule)
  const courseEnrollments = enrollments.filter(e => e.instance?.is_course_type === true)
  const activeStudents = courseEnrollments.filter(e => e.status === 'enrolled').length
  const nextClass = courseEnrollments
    .filter(e => e.status === 'enrolled' && e.instance?.start_date)
    .sort((a, b) => {
      const dateA = new Date(a.instance!.start_date).getTime()
      const dateB = new Date(b.instance!.start_date).getTime()
      return dateA - dateB
    })[0]
  
  const formatNextClass = () => {
    if (!nextClass?.instance) return 'No upcoming classes'
    const date = new Date(nextClass.instance.start_date)
    const time = nextClass.instance.start_time 
      ? formatTime(nextClass.instance.start_time)
      : ''
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    return `${dayName}${time ? ` at ${time}` : ''}`
  }

  const content = (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero Section */}
      <section className="bg-[#0f172a] dark:bg-slate-950 py-20 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="text-blue-400 font-bold uppercase tracking-widest text-xs">Account Center</span>
          <h1 className="text-5xl font-black mt-2 mb-6">My Account</h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Welcome back, {profile.name}! Manage payments, enrollments, and view course summary here.
          </p>
          <Button variant="link" className="px-0 text-blue-300 hover:text-white mt-2" asChild>
            <Link href="/profile">
              Edit profile & students on Profile page →
            </Link>
          </Button>
        </div>
        <div className="absolute right-0 top-0 w-1/3 h-full bg-blue-600/10 blur-[100px] rounded-full"></div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* User Stats/Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Enrollments</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{activeStudents} {activeStudents === 1 ? 'Course' : 'Courses'}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Class</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatNextClass()}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unread Alerts</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">0 Notifications</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tabs Section */}
            <div>
              <Tabs defaultValue="enrollments" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <TabsTrigger value="enrollments" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Enrollments & Orders</TabsTrigger>
                  <TabsTrigger value="courses" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Course Summary</TabsTrigger>
                  <TabsTrigger value="payment" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Payment Methods</TabsTrigger>
                  <TabsTrigger value="progress" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Student Progress</TabsTrigger>
                </TabsList>

                {/* Enrollments & Orders: Cart + Waitlist + Enrolled courses inline */}
                <TabsContent value="enrollments" className="space-y-6">
                  {/* Cart inline */}
                  {cartItems.length > 0 && (
                    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          Cart ({cartItems.length})
                        </CardTitle>
                        <CardDescription>Items in your cart</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {cartItems.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div>
                              <p className="font-medium">{item.instance?.offering?.name || item.instance?.name || "Course"}</p>
                              {item.student_name && <p className="text-xs text-muted-foreground">Student: {item.student_name}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => removeFromCart(item.id)}>
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button asChild size="sm">
                          <Link href="/enrollments/cart">Go to cart & checkout</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Waitlist inline */}
                  {waitlistItems.length > 0 && (
                    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Waitlist ({waitlistItems.length})
                        </CardTitle>
                        <CardDescription>Your waitlist positions</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {waitlistItems.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div>
                              <p className="font-medium">{item.instance?.offering?.name || item.instance?.name || "Course"}</p>
                              {item.student_name && <p className="text-xs text-muted-foreground">Student: {item.student_name}</p>}
                              {item.waitlist_position != null && (
                                <p className="text-xs text-muted-foreground">Position #{item.waitlist_position}</p>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => removeFromWaitlist(item.id)}>
                              Leave waitlist
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Enrolled / all enrollments */}
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle>My Courses</CardTitle>
                      <CardDescription>
                        Enrolled courses and registrations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {enrollments.length === 0 && cartItems.length === 0 && waitlistItems.length === 0 ? (
                        <div className="text-center py-12">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground mb-4">No enrollments yet</p>
                          <Button asChild>
                            <Link href="/course-catalog">Browse Courses</Link>
                          </Button>
                        </div>
                      ) : courseEnrollments.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground text-sm mb-2">No enrolled courses</p>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/enrollments/orders">View all orders</Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {courseEnrollments.map((enrollment) => {
                            const courseName = enrollment.instance?.offering?.name || enrollment.instance?.assignment?.course?.name || 'Course'
                            const category = enrollment.instance?.assignment?.category?.display_name || enrollment.instance?.assignment?.category?.name || ''
                            const series = enrollment.instance?.assignment?.series?.display_name || enrollment.instance?.assignment?.series?.name || ''
                            const location = enrollment.instance?.assignment?.location?.name || enrollment.instance?.location?.name
                            const startDate = enrollment.instance?.start_date
                            const endDate = enrollment.instance?.end_date
                            const startTime = enrollment.instance?.start_time
                            const endTime = enrollment.instance?.end_time

                            return (
                              <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold">{courseName}</h3>
                                        <Badge variant={getStatusColor(enrollment.status)}>
                                          {enrollment.status}
                                        </Badge>
                                        {enrollment.waitlist_position != null && (
                                          <Badge variant="secondary">Position #{enrollment.waitlist_position}</Badge>
                                        )}
                                      </div>
                                      {(category || series) && (
                                        <p className="text-sm text-muted-foreground">
                                          {category && series ? `${category} > ${series}` : category || series}
                                        </p>
                                      )}
                                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        {location && (
                                          <div className="flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{location}</span>
                                          </div>
                                        )}
                                        {startDate && endDate && (
                                          <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
                                          </div>
                                        )}
                                        {startTime && endTime && (
                                          <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{formatTime(startTime)} - {formatTime(endTime)}</span>
                                          </div>
                                        )}
                                      </div>
                                      {enrollment.enrolled_at && (
                                        <p className="text-xs text-muted-foreground">
                                          Enrolled on {formatDate(enrollment.enrolled_at)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/enrollments/orders">View all orders</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Course Summary Tab: compact enrolled courses */}
                <TabsContent value="courses" className="space-y-6">
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle>Course Summary</CardTitle>
                      <CardDescription>
                        Courses and instances you are enrolled in
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {courseEnrollments.filter(e => e.status === "enrolled").length === 0 ? (
                        <div className="text-center py-12">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground mb-4">No enrolled courses</p>
                          <Button asChild>
                            <Link href="/course-catalog">Browse Courses</Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {courseEnrollments
                            .filter(e => e.status === "enrolled")
                            .map((enrollment) => {
                              const courseName = enrollment.instance?.offering?.name || enrollment.instance?.assignment?.course?.name || "Course"
                              const category = enrollment.instance?.assignment?.category?.display_name || enrollment.instance?.assignment?.category?.name || ""
                              const startDate = enrollment.instance?.start_date
                              const endDate = enrollment.instance?.end_date
                              const location = enrollment.instance?.assignment?.location?.name || enrollment.instance?.location?.name
                              return (
                                <div
                                  key={enrollment.id}
                                  className="flex flex-col p-4 rounded-lg border bg-muted/30 hover:bg-muted/50"
                                >
                                  <p className="font-medium">{courseName}</p>
                                  {category && <p className="text-xs text-muted-foreground">{category}</p>}
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {startDate && endDate && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(startDate)} – {formatDate(endDate)}
                                      </span>
                                    )}
                                    {location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {location}
                                      </span>
                                    )}
                                  </div>
                                  <Button variant="outline" size="sm" className="mt-3 w-fit" asChild>
                                    <Link href="/enrollments/orders">View order</Link>
                                  </Button>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Payment Methods Tab */}
                <TabsContent value="payment" className="space-y-6">
                  {/* Credits inline */}
                  {credits.length > 0 && (
                    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle>Available Credits</CardTitle>
                        <CardDescription>Credits you can apply to future enrollments</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {credits.map((c: any) => (
                            <div key={c.id} className="flex justify-between items-center p-3 rounded-lg border">
                              <span className="text-sm">{c.description || "Credit"}</span>
                              <span className="font-medium">${(c.available_amount ?? c.amount ?? 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" asChild className="mt-3">
                          <Link href="/enrollments/credits">View all credits</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Payment Methods</CardTitle>
                      <CardDescription>
                        Manage your payment methods and billing information
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => setIsAddPaymentMethodOpen(true)}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Add Payment Method
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No payment methods added</p>
                      <Button onClick={() => setIsAddPaymentMethodOpen(true)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Add Payment Method
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentMethods.map((method) => (
                        <Card key={method.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {getCardBrandDisplay(method)} 
                                      {getCardLast4(method) && ` •••• ${getCardLast4(method)}`}
                                    </p>
                                    {method.is_default && (
                                      <Badge variant="outline" className="text-xs">
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                  {getCardExpiry(method) && (
                                    <p className="text-sm text-muted-foreground">
                                      Expires {getCardExpiry(method)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {!method.is_default && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSetDefaultPaymentMethod(method.id)}
                                    disabled={isSettingDefault === method.id}
                                  >
                                    {isSettingDefault === method.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Star className="mr-2 h-4 w-4" />
                                        Set as Default
                                      </>
                                    )}
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRemovePaymentMethod(method.id)}
                                  disabled={isRemovingPaymentMethod === method.id}
                                >
                                  {isRemovingPaymentMethod === method.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

                  {/* Billing History */}
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>
                    View your payment history and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {billingHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No billing history available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {billingHistory.map((record) => (
                        <div
                          key={record.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">
                                  {record.course?.name || 'Unknown Course'}
                                </h4>
                                <Badge
                                  variant={
                                    record.payment_status === 'paid'
                                      ? 'default'
                                      : record.payment_status === 'refunded'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                >
                                  {record.payment_status === 'paid' ? 'Paid' : 'Refunded'}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {record.category && (
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    <span>{record.category.display_name || record.category.name}</span>
                                  </div>
                                )}
                                {record.series && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{record.series.display_name || record.series.name}</span>
                                  </div>
                                )}
                                {record.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{record.location.name}</span>
                                  </div>
                                )}
                                {record.instance?.start_date && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {new Date(record.instance.start_date).toLocaleDateString()}
                                      {record.instance.start_time && ` ${record.instance.start_time}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {record.payment_transaction_id && (
                                <p className="text-xs text-muted-foreground">
                                  Transaction ID: {record.payment_transaction_id}
                                </p>
                              )}
                            </div>
                            <div className="text-right space-y-2">
                              <p className="font-semibold text-lg">
                                {record.currency} ${record.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(record.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <div className="flex gap-2 justify-end mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewInvoice(record.id)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Invoice
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleSendInvoice(record.id)}
                                  disabled={sendingInvoiceIds.has(record.id)}
                                >
                                  {sendingInvoiceIds.has(record.id) ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="mr-2 h-4 w-4" />
                                      Send Invoice
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
                </TabsContent>

                {/* Student Progress Tab: only students with can_view_progress */}
                <TabsContent value="progress" className="space-y-6">
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle>Student Progress</CardTitle>
                      <CardDescription>
                        View learning progress and reports for students you have permission to see
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const studentsWithProgress = students.filter((s) => s.can_view_progress)
                        if (studentsWithProgress.length === 0) {
                          return (
                            <div className="text-center py-12">
                              <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground mb-2">
                                You don&apos;t have permission to view progress for any students yet.
                              </p>
                              <p className="text-sm text-muted-foreground mb-4">
                                When you add or edit a student on your Profile, you can enable &quot;View progress&quot; for that student.
                              </p>
                              <Button variant="outline" asChild>
                                <Link href="/profile">Manage students on Profile</Link>
                              </Button>
                            </div>
                          )
                        }
                        return (
                          <div className="space-y-4">
                            {studentsWithProgress.map((student) => (
                              <div
                                key={student.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Progress and reports will appear here when available
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/enrollments/orders?student=${encodeURIComponent(student.id)}`}>
                                      View orders
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Your Students */}
            {students.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Your Students
                </h3>
                <ul className="space-y-2 mb-3">
                  {students.slice(0, 5).map((s) => (
                    <li key={s.id} className="text-sm text-slate-700 dark:text-slate-300">
                      {s.name}
                    </li>
                  ))}
                  {students.length > 5 && <li className="text-xs text-muted-foreground">+{students.length - 5} more</li>}
                </ul>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/profile">Manage on Profile</Link>
                </Button>
              </div>
            )}

            {/* Schedule Card */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                This Week's Schedule
              </h3>
              <div className="space-y-4">
                {courseEnrollments
                  .filter(e => e.status === 'enrolled' && e.instance?.start_date)
                  .slice(0, 2)
                  .map((enrollment) => {
                    const startDate = enrollment.instance?.start_date
                    const startTime = enrollment.instance?.start_time
                    const courseName = enrollment.instance?.offering?.name || enrollment.instance?.assignment?.course?.name || 'Course'
                    const location = enrollment.instance?.assignment?.location?.name || enrollment.instance?.location?.name || 'Location'
                    
                    if (!startDate) return null
                    
                    const date = new Date(startDate)
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
                    const time = startTime ? formatTime(startTime) : ''
                    
                    return (
                      <div key={enrollment.id} className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase mb-1">
                          {dayName}{time ? ` • ${time}` : ''}
                        </p>
                        <p className="font-bold text-slate-900 dark:text-white">{courseName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{location}</p>
                      </div>
                    )
                  })}
                {courseEnrollments.filter(e => e.status === 'enrolled' && e.instance?.start_date).length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    No scheduled classes this week
                  </p>
                )}
              </div>
              <button 
                onClick={() => {
                  const enrollmentsTab = document.querySelector('[value="enrollments"]') as HTMLElement
                  enrollmentsTab?.click()
                }}
                className="w-full mt-6 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
              >
                View Full Calendar &rarr;
              </button>
            </div>

            {/* Promo Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 dark:from-indigo-700 dark:to-blue-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <h3 className="text-xl font-bold mb-2">Summer 2026</h3>
              <p className="text-blue-100 text-sm mb-6">Early bird registration is now open for current families!</p>
              <button 
                onClick={() => router.push('/programs')}
                className="bg-white text-blue-600 w-full py-3 rounded-xl font-bold text-sm hover:scale-105 transition-all"
              >
                Browse Camps
              </button>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 移动端：使用移动端布局
  if (isReady && isNative) {
    return (
      <MobileLayout>
        {content}
        <AddPaymentMethodDialog
          open={isAddPaymentMethodOpen}
          onOpenChange={setIsAddPaymentMethodOpen}
          onSuccess={handleAddPaymentMethodSuccess}
        />
      </MobileLayout>
    );
  }

  // Web 端：使用完整布局
  return (
    <>
      <Navbar />
      <div className="pt-14">
        {content}
        <AddPaymentMethodDialog
          open={isAddPaymentMethodOpen}
          onOpenChange={setIsAddPaymentMethodOpen}
          onSuccess={handleAddPaymentMethodSuccess}
        />

      {/* Invoice Dialog */}
      <Dialog open={viewingInvoiceId !== null} onOpenChange={(open) => {
        if (!open) {
          setViewingInvoiceId(null)
          setInvoiceData(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
            <DialogDescription>
              Payment receipt and invoice details
            </DialogDescription>
          </DialogHeader>
          {invoiceData ? (
            <div className="space-y-6 py-4">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-2xl font-bold">Invoice</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Invoice #: {invoiceData.invoice_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{invoiceData.date}</p>
                  {invoiceData.payment_date && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2">Payment Date</p>
                      <p className="font-medium">{invoiceData.payment_date}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Bill To:</h4>
                  <p className="text-sm">{invoiceData.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{invoiceData.customer.email}</p>
                </div>
                {invoiceData.location && (
                  <div>
                    <h4 className="font-semibold mb-2">Location:</h4>
                    <p className="text-sm">{invoiceData.location.name}</p>
                    <p className="text-sm text-muted-foreground">{invoiceData.location.address}</p>
                  </div>
                )}
              </div>

              {/* Course Details */}
              {invoiceData.course && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2">Course Details</h4>
                  <p className="font-medium">{invoiceData.course.name}</p>
                  {invoiceData.course.description && (
                    <p className="text-sm text-muted-foreground mt-1">{invoiceData.course.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    {invoiceData.category && (
                      <div>
                        <span className="text-muted-foreground">Category: </span>
                        <span>{invoiceData.category.name}</span>
                      </div>
                    )}
                    {invoiceData.series && (
                      <div>
                        <span className="text-muted-foreground">Series: </span>
                        <span>{invoiceData.series.name}</span>
                      </div>
                    )}
                    {invoiceData.instance?.start_date && (
                      <div>
                        <span className="text-muted-foreground">Start Date: </span>
                        <span>{new Date(invoiceData.instance.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-semibold">Description</th>
                      <th className="text-right p-3 font-semibold">Quantity</th>
                      <th className="text-right p-3 font-semibold">Unit Price</th>
                      <th className="text-right p-3 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item: any, index: number) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{item.description}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">
                          {invoiceData.currency} ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {invoiceData.currency} ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  {invoiceData.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>{invoiceData.currency} ${invoiceData.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{invoiceData.currency} ${invoiceData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <Badge
                    variant={
                      invoiceData.payment_status === 'paid'
                        ? 'default'
                        : invoiceData.payment_status === 'refunded'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="mt-1"
                  >
                    {invoiceData.payment_status === 'paid' ? 'Paid' : 'Refunded'}
                  </Badge>
                </div>
                {invoiceData.stripe_receipt_url && (
                  <Button
                    variant="outline"
                    asChild
                  >
                    <a
                      href={invoiceData.stripe_receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Stripe Receipt
                    </a>
                  </Button>
                )}
              </div>

              {/* Transaction ID */}
              {invoiceData.payment_transaction_id && (
                <div className="text-xs text-muted-foreground border-t pt-4">
                  Transaction ID: {invoiceData.payment_transaction_id}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
      <Footer />
    </>
  );
}

