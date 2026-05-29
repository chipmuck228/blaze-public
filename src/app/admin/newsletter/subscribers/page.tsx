'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Loader2, Trash2, BarChart3, TrendingDown } from "lucide-react"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { DateRangePicker } from "@/components/admin/traffic/DateRangePicker"

interface Subscriber {
  id: string
  email: string
  subscribed_at: string
  is_active: boolean
  unsubscribed_at: string | null
}

interface StatisticsData {
  overview: {
    total_campaigns: number
    sent_campaigns: number
    scheduled_campaigns: number
    failed_campaigns: number
    total_recipients: number
    total_sent: number
    total_failed: number
    success_rate: number
  }
  sends: {
    total: number
    sent: number
    failed: number
    pending: number
    bounced: number
  }
  daily_stats: Array<{
    date: string
    campaigns: number
    sent: number
    failed: number
    recipients: number
  }>
  template_stats: Array<{
    template_id: string
    template_name: string
    campaigns: number
    sent: number
    failed: number
    recipients: number
  }>
}

interface UnsubscribeStatsData {
  overview: {
    total_subscribers: number
    active_subscribers: number
    unsubscribed_count: number
    unsubscribe_rate: number
  }
  daily_stats: Array<{
    date: string
    subscribed: number
    unsubscribed: number
    net_growth: number
  }>
  period_stats: {
    last_7_days: number
    last_30_days: number
    last_90_days: number
  }
}

type DateRangeValue = {
  type: 'preset' | 'custom'
  preset?: 'last_7_days' | 'last_30_days' | 'last_90_days'
  startDate?: string
  endDate?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function NewsletterSubscribersPage() {
  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 20

  // Statistics state
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null)
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(false)
  const [statisticsDateRange, setStatisticsDateRange] = useState<DateRangeValue>({
    type: 'preset',
    preset: 'last_30_days',
  })

  // Unsubscribe stats state
  const [unsubscribeData, setUnsubscribeData] = useState<UnsubscribeStatsData | null>(null)
  const [isUnsubscribeLoading, setIsUnsubscribeLoading] = useState(false)
  const [unsubscribeDateRange, setUnsubscribeDateRange] = useState<DateRangeValue>({
    type: 'preset',
    preset: 'last_30_days',
  })

  const [activeTab, setActiveTab] = useState("subscribers")

  useEffect(() => {
    if (activeTab === "subscribers") {
      fetchSubscribers()
    }
  }, [page, searchQuery, statusFilter, activeTab])

  useEffect(() => {
    if (activeTab === "statistics") {
      fetchStatistics()
    }
  }, [activeTab, statisticsDateRange])

  useEffect(() => {
    if (activeTab === "unsubscribe-stats") {
      fetchUnsubscribeStats()
    }
  }, [activeTab, unsubscribeDateRange])

  const fetchSubscribers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (searchQuery) {
        params.append("search", searchQuery)
      }

      if (statusFilter !== "all") {
        params.append("is_active", statusFilter)
      }

      const response = await fetch(`/api/admin/newsletter/subscribers?${params}`)

      if (!response.ok) {
        throw new Error("Failed to fetch subscribers")
      }

      const data = await response.json()
      setSubscribers(data.subscribers || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error: any) {
      console.error("Error fetching subscribers:", error)
      adminToast.error("Failed to load subscribers")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      setIsStatisticsLoading(true)
      const params = new URLSearchParams()

      if (statisticsDateRange.type === 'custom' && statisticsDateRange.startDate && statisticsDateRange.endDate) {
        params.append('start_date', statisticsDateRange.startDate)
        params.append('end_date', statisticsDateRange.endDate)
      } else if (statisticsDateRange.type === 'preset' && statisticsDateRange.preset) {
        const now = new Date()
        let startDate: Date

        switch (statisticsDateRange.preset) {
          case 'last_7_days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'last_30_days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case 'last_90_days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }

        params.append('start_date', startDate.toISOString())
        params.append('end_date', now.toISOString())
      }

      const response = await fetch(`/api/admin/newsletter/statistics?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch statistics")
      }

      const data = await response.json()
      setStatisticsData(data)
    } catch (error: any) {
      console.error("Error fetching statistics:", error)
      adminToast.error("Failed to load statistics")
    } finally {
      setIsStatisticsLoading(false)
    }
  }

  const fetchUnsubscribeStats = async () => {
    try {
      setIsUnsubscribeLoading(true)
      const params = new URLSearchParams()

      if (unsubscribeDateRange.type === 'custom' && unsubscribeDateRange.startDate && unsubscribeDateRange.endDate) {
        params.append('start_date', unsubscribeDateRange.startDate)
        params.append('end_date', unsubscribeDateRange.endDate)
      } else if (unsubscribeDateRange.type === 'preset' && unsubscribeDateRange.preset) {
        const now = new Date()
        let startDate: Date

        switch (unsubscribeDateRange.preset) {
          case 'last_7_days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'last_30_days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case 'last_90_days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }

        params.append('start_date', startDate.toISOString())
        params.append('end_date', now.toISOString())
      }

      const response = await fetch(`/api/admin/newsletter/unsubscribe-stats?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch unsubscribe statistics")
      }

      const data = await response.json()
      setUnsubscribeData(data)
    } catch (error: any) {
      console.error("Error fetching unsubscribe statistics:", error)
      adminToast.error("Failed to load unsubscribe statistics")
    } finally {
      setIsUnsubscribeLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await adminConfirm({
      title: "Remove this subscriber?",
      confirmLabel: "Remove",
    }))) {
      return
    }

    try {
      const response = await fetch(`/api/admin/newsletter/subscribers?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete subscriber")
      }

      adminToast.success("Subscriber removed successfully")
      fetchSubscribers()
    } catch (error: any) {
      console.error("Error deleting subscriber:", error)
      adminToast.error(error.message || "Failed to remove subscriber")
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

  const formatChartDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Newsletter Subscribers</h1>
        <p className="text-muted-foreground mt-2">
          Manage subscribers, view statistics, and track unsubscribe trends
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="unsubscribe-stats">
            <TrendingDown className="h-4 w-4 mr-2" />
            Unsubscribe Stats
          </TabsTrigger>
        </TabsList>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value)
                  setPage(1)
                }}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : subscribers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No subscribers found</p>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Subscribed At</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscribers.map((subscriber) => (
                          <TableRow key={subscriber.id}>
                            <TableCell className="font-medium">
                              {subscriber.email}
                            </TableCell>
                            <TableCell>
                              {formatDate(subscriber.subscribed_at)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={subscriber.is_active ? "default" : "secondary"}
                              >
                                {subscriber.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(subscriber.id)}
                                disabled={!subscriber.is_active}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages} ({total} total)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={page === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          <div className="flex justify-end">
            <DateRangePicker value={statisticsDateRange} onChange={setStatisticsDateRange} />
          </div>

          {isStatisticsLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !statisticsData ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No statistics data available</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Campaigns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statisticsData.overview.total_campaigns}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statisticsData.overview.sent_campaigns} sent, {statisticsData.overview.scheduled_campaigns} scheduled
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Recipients
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statisticsData.overview.total_recipients.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statisticsData.overview.total_sent.toLocaleString()} sent successfully
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statisticsData.overview.success_rate.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statisticsData.overview.total_failed} failed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Email Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statisticsData.sends.sent}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statisticsData.sends.pending} pending, {statisticsData.sends.failed} failed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Sending Statistics</CardTitle>
                    <CardDescription>Campaigns and emails sent over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statisticsData.daily_stats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={statisticsData.daily_stats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '12px' }}
                            tickFormatter={formatChartDate}
                            tickLine={false}
                          />
                          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            labelFormatter={(value) => formatChartDate(value)}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="sent"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Sent"
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="failed"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="Failed"
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Email Status Distribution</CardTitle>
                    <CardDescription>Breakdown of email sending status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statisticsData.sends.total > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Sent', value: statisticsData.sends.sent },
                              { name: 'Failed', value: statisticsData.sends.failed },
                              { name: 'Pending', value: statisticsData.sends.pending },
                              { name: 'Bounced', value: statisticsData.sends.bounced },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'Sent', value: statisticsData.sends.sent },
                              { name: 'Failed', value: statisticsData.sends.failed },
                              { name: 'Pending', value: statisticsData.sends.pending },
                              { name: 'Bounced', value: statisticsData.sends.bounced },
                            ]
                              .filter(item => item.value > 0)
                              .map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Template Statistics */}
              {statisticsData.template_stats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Template Performance</CardTitle>
                    <CardDescription>Statistics by newsletter template</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={statisticsData.template_stats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="template_name"
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tickLine={false}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="sent" fill="#10b981" name="Sent" />
                        <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Unsubscribe Stats Tab */}
        <TabsContent value="unsubscribe-stats" className="space-y-6">
          <div className="flex justify-end">
            <DateRangePicker value={unsubscribeDateRange} onChange={setUnsubscribeDateRange} />
          </div>

          {isUnsubscribeLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !unsubscribeData ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No unsubscribe statistics available</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Subscribers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{unsubscribeData.overview.total_subscribers.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {unsubscribeData.overview.active_subscribers.toLocaleString()} active
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Subscribers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {unsubscribeData.overview.active_subscribers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Currently subscribed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Unsubscribed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {unsubscribeData.overview.unsubscribed_count.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total unsubscribed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Unsubscribe Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{unsubscribeData.overview.unsubscribe_rate.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Of total subscribers
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Period Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Unsubscribes by Period</CardTitle>
                  <CardDescription>Number of unsubscribes in recent periods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{unsubscribeData.period_stats.last_7_days}</div>
                      <div className="text-sm text-muted-foreground mt-1">Last 7 Days</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{unsubscribeData.period_stats.last_30_days}</div>
                      <div className="text-sm text-muted-foreground mt-1">Last 30 Days</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{unsubscribeData.period_stats.last_90_days}</div>
                      <div className="text-sm text-muted-foreground mt-1">Last 90 Days</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Trends</CardTitle>
                  <CardDescription>Daily subscription and unsubscribe activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {unsubscribeData.daily_stats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={unsubscribeData.daily_stats}>
                        <defs>
                          <linearGradient id="colorSubscribed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorUnsubscribed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                          tickFormatter={formatChartDate}
                          tickLine={false}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          labelFormatter={(value) => formatChartDate(value)}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="subscribed"
                          stroke="#10b981"
                          fillOpacity={1}
                          fill="url(#colorSubscribed)"
                          name="Subscribed"
                        />
                        <Area
                          type="monotone"
                          dataKey="unsubscribed"
                          stroke="#ef4444"
                          fillOpacity={1}
                          fill="url(#colorUnsubscribed)"
                          name="Unsubscribed"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Net Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Net Growth</CardTitle>
                  <CardDescription>Daily net subscriber growth (subscribed - unsubscribed)</CardDescription>
                </CardHeader>
                <CardContent>
                  {unsubscribeData.daily_stats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={unsubscribeData.daily_stats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                          tickFormatter={formatChartDate}
                          tickLine={false}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          labelFormatter={(value) => formatChartDate(value)}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="net_growth"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Net Growth"
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="0"
                          stroke="#e0e0e0"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          name="Zero Line"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
