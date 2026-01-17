'use client'

import { useState, useEffect } from "react"
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
import { Loader2, Send, Clock } from "lucide-react"
import { toast } from "sonner"

interface NewsletterTemplate {
  id: string
  name: string
  subject: string
  content_html: string
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

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/newsletter/templates")

      if (!response.ok) {
        throw new Error("Failed to fetch templates")
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error: any) {
      console.error("Error fetching templates:", error)
      toast.error("Failed to load templates")
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
      toast.error("Please select a template and enter a test email")
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

      toast.success("Test email sent successfully!")
      setTestEmail("")
    } catch (error: any) {
      console.error("Error sending test email:", error)
      toast.error(error.message || "Failed to send test email")
    } finally {
      setIsSending(false)
    }
  }

  const handleSend = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template")
      return
    }

    if (sendMode === "schedule" && !scheduledAt) {
      toast.error("Please select a scheduled time")
      return
    }

    if (!confirm(`Are you sure you want to ${sendMode === "now" ? "send" : "schedule"} this newsletter?`)) {
      return
    }

    setIsSending(true)
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

      toast.success(
        sendMode === "now"
          ? "Newsletter sending started!"
          : `Newsletter scheduled for ${new Date(scheduledAt).toLocaleString()}`
      )

      // 重置表单
      setSelectedTemplateId("")
      setCustomSubject("")
      setScheduledAt("")
      setPreviewContent("")
    } catch (error: any) {
      console.error("Error sending newsletter:", error)
      toast.error(error.message || `Failed to ${sendMode === "now" ? "send" : "schedule"} newsletter`)
    } finally {
      setIsSending(false)
    }
  }

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
                  disabled={!selectedTemplateId || isSending}
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
