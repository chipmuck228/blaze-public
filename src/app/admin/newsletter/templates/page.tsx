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
import { Plus, MoreVertical, Edit, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { RichTextEditor } from "@/components/admin/RichTextEditor"

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

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content_html: "",
    content_text: "",
    is_active: true,
  })

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

  const handleAdd = () => {
    setEditingTemplate(null)
    setFormData({
      name: "",
      subject: "",
      content_html: "",
      content_text: "",
      is_active: true,
    })
    setIsEditDialogOpen(true)
  }

  const handleEdit = (template: NewsletterTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      content_html: template.content_html,
      content_text: template.content_text || "",
      is_active: template.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/newsletter/templates/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete template")
      }

      toast.success("Template deleted successfully")
      fetchTemplates()
    } catch (error: any) {
      console.error("Error deleting template:", error)
      toast.error(error.message || "Failed to delete template")
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
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save template")
      }

      toast.success(`Template ${editingTemplate ? "updated" : "created"} successfully`)
      setIsEditDialogOpen(false)
      fetchTemplates()
    } catch (error: any) {
      console.error("Error saving template:", error)
      toast.error(error.message || "Failed to save template")
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Newsletter Templates</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage newsletter email templates
        </p>
      </div>

      {/* Templates List */}
      <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Templates</CardTitle>
                </div>
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
                            {template.name}
                          </TableCell>
                          <TableCell>{template.subject}</TableCell>
                          <TableCell>
                            <Badge
                              variant={template.is_active ? "default" : "secondary"}
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
                                <DropdownMenuItem onClick={() => handleEdit(template)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(template.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
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

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[700px] lg:max-w-[800px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Add New Template"}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate
                    ? "Update newsletter template"
                    : "Create a new newsletter template"}
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
                      placeholder="e.g., Monthly Newsletter"
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
                      placeholder="e.g., Latest Updates from BlazeRobotics"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content_html">HTML Content *</Label>
                    <RichTextEditor
                      value={formData.content_html}
                      onChange={(value) =>
                        setFormData({ ...formData, content_html: value })
                      }
                      placeholder="Enter newsletter content... You can use variables like {{unsubscribe_link}} for unsubscribe link."
                    />
                    <p className="text-xs text-muted-foreground">
                      Use the editor above or switch to HTML mode. You can use variables like {"{{unsubscribe_link}}"} for unsubscribe link.
                    </p>
                    <div className="mt-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View/Edit HTML Source
                        </summary>
                        <Textarea
                          value={formData.content_html}
                          onChange={(e) =>
                            setFormData({ ...formData, content_html: e.target.value })
                          }
                          placeholder="HTML source code..."
                          rows={8}
                          className="font-mono text-sm mt-2"
                        />
                      </details>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content_text">Plain Text Content (Optional)</Label>
                    <Textarea
                      id="content_text"
                      value={formData.content_text}
                      onChange={(e) =>
                        setFormData({ ...formData, content_text: e.target.value })
                      }
                      placeholder="Enter plain text version (optional)..."
                      rows={8}
                      className="font-mono text-sm"
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
                      Active
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
