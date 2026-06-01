'use client'

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Check, CheckCheck, Loader2, Filter, ArrowLeft } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { adminToast } from "@/lib/admin-toast"
import { useRouter } from "next/navigation"

interface NotificationData {
  task_id?: string
  success_count?: number
  failed_count?: number
  skipped_count?: number
  sent_count?: number
  total_recipients?: number
  [key: string]: unknown
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: NotificationData
  is_read: boolean
  read_at: string | null
  created_at: string
}

function NotificationsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingRead, setIsMarkingRead] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const limit = 20

  // Filters
  const [isReadFilter, setIsReadFilter] = useState<string>("all") // 'all', 'read', 'unread'
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      if (isReadFilter === "read") {
        params.append("is_read", "true")
      } else if (isReadFilter === "unread") {
        params.append("is_read", "false")
      }

      if (typeFilter !== "all") {
        params.append("type", typeFilter)
      }

      const response = await fetch(`/api/admin/notifications?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch notifications")
      const data = await response.json()
      setNotifications(data.notifications || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
      setUnreadCount(data.unread_count || 0)
    } catch (error: unknown) {
      console.error("Error fetching notifications:", error)
      adminToast.error("Failed to load notifications")
    } finally {
      setIsLoading(false)
    }
  }, [page, isReadFilter, typeFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    setIsMarkingRead(id)
    try {
      const response = await fetch(`/api/admin/notifications/${id}/read`, {
        method: "PUT",
      })
      if (!response.ok) throw new Error("Failed to mark as read")
      adminToast.success("Notification marked as read")
      fetchNotifications()
    } catch (error: unknown) {
      console.error("Error marking notification as read:", error)
      adminToast.error("Failed to mark notification as read")
    } finally {
      setIsMarkingRead(null)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/admin/notifications/read-all", {
        method: "PUT",
      })
      if (!response.ok) throw new Error("Failed to mark all as read")
      adminToast.success("All notifications marked as read")
      fetchNotifications()
    } catch (error: unknown) {
      console.error("Error marking all as read:", error)
      adminToast.error("Failed to mark all notifications as read")
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // 根据通知类型跳转
    if (notification.type === "retry_task_completed" && notification.data?.task_id) {
      router.push(`/admin/newsletter/failed-sends?task_id=${notification.data.task_id}`)
    } else if (notification.type === "retry_task_failed" && notification.data?.task_id) {
      router.push(`/admin/newsletter/failed-sends?task_id=${notification.data.task_id}`)
    } else if (notification.type === "newsletter_sent" && notification.data?.campaign_id) {
      router.push(`/admin/newsletter/campaigns`)
    } else if (notification.type === "newsletter_failed" && notification.data?.campaign_id) {
      router.push(`/admin/newsletter/campaigns`)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getResultBadge = (notification: Notification) => {
    if (notification.type === "retry_task_completed" && notification.data) {
      const success_count = notification.data.success_count ?? 0
      const failed_count = notification.data.failed_count ?? 0
      const skipped_count = notification.data.skipped_count ?? 0
      if (success_count > 0 && failed_count === 0) {
        return <Badge variant="default" className="bg-green-500">Success: {success_count}</Badge>
      } else if (success_count > 0 && failed_count > 0) {
        return (
          <div className="flex gap-1 flex-wrap">
            <Badge variant="default" className="bg-green-500">Success: {success_count}</Badge>
            <Badge variant="destructive">Failed: {failed_count}</Badge>
            {skipped_count > 0 && <Badge variant="secondary">Skipped: {skipped_count}</Badge>}
          </div>
        )
      } else if (failed_count > 0) {
        return <Badge variant="destructive">All Failed: {failed_count}</Badge>
      }
    } else if (notification.type === "retry_task_failed") {
      return <Badge variant="destructive">Task Failed</Badge>
    } else if (notification.type === "newsletter_sent" && notification.data) {
      const sent_count = notification.data.sent_count ?? 0
      const failed_count = notification.data.failed_count ?? 0
      if (failed_count === 0) {
        return <Badge variant="default" className="bg-green-500">Sent: {sent_count}</Badge>
      } else {
        return (
          <div className="flex gap-1 flex-wrap">
            <Badge variant="default" className="bg-green-500">Sent: {sent_count}</Badge>
            <Badge variant="destructive">Failed: {failed_count}</Badge>
          </div>
        )
      }
    } else if (notification.type === "newsletter_failed" && notification.data) {
      const { failed_count, total_recipients } = notification.data
      return <Badge variant="destructive">Failed: {failed_count}/{total_recipients}</Badge>
    }
    return null
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/newsletter/subscribers")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Subscribers
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Manage and view all your notifications
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{total - unreadCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Read Status</label>
              <Select value={isReadFilter} onValueChange={setIsReadFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="read">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="retry_task_completed">Retry Task Completed</SelectItem>
                        <SelectItem value="retry_task_failed">Retry Task Failed</SelectItem>
                        <SelectItem value="newsletter_sent">Newsletter Sent</SelectItem>
                        <SelectItem value="newsletter_failed">Newsletter Failed</SelectItem>
                      </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {unreadCount > 0 && (
                <Button onClick={markAllAsRead} variant="outline">
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>
            {total} notification{total !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notifications found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow
                        key={notification.id}
                        className={`cursor-pointer ${!notification.is_read ? "bg-muted/50" : ""}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <TableCell>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {notification.title}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm line-clamp-2">{notification.message}</p>
                        </TableCell>
                        <TableCell>
                          {getResultBadge(notification)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{notification.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(notification.created_at)}
                        </TableCell>
                        <TableCell>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              disabled={isMarkingRead === notification.id}
                              title="Mark as read"
                            >
                              {isMarkingRead === notification.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </div>
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
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <NotificationsPageContent />
    </Suspense>
  )
}
