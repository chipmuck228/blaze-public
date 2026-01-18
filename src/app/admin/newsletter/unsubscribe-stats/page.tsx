'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import {
  LineChart,
  Line,
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

export default function UnsubscribeStatsPage() {
  const [data, setData] = useState<UnsubscribeStatsData | null>(null)
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

      const response = await fetch(`/api/admin/newsletter/unsubscribe-stats?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch unsubscribe statistics")
      }

      const statisticsData = await response.json()
      setData(statisticsData)
    } catch (error: any) {
      console.error("Error fetching unsubscribe statistics:", error)
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
            <p className="text-muted-foreground">No unsubscribe statistics available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Unsubscribe Statistics</h1>
        <p className="text-muted-foreground mt-2">
          Track subscription trends and unsubscribe rates
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
              Total Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.total_subscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.active_subscribers.toLocaleString()} active
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
              {data.overview.active_subscribers.toLocaleString()}
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
              {data.overview.unsubscribed_count.toLocaleString()}
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
            <div className="text-2xl font-bold">{data.overview.unsubscribe_rate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Of total subscribers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Unsubscribes by Period</CardTitle>
          <CardDescription>Number of unsubscribes in recent periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.period_stats.last_7_days}</div>
              <div className="text-sm text-muted-foreground mt-1">Last 7 Days</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.period_stats.last_30_days}</div>
              <div className="text-sm text-muted-foreground mt-1">Last 30 Days</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{data.period_stats.last_90_days}</div>
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
          {data.daily_stats.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data.daily_stats}>
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
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Net Growth</CardTitle>
          <CardDescription>Daily net subscriber growth (subscribed - unsubscribed)</CardDescription>
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
    </div>
  )
}
