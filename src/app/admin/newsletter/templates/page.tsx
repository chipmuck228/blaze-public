'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, MoreVertical, Edit, Loader2, Power, PowerOff } from "lucide-react"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"
import {
  NewsletterTemplateEditor,
  createEmptyEditorValue,
  type NewsletterTemplateEditorValue,
} from "@/components/admin/newsletter/NewsletterTemplateEditor"
import {
  defaultNewsletterTemplateConfig,
  parseTemplateForEditor,
} from "@/lib/newsletter-template-editor"
import {
  isSeededNewsletterTemplateName,
  LATEST_UPDATES_BODY_PLACEHOLDER,
} from "@/lib/newsletter-email-templates"

interface NewsletterTemplate {
  id: string
  name: string
  subject: string
  content_html: string
  content_text: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function NewsletterTemplatesPage() {
  const [templates, setTemplates] = useState<NewsletterTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<NewsletterTemplate | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [legacyFullHtml, setLegacyFullHtml] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content_text: "",
    is_active: true,
  })

  const [editorValue, setEditorValue] = useState<NewsletterTemplateEditorValue>(
    createEmptyEditorValue()
  )

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
    } catch (error: unknown) {
      console.error("Error fetching templates:", error)
      adminToast.error("Failed to load templates")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingTemplate(null)
    setFormData({
      name: "",
      subject: "",
      content_text: "",
      is_active: true,
    })
    setEditorValue({
      config: defaultNewsletterTemplateConfig(),
      bodyHtml: LATEST_UPDATES_BODY_PLACEHOLDER,
    })
    setLegacyFullHtml(false)
    setIsEditDialogOpen(true)
  }

  const handleEdit = (template: NewsletterTemplate) => {
    const parsed = parseTemplateForEditor(template.content_html, template.name)
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      content_text: template.content_text || "",
      is_active: template.is_active,
    })
    setEditorValue({
      config: parsed.config,
      bodyHtml: parsed.bodyHtml,
    })
    setLegacyFullHtml(parsed.legacyFullHtml)
    setIsEditDialogOpen(true)
  }

  const handleToggleActive = async (template: NewsletterTemplate) => {
    const nextActive = !template.is_active

    if (!nextActive) {
      const isSeeded = isSeededNewsletterTemplateName(template.name)
      const confirmed = await adminConfirm({
        title: isSeeded
          ? "Deactivate system template?"
          : "Deactivate this template?",
        confirmLabel: "Deactivate",
        ...(isSeeded
          ? {
              description:
                "This template is used for welcome emails, unsubscribe confirmation, or default campaigns. Deactivating may stop automated or scheduled sends that depend on it.",
            }
          : {}),
      })
      if (!confirmed) return
    }

    try {
      const response = await fetch(
        `/api/admin/newsletter/templates/${template.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: nextActive }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update template status")
      }

      adminToast.success(
        nextActive ? "Template activated" : "Template deactivated"
      )
      fetchTemplates()
    } catch (error: unknown) {
      console.error("Error toggling template status:", error)
      adminToast.error(getErrorMessage(error))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingTemplate
        ? `/api/admin/newsletter/templates/${editingTemplate.id}`
        : "/api/admin/newsletter/templates"
      const method = editingTemplate ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          content_text: formData.content_text || null,
          is_active: formData.is_active,
          editor: editorValue,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save template")
      }

      adminToast.success(
        `Template ${editingTemplate ? "updated" : "created"} successfully`
      )
      setIsEditDialogOpen(false)
      fetchTemplates()
    } catch (error: unknown) {
      console.error("Error saving template:", error)
      adminToast.error(
        error instanceof Error ? error.message : "Failed to save template"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Newsletter Templates</h1>
        <p className="text-muted-foreground mt-2">
          Edit message content and link settings. Templates used in past campaigns
          cannot be removed from the database — use <strong>Deactivate</strong> to
          hide a template from Send while keeping campaign history. Unsubscribe
          links are generated per subscriber at send time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Templates</CardTitle>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No templates found</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          {template.name}
                          {isSeededNewsletterTemplateName(template.name) ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              System
                            </Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            template.is_active ? "default" : "secondary"
                          }
                        >
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(template.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {template.is_active ? (
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(template)}
                              >
                                <PowerOff className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(template)}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[720px] lg:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Add New Template"}
            </DialogTitle>
            <DialogDescription>
              Configure website and contact links in Link settings. Use the body
              editor for your message only — not for unsubscribe URLs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Latest Updates — Newsletter"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  required
                />
              </div>

              <NewsletterTemplateEditor
                templateName={formData.name || "Custom Template"}
                value={editorValue}
                onChange={setEditorValue}
                legacyFullHtml={legacyFullHtml}
              />

              <div className="space-y-2">
                <Label htmlFor="content_text">Plain Text (optional)</Label>
                <Textarea
                  id="content_text"
                  value={formData.content_text}
                  onChange={(e) =>
                    setFormData({ ...formData, content_text: e.target.value })
                  }
                  rows={4}
                  className="font-mono text-sm"
                  placeholder="Optional plain-text version"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_active" className="font-normal">
                  Active (inactive templates are hidden from Send)
                </Label>
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingTemplate ? (
                  "Update Template"
                ) : (
                  "Create Template"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
