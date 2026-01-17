'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Loader2, Download, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/admin/traffic/DateRangePicker'
import { TrafficSummaryCards } from '@/components/admin/traffic/TrafficSummaryCards'
import { VisitsLineChart } from '@/components/admin/traffic/VisitsLineChart'
import { SourcesBarChart } from '@/components/admin/traffic/SourcesBarChart'
import { DevicesDonutChart } from '@/components/admin/traffic/DevicesDonutChart'
import { BrowsersBarChart } from '@/components/admin/traffic/BrowsersBarChart'
import { OperatingSystemsBarChart } from '@/components/admin/traffic/OperatingSystemsBarChart'
import { EmptyState } from '@/components/admin/traffic/EmptyState'
import { ErrorState } from '@/components/admin/traffic/ErrorState'
import { exportToCSV } from '@/lib/traffic-export'
import { useTrafficSSE } from '@/hooks/useTrafficSSE'
import { toast } from 'sonner'

interface TrafficSSEData {
  visits: number
  pageviews: number
  unique_visitors: number
  bounce_rate: number
  timestamp: string
}

interface TrafficSummary {
  visits: { total: number; mom_change: number; mom_change_type: string }
  bounce_rate: { value: number; mom_change: number; mom_change_type: string }
  unique_visitors: { total: number; mom_change: number; mom_change_type: string }
  pageviews: { total: number; mom_change: number; mom_change_type: string }
  period: { start: string; end: string }
}

interface VisitsChartData {
  data: Array<{
    date: string
    visits: number
    unique_visitors: number
    pageviews: number
  }>
  total: {
    visits: number
    unique_visitors: number
    pageviews: number
    mom_change: number
  }
}

type DateRangeValue = {
  type: 'preset' | 'custom'
  preset?: 'last_7_days' | 'last_30_days' | 'last_90_days'
  startDate?: string
  endDate?: string
}

export default function TrafficPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    type: 'preset',
    preset: 'last_30_days',
  })
  const [summary, setSummary] = useState<TrafficSummary | null>(null)
  const [visitsChart, setVisitsChart] = useState<VisitsChartData | null>(null)
  const [sources, setSources] = useState<any>(null)
  const [devices, setDevices] = useState<any>(null)
  const [browsers, setBrowsers] = useState<any>(null)
  const [operatingSystems, setOperatingSystems] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true)

  // 使用 useMemo 缓存查询字符串
  const queryString = useMemo(() => {
    if (dateRange.type === 'custom' && dateRange.startDate && dateRange.endDate) {
      return `start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
    }
    return `period=${dateRange.preset || 'last_30_days'}`
  }, [dateRange])

  // SSE 实时数据更新
  const { data: sseData, isConnected: isSSEConnected } = useTrafficSSE({
    period: dateRange.type === 'preset' ? dateRange.preset : null,
    startDate: dateRange.type === 'custom' ? dateRange.startDate : null,
    endDate: dateRange.type === 'custom' ? dateRange.endDate : null,
    enabled: isRealTimeEnabled,
    onUpdate: useCallback((data: TrafficSSEData) => {
      console.log('[TrafficPage] SSE data received:', data)
      console.log('[TrafficPage] Current dateRange:', dateRange)
      // 更新 summary 数据（仅更新数值，不改变 MoM 对比）
      setSummary((prevSummary) => {
        if (!prevSummary) {
          // 如果 summary 还没有加载，先不更新
          // 等待初始数据加载完成后再更新
          console.log('[TrafficPage] Summary not loaded yet, skipping update')
          return null
        }
        
        // 检查数据是否真的发生了变化
        const hasChanges = 
          prevSummary.visits.total !== data.visits ||
          prevSummary.pageviews.total !== data.pageviews ||
          prevSummary.unique_visitors.total !== data.unique_visitors ||
          Math.abs(prevSummary.bounce_rate.value - data.bounce_rate) > 0.01
        
        if (!hasChanges) {
          console.log('[TrafficPage] No changes detected, skipping update')
          return prevSummary
        }
        
        const updated = {
          ...prevSummary,
          visits: {
            ...prevSummary.visits,
            total: data.visits,
          },
          bounce_rate: {
            ...prevSummary.bounce_rate,
            value: data.bounce_rate,
          },
          unique_visitors: {
            ...prevSummary.unique_visitors,
            total: data.unique_visitors,
          },
          pageviews: {
            ...prevSummary.pageviews,
            total: data.pageviews,
          },
        }
        console.log('[TrafficPage] Updating summary:', {
          old: {
            visits: prevSummary.visits.total,
            pageviews: prevSummary.pageviews.total,
            unique_visitors: prevSummary.unique_visitors.total,
            bounce_rate: prevSummary.bounce_rate.value,
          },
          new: {
            visits: data.visits,
            pageviews: data.pageviews,
            unique_visitors: data.unique_visitors,
            bounce_rate: data.bounce_rate,
          },
        })
        return updated
      })
    }, [dateRange]),
  })

  // 使用 useMemo 缓存数据检查
  const hasData = useMemo(
    () =>
      summary ||
      (visitsChart && visitsChart.data.length > 0) ||
      (sources && sources.sources.length > 0) ||
      (devices && devices.devices.length > 0) ||
      (browsers && browsers.browsers.length > 0) ||
      (operatingSystems && operatingSystems.operating_systems.length > 0),
    [summary, visitsChart, sources, devices, browsers, operatingSystems]
  )

  const fetchAllData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [summaryRes, visitsChartRes, sourcesRes, devicesRes, browsersRes, osRes] =
        await Promise.all([
          fetch(`/api/admin/traffic/summary?${queryString}`),
          fetch(`/api/admin/traffic/visits-chart?${queryString}`),
          fetch(`/api/admin/traffic/sources?${queryString}`),
          fetch(`/api/admin/traffic/devices?${queryString}`),
          fetch(`/api/admin/traffic/browsers?${queryString}`),
          fetch(`/api/admin/traffic/operating-systems?${queryString}`),
        ])

      // 检查是否有错误响应
      const errors: string[] = []
      if (!summaryRes.ok) {
        const errorData = await summaryRes.json().catch(() => ({}))
        errors.push(`Summary: ${errorData.error || 'Failed to fetch'}`)
      }
      if (!visitsChartRes.ok) {
        const errorData = await visitsChartRes.json().catch(() => ({}))
        errors.push(`Visits Chart: ${errorData.error || 'Failed to fetch'}`)
      }

      if (errors.length > 0) {
        setError(errors.join(', '))
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData)
      } else {
        setSummary(null)
      }

      if (visitsChartRes.ok) {
        const visitsChartData = await visitsChartRes.json()
        setVisitsChart(visitsChartData)
      } else {
        setVisitsChart(null)
      }

      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json()
        setSources(sourcesData)
      } else {
        setSources(null)
      }

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json()
        setDevices(devicesData)
      } else {
        setDevices(null)
      }

      if (browsersRes.ok) {
        const browsersData = await browsersRes.json()
        setBrowsers(browsersData)
      } else {
        setBrowsers(null)
      }

      if (osRes.ok) {
        const osData = await osRes.json()
        setOperatingSystems(osData)
      } else {
        setOperatingSystems(null)
      }
    } catch (error: any) {
      console.error('Error fetching traffic data:', error)
      setError(error.message || 'Failed to fetch traffic data')
    } finally {
      setIsLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    // 添加防抖，避免频繁请求
    const timeoutId = setTimeout(() => {
      fetchAllData()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [queryString, fetchAllData])

  const handleExport = useCallback(() => {
    setIsExporting(true)
    try {
      exportToCSV({
        summary: summary
          ? {
              visits: summary.visits.total,
              bounce_rate: summary.bounce_rate.value,
              unique_visitors: summary.unique_visitors.total,
              pageviews: summary.pageviews.total,
            }
          : undefined,
        visitsChart: visitsChart?.data,
        sources: sources?.sources,
        devices: devices?.devices,
        browsers: browsers?.browsers,
        operatingSystems: operatingSystems?.operating_systems,
      })
      toast.success('Data exported successfully')
    } catch (error: any) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }, [summary, visitsChart, sources, devices, browsers, operatingSystems])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading traffic data...</p>
        </div>
      </div>
    )
  }

  if (error && !hasData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Traffic</h1>
          </div>
          <div className="flex items-center gap-4">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>
        <ErrorState message={error} onRetry={fetchAllData} />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Traffic</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Real-time Status Indicator */}
          {isRealTimeEnabled && (
            <div className="flex items-center gap-2 text-sm">
              {isSSEConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="hidden sm:inline text-green-600 dark:text-green-400">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-yellow-500" />
                  <span className="hidden sm:inline text-yellow-600 dark:text-yellow-400">Connecting...</span>
                </>
              )}
            </div>
          )}
          {!isRealTimeEnabled && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            onClick={handleExport}
            disabled={isExporting || !hasData}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
            variant={isRealTimeEnabled ? 'default' : 'outline'}
            size="sm"
          >
            {isRealTimeEnabled ? 'Disable Live' : 'Enable Live'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="traffic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
          <TabsTrigger value="keywords">Search Keywords</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="space-y-6">
          {/* Error Banner */}
          {error && hasData && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="flex items-center gap-2 py-4">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">
                  Some data failed to load: {error}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchAllData}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          {summary ? (
            <TrafficSummaryCards data={summary} />
          ) : (
            !isLoading && <EmptyState title="No summary data" />
          )}

          {/* Visits Chart */}
          {visitsChart && visitsChart.data.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Visits</CardTitle>
                <CardDescription>
                  {visitsChart.total.visits.toLocaleString()} Total{' '}
                  {visitsChart.total.mom_change > 0 ? '+' : ''}
                  {visitsChart.total.mom_change}% mo/mo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VisitsLineChart data={visitsChart.data} />
              </CardContent>
            </Card>
          ) : (
            !isLoading && visitsChart && visitsChart.data.length === 0 && (
              <EmptyState title="No visits data" description="No visits recorded for the selected time range." />
            )
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sources */}
            {sources && sources.sources.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Top Sources by Visits</CardTitle>
                  <CardDescription>
                    {sources.total.toLocaleString()} Total Visits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SourcesBarChart data={sources.sources} />
                </CardContent>
              </Card>
            ) : (
              !isLoading && sources && sources.sources.length === 0 && (
                <EmptyState title="No sources data" />
              )
            )}

            {/* Devices */}
            {devices && devices.devices.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Top Devices by Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <DevicesDonutChart data={devices.devices} />
                </CardContent>
              </Card>
            ) : (
              !isLoading && devices && devices.devices.length === 0 && (
                <EmptyState title="No devices data" />
              )
            )}

            {/* Browsers */}
            {browsers && browsers.browsers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Top Browsers by Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <BrowsersBarChart data={browsers.browsers} />
                </CardContent>
              </Card>
            ) : (
              !isLoading && browsers && browsers.browsers.length === 0 && (
                <EmptyState title="No browsers data" />
              )
            )}

            {/* Operating Systems */}
            {operatingSystems && operatingSystems.operating_systems.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Top Operating Systems by Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <OperatingSystemsBarChart data={operatingSystems.operating_systems} />
                </CardContent>
              </Card>
            ) : (
              !isLoading && operatingSystems && operatingSystems.operating_systems.length === 0 && (
                <EmptyState title="No operating systems data" />
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          {/* Sources Chart */}
          {sources && sources.sources.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Top Traffic Sources</CardTitle>
                <CardDescription>
                  {sources.total.toLocaleString()} Total Visits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SourcesBarChart data={sources.sources} />
              </CardContent>
            </Card>
          ) : (
            !isLoading && <EmptyState title="No sources data" description="No traffic sources recorded for the selected time range." />
          )}

          {/* Additional Sources Info */}
          {sources && sources.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sources.sources.map((source: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{source.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {source.visits.toLocaleString()} visits ({source.percentage}%)
                        </p>
                      </div>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all"
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Keywords</CardTitle>
              <CardDescription>
                Search keyword analytics from Google Search Console
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="Search Keywords Not Available"
                description="This feature requires integration with Google Search Console API. It will be available in a future update."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geography</CardTitle>
              <CardDescription>
                Geographic distribution of website visitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="Geography Data Not Available"
                description="This feature requires IP geolocation service integration. It will be available in a future update."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
