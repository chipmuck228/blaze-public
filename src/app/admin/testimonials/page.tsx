'use client'

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PosterUploadField } from "@/components/ui/poster-upload-field"
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  RefreshCcw,
  Search,
  MessageSquareQuote,
  Eye,
  EyeOff,
} from "lucide-react"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"

interface FranchiseOption {
  id: string
  code: string
  name: string
  is_active: boolean
}

interface TestimonialRow {
  id: string
  user_id: string
  franchise_id: string | null
  comment: string
  display_order: number
  is_active: boolean
  name: string
  email: string | null
  image_url: string | null
  franchise_code: string | null
  franchise_name: string | null
}

const EMPTY_FORM = {
  name: "",
  email: "",
  image_url: "",
  comment: "",
  franchise_id: "",
  display_order: 0,
  is_active: true,
}

export default function TestimonialsAdminPage() {
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>([])
  const [filteredTestimonials, setFilteredTestimonials] = useState<TestimonialRow[]>([])
  const [franchises, setFranchises] = useState<FranchiseOption[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TestimonialRow | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    fetchTestimonials()
    fetchFranchises()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTestimonials(testimonials)
      return
    }

    const q = searchQuery.toLowerCase()
    setFilteredTestimonials(
      testimonials.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.comment.toLowerCase().includes(q) ||
          (item.franchise_name || "").toLowerCase().includes(q) ||
          (item.email || "").toLowerCase().includes(q)
      )
    )
  }, [searchQuery, testimonials])

  const fetchTestimonials = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/testimonials")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to fetch testimonials")
      }
      const data = await res.json()
      setTestimonials(data.testimonials || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load testimonials")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFranchises = async () => {
    try {
      const res = await fetch("/api/admin/franchises/v2?includeInactive=true")
      if (res.ok) {
        const data = await res.json()
        setFranchises(data || [])
      }
    } catch (e) {
      console.error("Failed to fetch franchises:", e)
    }
  }

  const resetAvatarState = () => {
    if (avatarPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }
    setAvatarFile(null)
    setAvatarPreviewUrl(null)
  }

  const openDialog = (item?: TestimonialRow) => {
    resetAvatarState()
    if (item) {
      setEditing(item)
      setFormData({
        name: item.name,
        email: item.email || "",
        image_url: item.image_url || "",
        comment: item.comment,
        franchise_id: item.franchise_id || "",
        display_order: item.display_order,
        is_active: item.is_active,
      })
      setAvatarPreviewUrl(item.image_url || null)
    } else {
      setEditing(null)
      setFormData({
        ...EMPTY_FORM,
        display_order: testimonials.length,
      })
    }
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditing(null)
    resetAvatarState()
    setFormData(EMPTY_FORM)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (avatarPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }

    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  const uploadAvatarIfNeeded = async (): Promise<string | null> => {
    if (!avatarFile) {
      return formData.image_url || null
    }

    setIsUploadingAvatar(true)
    try {
      const body = new FormData()
      body.append("file", avatarFile)

      const res = await fetch("/api/admin/teams/upload", {
        method: "POST",
        body,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to upload avatar")
      }

      const data = await res.json()
      return data.url as string
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.comment.trim()) {
      setError("Name and comment are required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const image_url = await uploadAvatarIfNeeded()
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        image_url,
        comment: formData.comment.trim(),
        franchise_id: formData.franchise_id || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
      }

      const res = await fetch(
        editing ? `/api/admin/testimonials/${editing.id}` : "/api/admin/testimonials",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save testimonial")
      }

      closeDialog()
      await fetchTestimonials()
      adminToast.success(
        editing ? "Testimonial updated" : "Testimonial created"
      )
    } catch (e) {
      const message = getErrorMessage(e, "Failed to save testimonial")
      setError(message)
      adminToast.error("Failed to save testimonial", { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await adminConfirm({
      title: "Delete this testimonial?",
      confirmLabel: "Delete",
    }))) return

    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete testimonial")
      }
      await fetchTestimonials()
      adminToast.success("Testimonial deleted")
    } catch (e) {
      const message = getErrorMessage(e, "Failed to delete testimonial")
      setError(message)
      adminToast.error("Failed to delete testimonial", { description: message })
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquareQuote className="h-6 w-6 text-primary" strokeWidth={1} />
            Testimonials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage parent quotes shown on the home page and location pages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTestimonials} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Testimonial
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All Testimonials</CardTitle>
          <CardDescription>
            Leave campus empty for network-wide quotes. Lower display order appears first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, comment, or campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTestimonials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No testimonials yet. Add one to show on the marketing site.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTestimonials.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[160px]">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt=""
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {item.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.email ? (
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {item.email}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className="text-sm line-clamp-2">{item.comment}</p>
                      </TableCell>
                      <TableCell>
                        {item.franchise_name ? (
                          <Badge variant="secondary">{item.franchise_name}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">All campuses</span>
                        )}
                      </TableCell>
                      <TableCell>{item.display_order}</TableCell>
                      <TableCell>
                        {item.is_active ? (
                          <Badge className="gap-1">
                            <Eye className="h-3 w-3" strokeWidth={1} />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <EyeOff className="h-3 w-3" strokeWidth={1} />
                            Hidden
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog(item)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>
              Quotes appear in the scrolling testimonials section on the home page and campus pages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Parent name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Optional — links to an existing user if found"
              />
              <p className="text-xs text-muted-foreground">
                If omitted, a placeholder author account is created for display only.
              </p>
            </div>

            <PosterUploadField
              id="avatar"
              label="Avatar"
              hint="Optional profile photo (square works best)."
              previewSrc={avatarPreviewUrl}
              onFileChange={handleAvatarChange}
              onClear={() => {
                resetAvatarState()
                setFormData({ ...formData, image_url: "" })
              }}
              isLoading={isUploadingAvatar}
            />

            <div className="space-y-2">
              <Label htmlFor="comment">Quote *</Label>
              <Textarea
                id="comment"
                rows={5}
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="What did the parent say?"
              />
            </div>

            <div className="space-y-2">
              <Label>Campus scope</Label>
              <Select
                value={formData.franchise_id || "all"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    franchise_id: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All campuses (network-wide)</SelectItem>
                  {franchises.map((franchise) => (
                    <SelectItem key={franchise.id} value={franchise.id}>
                      {franchise.name}
                      {!franchise.is_active ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked === true })
                    }
                  />
                  <Label htmlFor="is_active" className="font-normal">
                    Show on site
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isUploadingAvatar}>
              {(isSubmitting || isUploadingAvatar) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editing ? "Save changes" : "Create testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
