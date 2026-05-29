'use client'

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { 
  Loader2, 
  Users, 
  UserCheck, 
  Shield, 
  UserPlus,
  BookOpen, 
  CheckCircle2, 
  FileText, 
  Archive,
  Calendar,
  Clock,
  PlayCircle,
  CheckCircle,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertCircle,
  Plus,
  BarChart3,
  ArrowRight,
  Mail,
  Clock as ClockIcon,
  PieChart,
  Building2,
  CalendarDays,
  Layers,
  MessageSquareQuote,
  CircleHelp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminActionVerb, adminLabel, adminManage } from "@/lib/admin-ui-labels"
import { ADMIN_ENROLLMENTS_ENABLED } from "@/lib/admin-features"
import { cn } from "@/lib/utils"

// Lazy-loaded section types (match API responses)
type UsersStats = {
  total: number
  verified: number
  admins: number
  coaches: number
  newToday: number
}
type CoursesStats = {
  total: number
  published: number
  draft: number
  suspended: number
  archived: number
  totalInstances: number
  activeInstances: number
  scheduledInstances: number
  ongoingInstances: number
  completedInstances: number
}
type TrafficStats = {
  visits: { total: number; mom_change: number; mom_change_type: string }
  bounce_rate: { value: number; mom_change: number; mom_change_type: string }
  unique_visitors: { total: number; mom_change: number; mom_change_type: string }
  pageviews: { total: number; mom_change: number; mom_change_type: string }
  period: { start: string; end: string }
}
type RevenueStats = { total: number; monthly: number; pending: number }
type RecentActivityStats = {
  newUsers: Array<{ id: string; name: string; email: string; created_at: string }>
  newCourses: Array<{ id: string; name: string; status: string; created_at: string }>
  recentEnrollments: Array<{ id: string; user_name: string; course_name: string; status: string; created_at: string }>
}

/** Mock revenue analytics — hidden until backed by real API data */
const SHOW_MOCK_REVENUE_ANALYTICS = false

const QUICK_ACTIONS: Array<{
  href: string
  title: string
  hint: string
  icon: LucideIcon
  featured?: boolean
}> = [
  {
    href: "/admin/blaze/programs",
    title: adminActionVerb("Add", "program"),
    hint: "Create or edit activities (programs) in the catalog hierarchy.",
    icon: Plus,
    featured: true,
  },
  {
    href: "/admin/users",
    title: "Create New User",
    hint: "Add a parent, coach, or admin account with login access.",
    icon: UserPlus,
  },
  {
    href: "/admin/blaze/instance",
    title: adminManage("instance"),
    hint: "View and edit session schedules, capacity, and offering links.",
    icon: CalendarDays,
  },
  {
    href: "/admin/blaze/franchises",
    title: adminManage("franchise"),
    hint: "Configure campus branding, contact details, and marketing settings.",
    icon: Building2,
  },
  {
    href: "/admin/blaze/resources",
    title: "Manage Resources",
    hint: "Upload and organize files shown on the public resources page.",
    icon: FileText,
  },
  {
    href: "/admin/testimonials",
    title: "Manage Testimonials",
    hint: "Add or edit parent quotes on the home page and campus pages.",
    icon: MessageSquareQuote,
  },
]

// Mock 收入数据
const mockRevenueData = {
  totalRevenue: 125000,
  weeklyRevenue: [
    { date: 'Mon', revenue: 3200 },
    { date: 'Tue', revenue: 4100 },
    { date: 'Wed', revenue: 2800 },
    { date: 'Thu', revenue: 3500 },
    { date: 'Fri', revenue: 4800 },
    { date: 'Sat', revenue: 5200 },
    { date: 'Sun', revenue: 3900 },
  ],
  franchiseRevenue: [
    { name: 'Bellevue', revenue: 45000, color: '#10b981' },
    { name: 'Sammamish', revenue: 38000, color: '#3b82f6' },
    { name: 'Issaquah', revenue: 28000, color: '#8b5cf6' },
    { name: 'Cherrycrest', revenue: 14000, color: '#f59e0b' },
  ],
}

function useLazySection<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchSection = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(`Error fetching ${url}:`, err)
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [url])
  useEffect(() => {
    fetchSection()
  }, [fetchSection])
  return { data, loading, error, refetch: fetchSection }
}

export default function AdminDashboardPage() {
  const usersSection = useLazySection<UsersStats>("/api/admin/stats/users")
  const coursesSection = useLazySection<CoursesStats>("/api/admin/stats/courses")
  const trafficSection = useLazySection<TrafficStats>("/api/admin/traffic/summary?period=last_30_days")
  const revenueSection = useLazySection<RevenueStats>("/api/admin/stats/revenue")
  const recentActivitySection = useLazySection<RecentActivityStats>("/api/admin/stats/recent-activity")

  const formatTrafficNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatMomChange = (change: number, changeType: string) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        changeType === "increase" ? "text-red-600" : "text-green-600"
      )}
    >
      {changeType === "increase" ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {change > 0 ? "+" : ""}
      {change}% mo/mo
    </span>
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      enrolled: "default",
      reserved: "secondary",
      cart: "outline",
      waitlisted: "secondary",
      completed: "default",
      cancelled: "destructive",
      expired: "outline",
      published: "default",
      draft: "secondary",
      suspended: "destructive",
      archived: "outline",
    }
    return variants[status] || "outline"
  }

  const renderProgramStatusBadge = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized === "published") {
      return (
        <Badge
          title="Published"
          className="h-5 min-w-5 shrink-0 justify-center rounded px-1 text-[10px] font-bold bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
        >
          P
        </Badge>
      )
    }
    if (normalized === "draft") {
      return (
        <Badge
          title="Draft"
          className="h-5 min-w-5 shrink-0 justify-center rounded px-1 text-[10px] font-bold bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
        >
          D
        </Badge>
      )
    }
    return (
      <Badge variant={getStatusBadge(status)} className="shrink-0 text-[10px] px-1.5">
        {status.charAt(0).toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50/30 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to the admin panel. Manage your application from here.
        </p>
      </div>

      {/* 统计卡片 - 2x2 网格布局，每块独立懒加载 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 用户统计卡片 */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">User Statistics</h3>
              <p className="text-sm text-gray-500">System user overview</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          {usersSection.loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          {usersSection.error && (
            <div className="py-4">
              <p className="text-sm text-destructive mb-2">{usersSection.error}</p>
              <Button size="sm" variant="outline" onClick={usersSection.refetch}>Retry</Button>
            </div>
          )}
          {!usersSection.loading && !usersSection.error && usersSection.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{usersSection.data.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-xl font-semibold text-green-600 mt-1">{usersSection.data.verified}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-500">Admins</p>
                  <p className="text-lg font-semibold text-gray-900">{usersSection.data.admins}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Coaches</p>
                  <p className="text-lg font-semibold text-gray-900">{usersSection.data.coaches}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">New Today</p>
                  <p className="text-lg font-semibold text-primary">{usersSection.data.newToday}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Activity & session statistics */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{adminLabel("instance", { plural: true })} Statistics</h3>
              <p className="text-sm text-gray-500">
                {adminLabel("program", { plural: true })} and scheduled {adminLabel("instance", { plural: true }).toLowerCase()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Layers className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          {coursesSection.loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          {coursesSection.error && (
            <div className="py-4">
              <p className="text-sm text-destructive mb-2">{coursesSection.error}</p>
              <Button size="sm" variant="outline" onClick={coursesSection.refetch}>Retry</Button>
            </div>
          )}
          {!coursesSection.loading && !coursesSection.error && coursesSection.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total {adminLabel("program", { plural: true })}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{coursesSection.data.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Active {adminLabel("program", { plural: true })}</p>
                  <p className="text-xl font-semibold text-green-600 mt-1">{coursesSection.data.published}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-500">Total {adminLabel("instance", { plural: true })}</p>
                  <p className="text-lg font-semibold text-gray-900">{coursesSection.data.totalInstances}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active {adminLabel("instance", { plural: true })}</p>
                  <p className="text-lg font-semibold text-blue-600">{coursesSection.data.activeInstances}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ongoing</p>
                  <p className="text-lg font-semibold text-orange-600">{coursesSection.data.ongoingInstances}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Traffic statistics */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Traffic Statistics</h3>
              <p className="text-sm text-gray-500">Website traffic overview (last 30 days)</p>
            </div>
            <div className="p-3 bg-cyan-100 rounded-full">
              <Eye className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
          {trafficSection.loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          {trafficSection.error && (
            <div className="py-4">
              <p className="text-sm text-destructive mb-2">{trafficSection.error}</p>
              <Button size="sm" variant="outline" onClick={trafficSection.refetch}>Retry</Button>
            </div>
          )}
          {!trafficSection.loading && !trafficSection.error && trafficSection.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Visits</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatTrafficNumber(trafficSection.data.visits.total)}
                  </p>
                  <div className="mt-1">
                    {formatMomChange(
                      trafficSection.data.visits.mom_change,
                      trafficSection.data.visits.mom_change_type
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Unique Visitors</p>
                  <p className="text-xl font-semibold text-green-600 mt-1">
                    {formatTrafficNumber(trafficSection.data.unique_visitors.total)}
                  </p>
                  <div className="mt-1 flex justify-end">
                    {formatMomChange(
                      trafficSection.data.unique_visitors.mom_change,
                      trafficSection.data.unique_visitors.mom_change_type
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-500">Pageviews</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTrafficNumber(trafficSection.data.pageviews.total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Bounce Rate</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {trafficSection.data.bounce_rate.value.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pageviews MoM</p>
                  <div className="mt-1">
                    {formatMomChange(
                      trafficSection.data.pageviews.mom_change,
                      trafficSection.data.pageviews.mom_change_type
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary/80" asChild>
                <Link href="/admin/traffic">
                  View Traffic Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </Card>

        {/* 收入统计卡片或快速操作卡片 */}
        {revenueSection.loading && (
          <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Revenue Statistics</h3>
                <p className="text-sm text-gray-500">Financial overview</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          </Card>
        )}
        {revenueSection.error && (
          <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Revenue Statistics</h3>
                <p className="text-sm text-gray-500">Financial overview</p>
              </div>
            </div>
            <p className="text-sm text-destructive mb-2">{revenueSection.error}</p>
            <Button size="sm" variant="outline" onClick={revenueSection.refetch}>Retry</Button>
          </Card>
        )}
        {!revenueSection.loading && !revenueSection.error && revenueSection.data && (revenueSection.data.total > 0 || revenueSection.data.monthly > 0 || revenueSection.data.pending > 0) && (
          <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Revenue Statistics</h3>
                <p className="text-sm text-gray-500">Financial overview</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(revenueSection.data.total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-xl font-semibold text-green-600 mt-1">{formatCurrency(revenueSection.data.monthly)}</p>
                </div>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500 mb-1">Pending Payments</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(revenueSection.data.pending)}</p>
              </div>
            </div>
          </Card>
        )}
        {!revenueSection.loading && !revenueSection.error && revenueSection.data && revenueSection.data.total === 0 && revenueSection.data.monthly === 0 && revenueSection.data.pending === 0 && (
          <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">System Overview</h3>
                <p className="text-sm text-gray-500">Quick insights</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Draft {adminLabel("program", { plural: true })}</p>
                  <p className="text-lg font-semibold text-gray-900">{coursesSection.data?.draft ?? 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Pageviews (30d)</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTrafficNumber(trafficSection.data?.pageviews.total ?? 0)}
                  </p>
                </div>
              </div>
              <Button asChild className="w-full justify-start bg-primary hover:bg-primary/90 text-white">
                <Link href="/admin/blaze/programs">
                  <Plus className="mr-2 h-4 w-4" />
                  {adminActionVerb("Add", "program")}
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* 收入统计图表卡片（Mock Data） — hidden until real API */}
      {SHOW_MOCK_REVENUE_ANALYTICS && (
      <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <PieChart className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-800">Revenue Analytics</h3>
              <Badge variant="secondary" className="text-xs font-medium">Mock Data</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Revenue overview and breakdown — sample data only</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 总收入概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(mockRevenueData.totalRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">This Week</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(mockRevenueData.weeklyRevenue.reduce((sum: number, day: { revenue: number }) => sum + day.revenue, 0))}
              </p>
              <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Average Daily</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(
                  mockRevenueData.weeklyRevenue.reduce((sum: number, day: { revenue: number }) => sum + day.revenue, 0) / 7
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">This week</p>
            </div>
          </div>

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 近一周收入趋势图 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Weekly Revenue Trend</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mockRevenueData.weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 分 Franchise 收入饼图 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Franchise</h4>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={mockRevenueData.franchiseRevenue}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {mockRevenueData.franchiseRevenue.map((entry: { name: string; revenue: number; color: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => value}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Franchise 收入详情表格 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Franchise Revenue Details</h4>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200">
                <div className="font-semibold text-sm text-gray-700">Franchise</div>
                <div className="font-semibold text-sm text-gray-700 text-right">Revenue</div>
                <div className="font-semibold text-sm text-gray-700 text-right">Percentage</div>
                <div className="font-semibold text-sm text-gray-700 text-right">Trend</div>
              </div>
              {mockRevenueData.franchiseRevenue
                .sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue)
                .map((franchise: { name: string; revenue: number; color: string }, index: number) => {
                  const percentage = (franchise.revenue / mockRevenueData.totalRevenue) * 100
                  return (
                    <div 
                      key={franchise.name}
                      className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: franchise.color }}
                        />
                        <span className="font-medium text-sm text-gray-900">{franchise.name}</span>
                      </div>
                      <div className="text-right font-semibold text-sm text-gray-900">
                        {formatCurrency(franchise.revenue)}
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        {percentage.toFixed(1)}%
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 text-xs">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="text-green-600 font-medium">
                            +{Math.floor(Math.random() * 15 + 5)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </Card>
      )}

      {/* 最近活动和快速操作 - 2x2 网格布局 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 最近活动卡片 */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
              <p className="text-sm text-gray-500">Latest system activities</p>
            </div>
          </div>
          {recentActivitySection.loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          {recentActivitySection.error && (
            <div className="py-4">
              <p className="text-sm text-destructive mb-2">{recentActivitySection.error}</p>
              <Button size="sm" variant="outline" onClick={recentActivitySection.refetch}>Retry</Button>
            </div>
          )}
          {!recentActivitySection.loading && !recentActivitySection.error && recentActivitySection.data && (
          <div className="space-y-4">
            {/* 最近注册的用户 */}
            {recentActivitySection.data.newUsers && recentActivitySection.data.newUsers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                  <UserPlus className="h-4 w-4" />
                  New Users
                </h4>
                <div className="space-y-2">
                  {recentActivitySection.data.newUsers.slice(0, 3).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full text-primary hover:text-primary/80" asChild>
                  <Link href="/admin/users">
                    View All Users
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {/* 最近创建的课程 */}
            {recentActivitySection.data.newCourses && recentActivitySection.data.newCourses.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                  <BookOpen className="h-4 w-4" />
                  New {adminLabel("program", { plural: true })}
                </h4>
                <div className="space-y-1.5">
                  {recentActivitySection.data.newCourses.slice(0, 3).map((program) => (
                    <div
                      key={program.id}
                      className="flex flex-col gap-1 rounded-lg p-2 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-2"
                    >
                      {renderProgramStatusBadge(program.status)}
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-900">
                        {program.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {new Date(program.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full text-primary hover:text-primary/80" asChild>
                  <Link href="/admin/blaze/programs">
                    View All {adminLabel("program", { plural: true })}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {/* 最近的报名记录 */}
            {ADMIN_ENROLLMENTS_ENABLED &&
              recentActivitySection.data.recentEnrollments &&
              recentActivitySection.data.recentEnrollments.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                  <ShoppingCart className="h-4 w-4" />
                  Recent Enrollments
                </h4>
                <div className="space-y-2">
                  {recentActivitySection.data.recentEnrollments.slice(0, 5).map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium text-sm text-gray-900 truncate">{enrollment.user_name}</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-sm text-gray-600 truncate">{enrollment.course_name}</span>
                        <Badge variant={getStatusBadge(enrollment.status)} className="text-xs shrink-0">
                          {enrollment.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                        {new Date(enrollment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full text-primary hover:text-primary/80" asChild>
                  <Link href="/admin/enrollments">
                    View All Enrollments
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
          )}
        </Card>

        {/* 快速操作卡片 */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
              <p className="text-sm text-gray-500">Common administrative tasks</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <div key={action.href} className="relative">
                  <Link
                    href={action.href}
                    className={cn(
                      "group flex flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center transition-colors hover:bg-gray-50",
                      action.featured
                        ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        action.featured ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                      )}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium leading-snug",
                        action.featured ? "text-primary" : "text-gray-800"
                      )}
                    >
                      {action.title}
                    </span>
                  </Link>
                  <div className="absolute top-2 right-2 group/hint">
                    <button
                      type="button"
                      title={action.hint}
                      aria-label={action.hint}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    >
                      <CircleHelp className="h-3.5 w-3.5" strokeWidth={1} />
                    </button>
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute top-full right-0 z-20 mt-1.5 hidden w-52 rounded-md border border-border bg-popover px-2.5 py-1.5 text-left text-xs leading-relaxed text-popover-foreground shadow-md group-hover/hint:block"
                    >
                      {action.hint}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
