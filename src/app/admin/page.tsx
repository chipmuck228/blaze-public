'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

interface AdminStats {
  users: {
    total: number
    verified: number
    admins: number
    coaches: number
    newToday: number
  }
  courses: {
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
  enrollments: {
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
  revenue: {
    total: number
    monthly: number
    pending: number
  }
  recentActivity: {
    newUsers: Array<{ id: string; name: string; email: string; created_at: string }>
    newCourses: Array<{ id: string; name: string; status: string; created_at: string }>
    recentEnrollments: Array<{ id: string; user_name: string; course_name: string; status: string; created_at: string }>
  }
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

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/stats")
      
      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error("Error fetching stats:", err)
      setError("Failed to load statistics")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

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

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the admin panel. Manage your application from here.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the admin panel. Manage your application from here.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchStats} className="mt-4" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
            <Link href="/admin/courses">
              <Plus className="mr-2 h-4 w-4" />
              New Course
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

      {/* 统计卡片 - 2x2 网格布局 */}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.users.total ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-xl font-semibold text-green-600 mt-1">{stats?.users.verified ?? 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
              <div>
                <p className="text-xs text-gray-500">Admins</p>
                <p className="text-lg font-semibold text-gray-900">{stats?.users.admins ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Coaches</p>
                <p className="text-lg font-semibold text-gray-900">{stats?.users.coaches ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">New Today</p>
                <p className="text-lg font-semibold text-primary">{stats?.users.newToday ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 课程统计卡片 */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Course Statistics</h3>
              <p className="text-sm text-gray-500">Courses and sessions</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.courses.total ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-xl font-semibold text-green-600 mt-1">{stats?.courses.published ?? 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
              <div>
                <p className="text-xs text-gray-500">Instances</p>
                <p className="text-lg font-semibold text-gray-900">{stats?.courses.totalInstances ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-lg font-semibold text-blue-600">{stats?.courses.activeInstances ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ongoing</p>
                <p className="text-lg font-semibold text-orange-600">{stats?.courses.ongoingInstances ?? 0}</p>
              </div>
            </div>
          </div>
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.enrollments.total ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-semibold text-green-600 mt-1">{stats?.enrollments.active ?? 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
              <div>
                <p className="text-xs text-gray-500">Enrolled</p>
                <p className="text-lg font-semibold text-gray-900">{stats?.enrollments.enrolled ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Waitlist</p>
                <p className="text-lg font-semibold text-yellow-600">{stats?.enrollments.waitlisted ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-lg font-semibold text-blue-600">{stats?.enrollments.completed ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 收入统计卡片或快速操作卡片 */}
        {stats && (stats.revenue.total > 0 || stats.revenue.monthly > 0 || stats.revenue.pending > 0) ? (
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
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.revenue.total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-xl font-semibold text-green-600 mt-1">{formatCurrency(stats.revenue.monthly)}</p>
                </div>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500 mb-1">Pending Payments</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(stats.revenue.pending)}</p>
              </div>
            </div>
          </Card>
        ) : (
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
                  <p className="text-xs text-gray-500">Draft Courses</p>
                  <p className="text-lg font-semibold text-gray-900">{stats?.courses.draft ?? 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Cart Items</p>
                  <p className="text-lg font-semibold text-gray-900">{stats?.enrollments.cart ?? 0}</p>
                </div>
              </div>
              <Button asChild className="w-full justify-start bg-primary hover:bg-primary/90 text-white">
                <Link href="/admin/courses">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Course
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* 收入统计图表卡片 */}
      <Card className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <PieChart className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Revenue Analytics</h3>
            <p className="text-sm text-gray-500">Revenue overview and breakdown</p>
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
          <div className="space-y-4">
            {/* 最近注册的用户 */}
            {stats?.recentActivity.newUsers && stats.recentActivity.newUsers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                  <UserPlus className="h-4 w-4" />
                  New Users
                </h4>
                <div className="space-y-2">
                  {stats.recentActivity.newUsers.slice(0, 3).map((user) => (
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
            {stats?.recentActivity.newCourses && stats.recentActivity.newCourses.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                  <BookOpen className="h-4 w-4" />
                  New Courses
                </h4>
                <div className="space-y-2">
                  {stats.recentActivity.newCourses.slice(0, 3).map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{course.name}</span>
                        <Badge variant={getStatusBadge(course.status)} className="text-xs">
                          {course.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(course.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full text-primary hover:text-primary/80" asChild>
                  <Link href="/admin/courses">
                    View All Courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {/* 最近的报名记录 */}
            {stats?.recentActivity.recentEnrollments && stats.recentActivity.recentEnrollments.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                  <ShoppingCart className="h-4 w-4" />
                  Recent Enrollments
                </h4>
                <div className="space-y-2">
                  {stats.recentActivity.recentEnrollments.slice(0, 5).map((enrollment) => (
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
              <Link href="/admin/courses">
                <Plus className="mr-2 h-4 w-4" />
                Create New Course
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
              <Link href="/admin/instances">
                <Calendar className="mr-2 h-4 w-4" />
                Manage Instances
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
              <Link href="/admin/franchises">
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
