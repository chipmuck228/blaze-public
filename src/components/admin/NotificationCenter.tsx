'use client'

import { useState, useEffect, useCallback } from "react"
import { Bell, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { adminToast } from "@/lib/admin-toast"
import { useRouter } from "next/navigation"

interface NotificationData {
  task_id?: string
  campaign_id?: string
  success_count?: number
  failed_count?: number
  skipped_count?: number
  total_count?: number
  sent_count?: number
  total_recipients?: number
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: NotificationData
  is_read: boolean
  created_at: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set())

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/notifications?is_read=false&limit=20")
      if (!response.ok) throw new Error("Failed to fetch notifications")
      const data = await response.json()
      // 只显示最多5个未读通知，按时间顺序（最新的在前）
      const allNotifications = data.notifications || []
      const visibleNotifications = allNotifications
        .filter((n: Notification) => !dismissedNotifications.has(n.id))
        .slice(0, 5)
      setNotifications(visibleNotifications)
      setUnreadCount(data.unread_count || 0)
    } catch (error: unknown) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // 使用 useEffect 来处理 dismissedNotifications 的变化并初始加载
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications, dismissedNotifications])

  useEffect(() => {
    // 使用 SSE 进行实时更新
    let eventSource: EventSource | null = null
    let pollingInterval: NodeJS.Timeout | null = null

    try {
      eventSource = new EventSource("/api/admin/notifications/stream")

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === "connected") {
            console.log("[NotificationCenter] SSE connected")
          } else if (data.type === "new_notifications") {
            // 有新通知，立即刷新
            console.log(`[NotificationCenter] New notifications detected: ${data.count}`)
            fetchNotifications()
          }
        } catch (error) {
          console.error("[NotificationCenter] Error parsing SSE message:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("[NotificationCenter] SSE error:", error)
        // 如果 SSE 连接失败，回退到轮询机制
        if (eventSource?.readyState === EventSource.CLOSED) {
          console.log("[NotificationCenter] SSE closed, falling back to polling")
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          
          // 使用轮询作为备用
          if (!pollingInterval) {
            pollingInterval = setInterval(fetchNotifications, 10000) // 10秒轮询一次
          }
        }
      }
    } catch (error) {
      console.error("[NotificationCenter] Failed to create SSE connection:", error)
      // 回退到轮询机制
      pollingInterval = setInterval(fetchNotifications, 10000)
    }

    // 监听自定义事件以立即刷新通知（用于任务完成时的即时刷新）
    const handleRefreshNotifications = () => {
      fetchNotifications()
    }
    window.addEventListener('refreshNotifications', handleRefreshNotifications)
    
    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      window.removeEventListener('refreshNotifications', handleRefreshNotifications)
    }
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${id}/read`, {
        method: "PUT",
      })
      if (!response.ok) throw new Error("Failed to mark as read")
      fetchNotifications()
    } catch (error: unknown) {
      console.error("Error marking notification as read:", error)
      adminToast.error("Failed to mark notification as read")
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/admin/notifications/read-all", {
        method: "PUT",
      })
      if (!response.ok) throw new Error("Failed to mark all as read")
      fetchNotifications()
      adminToast.success("All notifications marked as read")
    } catch (error: unknown) {
      console.error("Error marking all as read:", error)
      adminToast.error("Failed to mark all notifications as read")
    }
  }

  const clearAllNotifications = () => {
    // 清除所有通知的显示（本地状态，不删除数据库）
    const allIds = notifications.map(n => n.id)
    setDismissedNotifications(prev => new Set([...prev, ...allIds]))
    setNotifications([])
    adminToast.success("Notifications cleared")
  }

  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

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

    setIsOpen(false)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="h-7 text-xs"
                  title="Clear all notifications"
                >
                  Clear
                </Button>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  // 根据通知类型和 data 获取发送结果信息
                  const getResultBadge = () => {
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
                      const failed_count = notification.data.failed_count ?? 0
                      const total_recipients = notification.data.total_recipients ?? 0
                      return <Badge variant="destructive">Failed: {failed_count}/{total_recipients}</Badge>
                    }
                    return null
                  }

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted transition-colors ${
                        !notification.is_read ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0" onClick={() => handleNotificationClick(notification)}>
                          <div className="flex items-start gap-2 mb-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {getResultBadge()}
                            <p className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setIsOpen(false)
                router.push("/admin/notifications")
              }}
            >
              View all notifications
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
