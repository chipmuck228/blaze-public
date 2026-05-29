'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2, Send, Clock, CheckCircle, XCircle } from "lucide-react"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"

interface NewsletterTemplate {
  id: string
  name: string
  subject: string
  content_html: string
  is_active: boolean
}

export default function NewsletterSendPage() {
  const [templates, setTemplates] = useState<NewsletterTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [customSubject, setCustomSubject] = useState<string>("")
  const [testEmail, setTestEmail] = useState<string>("")
  const [scheduledAt, setScheduledAt] = useState<string>("")
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [previewContent, setPreviewContent] = useState<string>("")
  
  // SSE 相关状态
  const [sendingProgress, setSendingProgress] = useState<{
    sent: number
    failed: number
    total: number
    progress: number
    status: string
  } | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetchTemplates()
    // 检查是否有正在发送的 campaign，如果有则重新连接 SSE
    checkActiveCampaign()
  }, [])

  // 检查是否有正在发送的 campaign
  const checkActiveCampaign = async () => {
    try {
      const response = await fetch("/api/admin/newsletter/campaigns?status=sending&limit=1")
      if (response.ok) {
        const data = await response.json()
        if (data.campaigns && data.campaigns.length > 0) {
          const activeCampaign = data.campaigns[0]
          
          // 检查 campaign 是否卡住了（超过30分钟没有更新）
          const createdAt = new Date(activeCampaign.created_at)
          const now = new Date()
          const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60)
          
          // 如果 campaign 创建超过30分钟且没有进度，可能是卡住了
          if (minutesSinceCreation > 30 && activeCampaign.sent_count === 0 && activeCampaign.failed_count === 0) {
            console.warn(`[checkActiveCampaign] Campaign ${activeCampaign.id} appears to be stuck (created ${minutesSinceCreation.toFixed(1)} minutes ago with no progress)`)
            // 不恢复这个 campaign，清理状态
            setIsSending(false)
            setSendingProgress(null)
            return
          }
          
          // 检查是否所有邮件都已处理但状态还是 sending
          const processedCount = (activeCampaign.sent_count || 0) + (activeCampaign.failed_count || 0)
          if (processedCount >= activeCampaign.total_recipients && activeCampaign.total_recipients > 0) {
            console.warn(`[checkActiveCampaign] Campaign ${activeCampaign.id} has all emails processed but status is still sending`)
            // 不恢复这个 campaign，让 SSE 流自动修复
            setIsSending(false)
            setSendingProgress(null)
            return
          }
          
          // 恢复进度显示
          setSendingProgress({
            sent: activeCampaign.sent_count || 0,
            failed: activeCampaign.failed_count || 0,
            total: activeCampaign.total_recipients || 0,
            progress: activeCampaign.total_recipients > 0
              ? Math.round(((activeCampaign.sent_count || 0) + (activeCampaign.failed_count || 0)) / activeCampaign.total_recipients * 100)
              : 0,
            status: activeCampaign.status || "sending",
          })
          // 重新连接 SSE
          startSSEListener(activeCampaign.id)
          setIsSending(true)
        } else {
          // 如果没有正在发送的 campaign，确保清理状态
          setIsSending(false)
          setSendingProgress(null)
        }
      } else {
        // 如果请求失败，清理状态
        setIsSending(false)
        setSendingProgress(null)
      }
    } catch (error) {
      console.error("Error checking active campaign:", error)
      // 出错时也清理状态，避免按钮一直禁用
      setIsSending(false)
      setSendingProgress(null)
    }
  }

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/newsletter/templates")

      if (!response.ok) {
        throw new Error("Failed to fetch templates")
      }

      const data = await response.json()
      // 只显示 active 的 templates
      const activeTemplates = (data.templates || []).filter((t: NewsletterTemplate) => t.is_active)
      setTemplates(activeTemplates)
    } catch (error: any) {
      console.error("Error fetching templates:", error)
      adminToast.error("Failed to load templates")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId)
      if (template) {
        setPreviewContent(template.content_html)
        if (!customSubject) {
          setCustomSubject(template.subject)
        }
      }
    }
  }, [selectedTemplateId, templates])

  const handleTestSend = async () => {
    if (!selectedTemplateId || !testEmail) {
      adminToast.error("Please select a template and enter a test email")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/admin/newsletter/campaigns/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          subject: customSubject,
          test_email: testEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send test email")
      }

      adminToast.success("Test email sent")
      setTestEmail("")
    } catch (error: any) {
      console.error("Error sending test email:", error)
      adminToast.error("Failed to send test email", {
        description: getErrorMessage(error),
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleSend = async () => {
    if (!selectedTemplateId) {
      adminToast.error("Please select a template")
      return
    }

    if (sendMode === "schedule" && !scheduledAt) {
      adminToast.error("Please select a scheduled time")
      return
    }

    if (!(await adminConfirm({
      title: sendMode === "now" ? "Send this newsletter?" : "Schedule this newsletter?",
      confirmLabel: sendMode === "now" ? "Send" : "Schedule",
    }))) {
      return
    }

    setIsSending(true)
    setSendingProgress(null)

    try {
      const url = sendMode === "now"
        ? "/api/admin/newsletter/campaigns/send"
        : "/api/admin/newsletter/campaigns/schedule"

      const body: any = {
        template_id: selectedTemplateId,
      }

      if (customSubject) {
        body.subject = customSubject
      }

      if (sendMode === "schedule") {
        body.scheduled_at = new Date(scheduledAt).toISOString()
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${sendMode === "now" ? "send" : "schedule"} newsletter`)
      }

      if (sendMode === "now" && data.campaign_id) {
        // 立即显示初始进度
        setSendingProgress({
          sent: 0,
          failed: 0,
          total: data.total_recipients || 0,
          progress: 0,
          status: "sending",
        })
        // 启动 SSE 监听发送进度
        startSSEListener(data.campaign_id)
        adminToast.success("Newsletter sending started", {
          description: "Progress will be shown below.",
        })
      } else {
        adminToast.success("Newsletter scheduled", {
          description: `Scheduled for ${new Date(scheduledAt).toLocaleString()}`,
        })
        // 重置表单
        setSelectedTemplateId("")
        setCustomSubject("")
        setScheduledAt("")
        setPreviewContent("")
        setIsSending(false)
      }
    } catch (error: any) {
      console.error("Error sending newsletter:", error)
      adminToast.error(`Failed to ${sendMode === "now" ? "send" : "schedule"} newsletter`, {
        description: getErrorMessage(error),
      })
      setIsSending(false)
      setSendingProgress(null)
    }
  }

  const startSSEListener = (campaignId: string) => {
    // 关闭之前的连接（如果存在）
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`/api/admin/newsletter/campaigns/send/stream?campaign_id=${campaignId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === "connected") {
          console.log("[Send Page] SSE connected")
        } else if (data.type === "progress") {
          const status = data.status || "sending"
          setSendingProgress({
            sent: data.sent_count || 0,
            failed: data.failed_count || 0,
            total: data.total_recipients || 0,
            progress: data.progress || 0,
            status: status,
          })
          
          // 如果状态已经是完成状态，立即处理完成逻辑
          if (status === "sent" || status === "failed") {
            // 关闭 SSE 连接
            eventSource.close()
            eventSourceRef.current = null
            
            // 重要：设置 isSending 为 false，允许用户发送新的 newsletter
            setIsSending(false)
            
            // 触发通知刷新
            window.dispatchEvent(new Event('refreshNotifications'))
          }
        } else if (data.type === "completed") {
          setSendingProgress({
            sent: data.sent_count || 0,
            failed: data.failed_count || 0,
            total: data.total_recipients || 0,
            progress: 100,
            status: data.status || "sent",
          })
          
          // 关闭 SSE 连接
          eventSource.close()
          eventSourceRef.current = null
          
          // 重要：设置 isSending 为 false，允许用户发送新的 newsletter
          setIsSending(false)
          
          // 不在这里显示 toast，让通知系统处理
          // 触发通知刷新
          window.dispatchEvent(new Event('refreshNotifications'))

          // 不自动重置表单，让用户可以选择继续发送或查看结果
          // 用户可以手动重置或发送新的 newsletter
          
          // 延迟清理进度显示（可选：让用户看到完成状态）
          // 如果希望立即清理，可以取消注释下面这行：
          // setTimeout(() => setSendingProgress(null), 5000)
        }
      } catch (error) {
        console.error("[Send Page] Error parsing SSE message:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("[Send Page] SSE error:", error)
      eventSource.close()
      eventSourceRef.current = null
      setIsSending(false)
      adminToast.error("Connection to progress stream lost", {
        description: "Check notifications for completion status.",
      })
    }
  }

  // 清理 SSE 连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Send Newsletter</h1>
        <p className="text-muted-foreground mt-2">
          Send newsletter to all active subscribers
        </p>
      </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <Card>
              <CardHeader>
                <CardTitle>Newsletter Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label htmlFor="template">Template *</Label>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Select
                      value={selectedTemplateId}
                      onValueChange={setSelectedTemplateId}
                    >
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Custom Subject */}
                {selectedTemplate && (
                  <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Leave empty to use template subject"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: {selectedTemplate.subject}
                    </p>
                  </div>
                )}

                {/* Send Mode */}
                <div className="space-y-2">
                  <Label>Send Mode</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={sendMode === "now" ? "default" : "outline"}
                      onClick={() => setSendMode("now")}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Now
                    </Button>
                    <Button
                      type="button"
                      variant={sendMode === "schedule" ? "default" : "outline"}
                      onClick={() => setSendMode("schedule")}
                      className="flex-1"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                  </div>
                </div>

                {/* Scheduled Time */}
                {sendMode === "schedule" && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at">Scheduled Time *</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      required
                    />
                  </div>
                )}

                {/* Test Email */}
                <div className="space-y-2">
                  <Label htmlFor="test_email">Test Email (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="test_email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestSend}
                      disabled={!selectedTemplateId || !testEmail || isSending}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Send Test"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send a test email before sending to all subscribers
                  </p>
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={!selectedTemplateId || (isSending && sendingProgress?.status === "sending")}
                  className="w-full"
                  size="lg"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {sendMode === "now" ? "Sending..." : "Scheduling..."}
                    </>
                  ) : sendMode === "now" ? (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Newsletter
                    </>
                  ) : (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Schedule Newsletter
                    </>
                  )}
                </Button>

                {/* Sending Progress */}
                {sendingProgress && sendMode === "now" && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Sending Progress</span>
                      <span className="text-muted-foreground">
                        {sendingProgress.progress}%
                      </span>
                    </div>
                    <Progress value={sendingProgress.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Sent: {sendingProgress.sent}
                        </span>
                        {sendingProgress.failed > 0 && (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" />
                            Failed: {sendingProgress.failed}
                          </span>
                        )}
                      </div>
                      <span>Total: {sendingProgress.total}</span>
                    </div>
                    {sendingProgress.status === "sent" && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Newsletter sent successfully! Check notifications for details.</span>
                      </div>
                    )}
                    {sendingProgress.status === "failed" && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>Sending failed. Check notifications for details.</span>
                      </div>
                    )}
                    {sendingProgress.status === "sending" && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending in progress... You can leave this page and check back later.</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Subject:</Label>
                      <p className="font-semibold">
                        {customSubject || selectedTemplate.subject}
                      </p>
                    </div>
                    <div>
                      <Label>Content Preview:</Label>
                      <div
                        className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-muted/30"
                        dangerouslySetInnerHTML={{ __html: previewContent }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a template to preview
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
    </div>
  )
}
