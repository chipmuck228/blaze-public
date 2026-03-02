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
  AlertCircle,
  Plus,
  BarChart3,
  ArrowRight,
  Mail,
  Clock as ClockIcon,
  PieChart
} from "lucide-react"
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
type EnrollmentsStats = {
  total: number
  active: number
  enrolled: number
  reserved: number
  cart: number
  waitlisted: number
  completed: number
  cancelled: number
  expired: number
}
type RevenueStats = { total: number; monthly: number; pending: number }
type RecentActivityStats = {
  newUsers: Array<{ id: string; name: string; email: string; created_at: string }>
  newCourses: Array<{ id: string; name: string; status: string; created_at: string }>
  recentEnrollments: Array<{ id: string; user_name: string; course_name: string; status: string; created_at: string }>
}

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
  const enrollmentsSection = useLazySection<EnrollmentsStats>("/api/admin/stats/enrollments")
  const revenueSection = useLazySection<RevenueStats>("/api/admin/stats/revenue")
  const recentActivitySection = useLazySection<RecentActivityStats>("/api/admin/stats/recent-activity")

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50/30 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the admin panel. Manage your application from here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/blaze/programs">
              <Plus className="mr-2 h-4 w-4" />
              Add Program
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <UserPlus className="mr-2 h-4 w-4" />
              New User
            </Link>
          </Button>
        </div>
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

        {/* Instance 统计卡片 */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Instance Statistics</h3>
              <p className="text-sm text-gray-500">Programs and scheduled instances</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BookOpen className="h-6 w-6 text-purple-600" />
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
                  <p className="text-sm text-gray-600">Total Programs</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{coursesSection.data.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Active Programs</p>
                  <p className="text-xl font-semibold text-green-600 mt-1">{coursesSection.data.published}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-500">Total Instances</p>
                  <p className="text-lg font-semibold text-gray-900">{coursesSection.data.totalInstances}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active Instances</p>
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

        {/* 报名统计卡片 */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Enrollment Statistics</h3>
              <p className="text-sm text-gray-500">Registration overview</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          {enrollmentsSection.loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          {enrollmentsSection.error && (
            <div className="py-4">
              <p className="text-sm text-destructive mb-2">{enrollmentsSection.error}</p>
              <Button size="sm" variant="outline" onClick={enrollmentsSection.refetch}>Retry</Button>
            </div>
          )}
          {!enrollmentsSection.loading && !enrollmentsSection.error && enrollmentsSection.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Enrollments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{enrollmentsSection.data.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-xl font-semibold text-green-600 mt-1">{enrollmentsSection.data.active}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-500">Enrolled</p>
                  <p className="text-lg font-semibold text-gray-900">{enrollmentsSection.data.enrolled}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Waitlist</p>
                  <p className="text-lg font-semibold text-yellow-600">{enrollmentsSection.data.waitlisted}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-lg font-semibold text-blue-600">{enrollmentsSection.data.completed}</p>
                </div>
              </div>
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
                  <p className="text-xs text-gray-500">Draft Programs</p>
                  <p className="text-lg font-semibold text-gray-900">{coursesSection.data?.draft ?? 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Cart Items</p>
                  <p className="text-lg font-semibold text-gray-900">{enrollmentsSection.data?.cart ?? 0}</p>
                </div>
              </div>
              <Button asChild className="w-full justify-start bg-primary hover:bg-primary/90 text-white">
                <Link href="/admin/blaze/programs">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Program
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* 收入统计图表卡片（Mock Data） */}
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
                  New Programs
                </h4>
                <div className="space-y-2">
                  {recentActivitySection.data.newCourses.slice(0, 3).map((program) => (
                    <div key={program.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{program.name}</span>
                        <Badge variant={getStatusBadge(program.status)} className="text-xs">
                          {program.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(program.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full text-primary hover:text-primary/80" asChild>
                  <Link href="/admin/blaze/programs">
                    View All Programs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {/* 最近的报名记录 */}
            {recentActivitySection.data.recentEnrollments && recentActivitySection.data.recentEnrollments.length > 0 && (
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
          <div className="space-y-2">
            <Button asChild className="w-full justify-start bg-primary hover:bg-primary/90 text-white">
              <Link href="/admin/blaze/programs">
                <Plus className="mr-2 h-4 w-4" />
                Add Program
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
              <Link href="/admin/users">
                <UserPlus className="mr-2 h-4 w-4" />
                Create New User
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
              <Link href="/admin/enrollments">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Manage Enrollments
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
              <Link href="/admin/blaze/instance">
                <Calendar className="mr-2 h-4 w-4" />
                Manage Instances
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
              <Link href="/admin/blaze/franchises">
                <BarChart3 className="mr-2 h-4 w-4" />
                Manage Franchises
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
              <Link href="/admin/learning-paths">
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Learning Paths
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
