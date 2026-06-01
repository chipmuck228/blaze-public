'use client'

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Search,
  Filter,
  X,
} from "lucide-react"
import { adminToast, getErrorMessage } from "@/lib/admin-toast"
import { NewsletterDeliveryPanel } from "@/components/admin/newsletter/NewsletterDeliveryPanel"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { DateRangePicker } from "@/components/admin/traffic/DateRangePicker"

interface FailedSend {
  id: string
  campaign_id: string
  campaign_subject: string
  subscriber_id: string
  email: string
  status: string
  error_message: string
  retry_count: number
  last_retry_at: string | null
  is_permanent_failure: boolean
  resend_email_id: string | null
  created_at: string
  updated_at: string
}

interface Campaign {
  id: string
  subject: string
}

interface FailedSendsStats {
  total_failed: number
  failed_by_reason: Record<string, number>
  failed_by_campaign: Array<{
    campaign_id: string
    campaign_subject: string
    failed_count: number
  }>
  recent_failures: Array<{
    date: string
    count: number
  }>
}

interface DateRangeValue {
  type: 'preset' | 'custom'
  preset?: 'last_7_days' | 'last_30_days' | 'last_90_days'
  startDate?: string
  endDate?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

function FailedSendsPageContent() {
  const searchParams = useSearchParams()
  const [failedSends, setFailedSends] = useState<FailedSend[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<FailedSendsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isRetryDialogOpen, setIsRetryDialogOpen] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 20

  // Filters
  const [searchEmail, setSearchEmail] = useState("")
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    type: 'preset',
    preset: 'last_30_days',
  })

  // Fetch campaigns for filter
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch("/api/admin/newsletter/campaigns")
        if (!response.ok) throw new Error("Failed to fetch campaigns")
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      } catch (error: unknown) {
        console.error("Error fetching campaigns:", error)
      }
    }
    fetchCampaigns()
  }, [])

  // Fetch failed sends
  const fetchFailedSends = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      if (selectedCampaignId && selectedCampaignId !== "all") {
        params.append("campaign_id", selectedCampaignId)
      }

      if (searchEmail) {
        params.append("email", searchEmail)
      }

      if (dateRange.type === 'custom' && dateRange.startDate && dateRange.endDate) {
        params.append('start_date', dateRange.startDate)
        params.append('end_date', dateRange.endDate)
      } else if (dateRange.type === 'preset' && dateRange.preset) {
        const now = new Date()
        let startDate: Date
        switch (dateRange.preset) {
          case 'last_7_days': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case 'last_30_days': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          case 'last_90_days': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
          default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        params.append('start_date', startDate.toISOString())
        params.append('end_date', now.toISOString())
      }

      const response = await fetch(`/api/admin/newsletter/failed-sends?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch failed sends")
      const data = await response.json()
      setFailedSends(data.failed_sends || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error: unknown) {
      console.error("Error fetching failed sends:", error)
      adminToast.error("Failed to load failed sends")
    } finally {
      setIsLoading(false)
    }
  }, [page, selectedCampaignId, searchEmail, dateRange])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true)
      const params = new URLSearchParams()

      if (dateRange.type === 'custom' && dateRange.startDate && dateRange.endDate) {
        params.append('start_date', dateRange.startDate)
        params.append('end_date', dateRange.endDate)
      } else if (dateRange.type === 'preset' && dateRange.preset) {
        const now = new Date()
        let startDate: Date
        switch (dateRange.preset) {
          case 'last_7_days': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case 'last_30_days': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          case 'last_90_days': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
          default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        params.append('start_date', startDate.toISOString())
        params.append('end_date', now.toISOString())
      }

      const response = await fetch(`/api/admin/newsletter/failed-sends/stats?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch stats")
      const data = await response.json()
      setStats(data)
    } catch (error: unknown) {
      console.error("Error fetching stats:", error)
      adminToast.error("Failed to load statistics")
    } finally {
      setIsLoadingStats(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchFailedSends()
  }, [fetchFailedSends])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(failedSends.map((s) => s.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  // 轮询任务状态，完成后触发通知刷新
  const pollTaskStatus = useCallback(async (taskId: string) => {
    const maxAttempts = 60 // 最多轮询 60 次（5分钟）
    let attempts = 0
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log(`[Failed Sends] Stopped polling task ${taskId} after ${maxAttempts} attempts`)
        return
      }
      
      try {
        const response = await fetch(`/api/admin/newsletter/failed-sends/retry-tasks/${taskId}`)
        if (!response.ok) {
          attempts++
          setTimeout(poll, 5000) // 5秒后重试
          return
        }
        
        const task = await response.json()
        
        if (task.status === 'completed' || task.status === 'failed') {
          // 任务完成，触发通知刷新
          console.log(`[Failed Sends] Task ${taskId} completed, refreshing notifications`)
          window.dispatchEvent(new Event('refreshNotifications'))
          
          // 刷新失败邮件列表
          fetchFailedSends()
          fetchStats()
        } else if (task.status === 'pending' || task.status === 'processing') {
          // 任务还在进行中，继续轮询
          attempts++
          setTimeout(poll, 5000) // 5秒后再次检查
        }
      } catch (error) {
        console.error(`[Failed Sends] Error polling task status:`, error)
        attempts++
        setTimeout(poll, 5000) // 5秒后重试
      }
    }
    
    // 延迟 5 秒后开始第一次轮询
    setTimeout(poll, 5000)
  }, [fetchFailedSends, fetchStats])

  const handleRetry = async (sendIds?: string[]) => {
    const idsToRetry = sendIds || Array.from(selectedIds)
    if (idsToRetry.length === 0) {
      adminToast.error("Please select at least one failed send to retry")
      return
    }

    setIsRetryDialogOpen(false)
    setIsRetrying(true)

    try {
      const response = await fetch("/api/admin/newsletter/failed-sends/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send_ids: idsToRetry }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create retry task")
      }
      
      const data = await response.json()

      if (data.success && data.task_id) {
        adminToast.success(
          `Retry task created (ID: ${data.task_id.substring(0, 8)}...). You will be notified when it completes.`,
          { duration: 5000 }
        )
        
        // 开始轮询任务状态，完成后刷新通知
        pollTaskStatus(data.task_id)
      } else {
        adminToast.error("Failed to create retry task")
      }

      setSelectedIds(new Set())
    } catch (error: unknown) {
      console.error("Error creating retry task:", error)
      adminToast.error(getErrorMessage(error) || "Failed to create retry task")
    } finally {
      setIsRetrying(false)
    }
  }

  const handleExportCSV = () => {
    const headers = [
      "Campaign",
      "Email",
      "Failed At",
      "Error Message",
      "Retry Count",
      "Permanent Failure",
    ]
    const rows = failedSends.map((send) => [
      send.campaign_subject,
      send.email,
      // 使用最后一次失败时间：优先使用 last_retry_at，否则使用 updated_at
      new Date(send.last_retry_at || send.updated_at || send.created_at).toLocaleString(),
      send.error_message,
      send.retry_count.toString(),
      send.is_permanent_failure ? "Yes" : "No",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `failed-sends-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDateChart = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const retryableCount = failedSends.filter(
    (s) => !s.is_permanent_failure && s.retry_count < 3
  ).length
  const permanentFailures = failedSends.filter((s) => s.is_permanent_failure).length

  // 检查 URL 参数中是否有 task_id（从通知跳转过来）
  useEffect(() => {
    const taskId = searchParams?.get("task_id")
    if (taskId) {
      adminToast.info(`Viewing task: ${taskId.substring(0, 8)}...`)
      // 刷新数据以显示最新状态
      fetchFailedSends()
      fetchStats()
    }
  }, [searchParams, fetchFailedSends, fetchStats])

  // Prepare chart data
  const reasonChartData = stats
    ? Object.entries(stats.failed_by_reason)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    : []

  const campaignChartData = stats?.failed_by_campaign.slice(0, 10) || []

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Failed Email Management</h1>
          <p className="text-muted-foreground mt-2">
            View and retry failed sends; bounces from Resend webhooks appear in Campaign
            details and may deactivate subscribers automatically.
          </p>
        </div>

        <NewsletterDeliveryPanel
          variant="compact"
          footnote="Manual retries send one email per row via Resend/SMTP. Hard bounces are usually updated by the Resend webhook — check Campaigns for broadcast-level issues."
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Retryable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{retryableCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Permanent Failures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{permanentFailures}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.recent_failures
                  .slice(-7)
                  .reduce((sum, item) => sum + item.count, 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Charts */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Failed by Reason</CardTitle>
                <CardDescription>Top 10 failure reasons</CardDescription>
              </CardHeader>
              <CardContent>
                {reasonChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reasonChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name.substring(0, 20)}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {reasonChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
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
                <CardTitle>Failed by Campaign</CardTitle>
                <CardDescription>Top 10 campaigns with failures</CardDescription>
              </CardHeader>
              <CardContent>
                {campaignChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={campaignChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="campaign_subject"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="failed_count" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => {
                    setSearchEmail(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedCampaignId}
                onValueChange={(value) => {
                  setSelectedCampaignId(value)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="md:col-span-2">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => setIsRetryDialogOpen(true)}
            disabled={selectedIds.size === 0 || isRetrying}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Selected ({selectedIds.size})
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const allRetryableIds = failedSends
                .filter((s) => !s.is_permanent_failure && s.retry_count < 3)
                .map((s) => s.id)
              if (allRetryableIds.length > 0) {
                handleRetry(allRetryableIds)
              } else {
                adminToast.info("No retryable emails found")
              }
            }}
            disabled={isRetrying}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry All Retryable
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Failed Sends Table */}
        <Card>
          <CardHeader>
            <CardTitle>Failed Emails</CardTitle>
            <CardDescription>
              {total} failed email{total !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : failedSends.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No failed emails found</p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              failedSends.length > 0 &&
                              selectedIds.size === failedSends.length
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Last Failed At</TableHead>
                        <TableHead>Error Message</TableHead>
                        <TableHead>Retry Count</TableHead>
                        <TableHead>Resend ID</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedSends.map((send) => {
                        const isRetryable =
                          !send.is_permanent_failure && send.retry_count < 3
                        return (
                          <TableRow key={send.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(send.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectOne(send.id, checked as boolean)
                                }
                                disabled={!isRetryable}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {send.campaign_subject}
                            </TableCell>
                            <TableCell>{send.email}</TableCell>
                            <TableCell>
                              {formatDate(send.last_retry_at || send.updated_at || send.created_at)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  send.is_permanent_failure
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="max-w-xs truncate"
                                title={send.error_message}
                              >
                                {send.error_message}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {send.retry_count}/3
                              {send.retry_count >= 3 && (
                                <Badge variant="outline" className="ml-2">
                                  Max
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate" title={send.resend_email_id || undefined}>
                              {send.resend_email_id ? send.resend_email_id.slice(0, 8) + "…" : "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetry([send.id])}
                                disabled={!isRetryable || isRetrying}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Retry
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
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

        {/* Retry Confirmation Dialog */}
        <Dialog open={isRetryDialogOpen} onOpenChange={setIsRetryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Retry</DialogTitle>
              <DialogDescription>
                Are you sure you want to retry {selectedIds.size} failed email
                {selectedIds.size !== 1 ? "s" : ""}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRetryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => handleRetry()}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}

export default function FailedSendsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <FailedSendsPageContent />
    </Suspense>
  )
}
