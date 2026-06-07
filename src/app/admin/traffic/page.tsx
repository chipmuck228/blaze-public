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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { exportToCSV } from '@/lib/traffic-export'
import { useTrafficSSE } from '@/hooks/useTrafficSSE'
import { adminToast } from '@/lib/admin-toast'
import { getErrorMessage } from "@/lib/typed-error"

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

type BreakdownRow = {
  name: string
  visits: number
  percentage: number
}

type ChannelsResponse = {
  channels: BreakdownRow[]
  search_engines: BreakdownRow[]
  social_platforms: BreakdownRow[]
  total: number
}

type ReferrerDomainsResponse = {
  domains: Array<{ domain: string; visits: number; percentage: number }>
  total: number
}

type GeographyResponse = {
  countries: Array<{ code: string; name: string; visits: number; percentage: number }>
  total: number
  total_visits_in_range: number
  geo_coverage_percent: number
  has_geo_data: boolean
  group_by: string
}

type KeywordsResponse = {
  configured: boolean
  message: string | null
  data_source: string
  queries: Array<{
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  top_pages: Array<{
    page: string
    clicks: number
    impressions: number
    ctr: number
  }>
  total_clicks: number
  total_impressions: number
  last_synced_at: string | null
}

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.name}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{row.name}</p>
            <p className="text-sm text-muted-foreground">
              {row.visits.toLocaleString()} visits ({row.percentage}%)
            </p>
          </div>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden ml-3 shrink-0">
            <div
              className="h-full bg-primary/80 transition-all"
              style={{ width: `${Math.min(row.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TrafficPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    type: 'preset',
    preset: 'last_30_days',
  })
  const [summary, setSummary] = useState<TrafficSummary | null>(null)
  const [visitsChart, setVisitsChart] = useState<VisitsChartData | null>(null)
  const [sources, setSources] = useState<{ sources: BreakdownRow[]; total: number } | null>(null)
  const [channels, setChannels] = useState<ChannelsResponse | null>(null)
  const [referrerDomains, setReferrerDomains] = useState<ReferrerDomainsResponse | null>(null)
  const [geography, setGeography] = useState<GeographyResponse | null>(null)
  const [keywords, setKeywords] = useState<KeywordsResponse | null>(null)
  const [devices, setDevices] = useState<any>(null)
  const [browsers, setBrowsers] = useState<any>(null)
  const [operatingSystems, setOperatingSystems] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [visitsChartLoading, setVisitsChartLoading] = useState(true)
  const [visitsChartError, setVisitsChartError] = useState<string | null>(null)
  const [sourcesLoading, setSourcesLoading] = useState(true)
  const [sourcesError, setSourcesError] = useState<string | null>(null)
  const [geographyLoading, setGeographyLoading] = useState(true)
  const [geographyError, setGeographyError] = useState<string | null>(null)
  const [keywordsLoading, setKeywordsLoading] = useState(true)
  const [keywordsError, setKeywordsError] = useState<string | null>(null)
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [browsersLoading, setBrowsersLoading] = useState(true)
  const [browsersError, setBrowsersError] = useState<string | null>(null)
  const [osLoading, setOsLoading] = useState(true)
  const [osError, setOsError] = useState<string | null>(null)
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

  const hasData = useMemo(
    () =>
      summary ||
      (visitsChart && visitsChart.data.length > 0) ||
      (sources && sources.sources.length > 0) ||
      (devices && devices.devices.length > 0) ||
      (browsers && browsers.browsers.length > 0) ||
      (operatingSystems && operatingSystems.operating_systems.length > 0) ||
      (geography && geography.countries.length > 0) ||
      (keywords && keywords.queries.length > 0),
    [summary, visitsChart, sources, devices, browsers, operatingSystems, geography, keywords]
  )
  const anyError =
    summaryError ||
    visitsChartError ||
    sourcesError ||
    geographyError ||
    keywordsError ||
    devicesError ||
    browsersError ||
    osError

  const fetchAllData = useCallback(() => {
    setSummaryLoading(true)
    setSummaryError(null)
    setVisitsChartLoading(true)
    setVisitsChartError(null)
    setSourcesLoading(true)
    setSourcesError(null)
    setGeographyLoading(true)
    setGeographyError(null)
    setKeywordsLoading(true)
    setKeywordsError(null)
    setDevicesLoading(true)
    setDevicesError(null)
    setBrowsersLoading(true)
    setBrowsersError(null)
    setOsLoading(true)
    setOsError(null)

    const base = '/api/admin/traffic'
    Promise.all([
      fetch(`${base}/summary?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setSummary)
        .catch((e: unknown) => setSummaryError(getErrorMessage(e, 'Failed')))
        .finally(() => setSummaryLoading(false)),
      fetch(`${base}/visits-chart?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setVisitsChart)
        .catch((e: unknown) => setVisitsChartError(getErrorMessage(e, 'Failed')))
        .finally(() => setVisitsChartLoading(false)),
      fetch(`${base}/sources?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setSources)
        .catch((e: unknown) => setSourcesError(getErrorMessage(e, 'Failed'))),
      fetch(`${base}/channels?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setChannels)
        .catch((e: unknown) => setSourcesError(getErrorMessage(e, 'Failed'))),
      fetch(`${base}/referrer-domains?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setReferrerDomains)
        .catch((e: unknown) => setSourcesError(getErrorMessage(e, 'Failed')))
        .finally(() => setSourcesLoading(false)),
      fetch(`${base}/geography?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setGeography)
        .catch((e: unknown) => setGeographyError(getErrorMessage(e, 'Failed')))
        .finally(() => setGeographyLoading(false)),
      fetch(`${base}/keywords?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setKeywords)
        .catch((e: unknown) => setKeywordsError(getErrorMessage(e, 'Failed')))
        .finally(() => setKeywordsLoading(false)),
      fetch(`${base}/devices?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setDevices)
        .catch((e: unknown) => setDevicesError(getErrorMessage(e, 'Failed')))
        .finally(() => setDevicesLoading(false)),
      fetch(`${base}/browsers?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setBrowsers)
        .catch((e: unknown) => setBrowsersError(getErrorMessage(e, 'Failed')))
        .finally(() => setBrowsersLoading(false)),
      fetch(`${base}/operating-systems?${queryString}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to fetch')
          }
          return res.json()
        })
        .then(setOperatingSystems)
        .catch((e: unknown) => setOsError(getErrorMessage(e, 'Failed')))
        .finally(() => setOsLoading(false)),
    ])
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
        geography: geography?.countries,
        keywords: keywords?.queries,
      })
      adminToast.success('Data exported successfully')
    } catch (error: unknown) {
      console.error('Error exporting data:', error)
      adminToast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }, [summary, visitsChart, sources, devices, browsers, operatingSystems, geography, keywords])

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
          {anyError && hasData && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="flex items-center gap-2 py-4">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">
                  Some data failed to load. Use Retry to reload.
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
          {summaryLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}
          {summaryError && !summaryLoading && (
            <ErrorState message={summaryError} onRetry={fetchAllData} title="Summary failed" />
          )}
          {!summaryLoading && !summaryError && summary && (
            <TrafficSummaryCards data={summary} />
          )}
          {!summaryLoading && !summaryError && !summary && (
            <EmptyState title="No summary data" />
          )}

          {/* Visits Chart */}
          {visitsChartLoading && (
            <Card>
              <CardHeader>
                <CardTitle>Visits</CardTitle>
                <CardDescription>Loading...</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}
          {visitsChartError && !visitsChartLoading && (
            <ErrorState message={visitsChartError} onRetry={fetchAllData} title="Visits chart failed" />
          )}
          {!visitsChartLoading && !visitsChartError && visitsChart && visitsChart.data.length > 0 && (
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
          )}
          {!visitsChartLoading && !visitsChartError && visitsChart && visitsChart.data.length === 0 && (
            <EmptyState title="No visits data" description="No visits recorded for the selected time range." />
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sources */}
            {sourcesLoading && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Sources by Visits</CardTitle>
                  <CardDescription>Loading...</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}
            {sourcesError && !sourcesLoading && (
              <ErrorState message={sourcesError} onRetry={fetchAllData} title="Sources failed" />
            )}
            {!sourcesLoading && !sourcesError && sources && sources.sources.length > 0 && (
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
            )}
            {!sourcesLoading && !sourcesError && sources && sources.sources.length === 0 && (
              <EmptyState title="No sources data" />
            )}

            {/* Devices */}
            {devicesLoading && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Devices by Visits</CardTitle>
                  <CardDescription>Loading...</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}
            {devicesError && !devicesLoading && (
              <ErrorState message={devicesError} onRetry={fetchAllData} title="Devices failed" />
            )}
            {!devicesLoading && !devicesError && devices && devices.devices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Devices by Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <DevicesDonutChart data={devices.devices} />
                </CardContent>
              </Card>
            )}
            {!devicesLoading && !devicesError && devices && devices.devices.length === 0 && (
              <EmptyState title="No devices data" />
            )}

            {/* Browsers */}
            {browsersLoading && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Browsers by Visits</CardTitle>
                  <CardDescription>Loading...</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}
            {browsersError && !browsersLoading && (
              <ErrorState message={browsersError} onRetry={fetchAllData} title="Browsers failed" />
            )}
            {!browsersLoading && !browsersError && browsers && browsers.browsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Browsers by Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <BrowsersBarChart data={browsers.browsers} />
                </CardContent>
              </Card>
            )}
            {!browsersLoading && !browsersError && browsers && browsers.browsers.length === 0 && (
              <EmptyState title="No browsers data" />
            )}

            {/* Operating Systems */}
            {osLoading && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Operating Systems by Visits</CardTitle>
                  <CardDescription>Loading...</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}
            {osError && !osLoading && (
              <ErrorState message={osError} onRetry={fetchAllData} title="Operating systems failed" />
            )}
            {!osLoading && !osError && operatingSystems && operatingSystems.operating_systems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Operating Systems by Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <OperatingSystemsBarChart data={operatingSystems.operating_systems} />
                </CardContent>
              </Card>
            )}
            {!osLoading && !osError && operatingSystems && operatingSystems.operating_systems.length === 0 && (
              <EmptyState title="No operating systems data" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-base">About acquisition data</CardTitle>
              <CardDescription>
                Search and social traffic are inferred from HTTP referrers. Many in-app browsers
                omit referrers; Google organic visits often appear as Direct. Use UTM-tagged campaign
                links for accurate social attribution. Search keywords require Google Search Console
                (Keywords tab).
              </CardDescription>
            </CardHeader>
          </Card>

          {sourcesLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}
          {sourcesError && !sourcesLoading && (
            <ErrorState message={sourcesError} onRetry={fetchAllData} title="Sources failed" />
          )}
          {!sourcesLoading && !sourcesError && channels && channels.channels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Traffic channels</CardTitle>
                <CardDescription>
                  {channels.total.toLocaleString()} visits — Direct, search engines, social, other
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SourcesBarChart data={channels.channels} />
              </CardContent>
            </Card>
          )}

          {!sourcesLoading && !sourcesError && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {channels && channels.search_engines.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Search engines</CardTitle>
                    <CardDescription>Referrals from search sites</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SourcesBarChart data={channels.search_engines} />
                    <div className="mt-4">
                      <BreakdownList rows={channels.search_engines} />
                    </div>
                  </CardContent>
                </Card>
              )}
              {channels && channels.social_platforms.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Social platforms</CardTitle>
                    <CardDescription>Referrals from social networks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SourcesBarChart data={channels.social_platforms} />
                    <div className="mt-4">
                      <BreakdownList rows={channels.social_platforms} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!sourcesLoading && !sourcesError && sources && sources.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Source type (legacy)</CardTitle>
                <CardDescription>
                  {sources.total.toLocaleString()} visits by stored source_type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownList rows={sources.sources} />
              </CardContent>
            </Card>
          )}

          {!sourcesLoading && !sourcesError && referrerDomains && referrerDomains.domains.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top referrer domains</CardTitle>
                <CardDescription>
                  External hostnames (excluding direct)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownList
                  rows={referrerDomains.domains.map((d) => ({
                    name: d.domain,
                    visits: d.visits,
                    percentage: d.percentage,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {!sourcesLoading &&
            !sourcesError &&
            (!channels || channels.total === 0) &&
            (!sources || sources.sources.length === 0) && (
            <EmptyState title="No sources data" description="No traffic sources recorded for the selected time range." />
          )}
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-base">About search keywords</CardTitle>
              <CardDescription>
                Data comes from Google Search Console, not on-site referrers. Figures lag by about
                2–3 days and differ from Traffic Sources / Direct visits. Configure GSC env vars and
                run the daily sync cron to populate this tab.
              </CardDescription>
            </CardHeader>
          </Card>

          {keywordsLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}
          {keywordsError && !keywordsLoading && (
            <ErrorState message={keywordsError} onRetry={fetchAllData} title="Keywords failed" />
          )}
          {!keywordsLoading && !keywordsError && keywords && !keywords.configured && (
            <EmptyState
              title="Search Console not configured"
              description={keywords.message ?? 'Set GSC_SITE_URL and GSC_SERVICE_ACCOUNT_JSON in your deployment environment.'}
            />
          )}
          {!keywordsLoading && !keywordsError && keywords?.configured && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Search performance</CardTitle>
                  <CardDescription>
                    {keywords.total_clicks.toLocaleString()} clicks ·{' '}
                    {keywords.total_impressions.toLocaleString()} impressions
                    {keywords.last_synced_at
                      ? ` · Last sync ${new Date(keywords.last_synced_at).toLocaleString()}`
                      : ''}
                  </CardDescription>
                </CardHeader>
              </Card>
              {keywords.queries.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Top queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Query</TableHead>
                          <TableHead className="text-right">Clicks</TableHead>
                          <TableHead className="text-right">Impressions</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right">Avg position</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keywords.queries.map((row) => (
                          <TableRow key={row.query}>
                            <TableCell className="font-medium max-w-md truncate">
                              {row.query}
                            </TableCell>
                            <TableCell className="text-right">{row.clicks.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              {row.impressions.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">{row.ctr}%</TableCell>
                            <TableCell className="text-right">{row.position}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  title="No keyword data"
                  description={
                    keywords.message ??
                    'Run GET /api/cron/traffic-gsc-sync after connecting Search Console.'
                  }
                />
              )}
              {keywords.top_pages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top landing pages (GSC)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BreakdownList
                      rows={keywords.top_pages.map((p) => ({
                        name: p.page,
                        visits: p.clicks,
                        percentage: p.ctr,
                      }))}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="geography" className="space-y-6">
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-base">About geography</CardTitle>
              <CardDescription>
                Country and region are captured from edge headers when a new visit is recorded
                (Vercel or Cloudflare). Local development often has no geo data until production.
                Only aggregate country/region counts are shown.
              </CardDescription>
            </CardHeader>
          </Card>

          {geographyLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}
          {geographyError && !geographyLoading && (
            <ErrorState message={geographyError} onRetry={fetchAllData} title="Geography failed" />
          )}
          {!geographyLoading && !geographyError && geography && geography.has_geo_data && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Visitors by country</CardTitle>
                  <CardDescription>
                    {geography.total.toLocaleString()} visits with geo ·{' '}
                    {geography.geo_coverage_percent}% of {geography.total_visits_in_range.toLocaleString()}{' '}
                    visits in range
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SourcesBarChart
                    data={geography.countries.map((c) => ({
                      name: c.name,
                      visits: c.visits,
                      percentage: c.percentage,
                    }))}
                  />
                  <div className="mt-4">
                    <BreakdownList
                      rows={geography.countries.map((c) => ({
                        name: `${c.name} (${c.code})`,
                        visits: c.visits,
                        percentage: c.percentage,
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          {!geographyLoading &&
            !geographyError &&
            geography &&
            !geography.has_geo_data && (
              <EmptyState
                title="No geography data"
                description={
                  geography.total_visits_in_range > 0
                    ? 'Visits exist in this range but none have country_code yet. Deploy to Vercel (or Cloudflare) so geo headers are set on new visits.'
                    : 'No visits in the selected date range.'
                }
              />
            )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
