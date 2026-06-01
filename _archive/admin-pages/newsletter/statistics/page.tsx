'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { DateRangePicker } from "@/components/admin/traffic/DateRangePicker"

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

type DateRangeValue = {
  type: 'preset' | 'custom'
  preset?: 'last_7_days' | 'last_30_days' | 'last_90_days'
  startDate?: string
  endDate?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function NewsletterStatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    type: 'preset',
    preset: 'last_30_days',
  })

  useEffect(() => {
    fetchStatistics()
  }, [dateRange])

  const fetchStatistics = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()

      if (dateRange.type === 'custom' && dateRange.startDate && dateRange.endDate) {
        params.append('start_date', dateRange.startDate)
        params.append('end_date', dateRange.endDate)
      } else if (dateRange.type === 'preset' && dateRange.preset) {
        const now = new Date()
        let startDate: Date

        switch (dateRange.preset) {
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

      const statisticsData = await response.json()
      setData(statisticsData)
    } catch (error: any) {
      console.error("Error fetching statistics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No statistics data available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Newsletter Statistics</h1>
        <p className="text-muted-foreground mt-2">
          View sending performance and analytics
        </p>
      </div>

      {/* Date Range Picker */}
      <div className="mb-6">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.total_campaigns}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.sent_campaigns} sent, {data.overview.scheduled_campaigns} scheduled
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
            <div className="text-2xl font-bold">{data.overview.total_recipients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.total_sent.toLocaleString()} sent successfully
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
            <div className="text-2xl font-bold">{data.overview.success_rate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.total_failed} failed
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
            <div className="text-2xl font-bold">{data.sends.sent}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.sends.pending} pending, {data.sends.failed} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Stats Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sending Statistics</CardTitle>
            <CardDescription>Campaigns and emails sent over time</CardDescription>
          </CardHeader>
          <CardContent>
            {data.daily_stats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.daily_stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    tickFormatter={formatDate}
                    tickLine={false}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(value) => formatDate(value)}
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

        {/* Send Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Email Status Distribution</CardTitle>
            <CardDescription>Breakdown of email sending status</CardDescription>
          </CardHeader>
          <CardContent>
            {data.sends.total > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Sent', value: data.sends.sent },
                      { name: 'Failed', value: data.sends.failed },
                      { name: 'Pending', value: data.sends.pending },
                      { name: 'Bounced', value: data.sends.bounced },
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
                      { name: 'Sent', value: data.sends.sent },
                      { name: 'Failed', value: data.sends.failed },
                      { name: 'Pending', value: data.sends.pending },
                      { name: 'Bounced', value: data.sends.bounced },
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
      {data.template_stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Template Performance</CardTitle>
            <CardDescription>Statistics by newsletter template</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.template_stats}>
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
    </div>
  )
}
