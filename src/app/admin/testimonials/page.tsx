'use client'

import { useEffect, useMemo, useState } from "react"
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

interface CampusOption {
  id: string
  name: string
  display_name: string | null
  is_active: boolean
  franchise?: { id: string; name: string; code?: string } | { id: string; name: string; code?: string }[]
}

interface UserOption {
  id: string
  name: string
  email: string
  image?: string | null
  role: string
  is_test_user?: boolean
}

interface TestimonialRow {
  id: string
  user_id: string
  campus_id: string | null
  comment: string
  display_order: number
  is_active: boolean
  name: string
  email: string | null
  image_url: string | null
  location_name: string | null
}

const EMPTY_FORM = {
  user_id: "",
  comment: "",
  campus_id: "",
  display_order: 0,
  is_active: true,
}

function campusIdForSelect(
  campusId: string | null | undefined,
  campuses: CampusOption[]
): string {
  if (!campusId) return ""
  return campuses.some((c) => c.id === campusId) ? campusId : ""
}

function unwrapFranchise(
  franchise: CampusOption["franchise"]
): { name: string } | null {
  if (!franchise) return null
  if (Array.isArray(franchise)) return franchise[0] ?? null
  return franchise
}

function campusLabel(campus: CampusOption): string {
  const label = campus.display_name || campus.name
  const franchiseName = unwrapFranchise(campus.franchise)?.name
  return franchiseName ? `${label} (${franchiseName})` : label
}

export default function TestimonialsAdminPage() {
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>([])
  const [filteredTestimonials, setFilteredTestimonials] = useState<TestimonialRow[]>([])
  const [campuses, setCampuses] = useState<CampusOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TestimonialRow | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectableUsers = useMemo(
    () => users.filter((u) => u.role === "user" && !u.is_test_user),
    [users]
  )

  const selectedUser = useMemo(() => {
    if (editing) {
      return {
        name: editing.name,
        email: editing.email,
        image: editing.image_url,
      }
    }
    return selectableUsers.find((u) => u.id === formData.user_id) ?? null
  }, [editing, formData.user_id, selectableUsers])

  useEffect(() => {
    fetchTestimonials()
    fetchCampuses()
    fetchUsers()
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
          (item.location_name || "").toLowerCase().includes(q) ||
          (item.email || "").toLowerCase().includes(q)
      )
    )
  }, [searchQuery, testimonials])

  useEffect(() => {
    if (!isDialogOpen || editing || !formData.campus_id || campuses.length === 0) return
    if (!campuses.some((c) => c.id === formData.campus_id)) {
      setFormData((prev) => ({ ...prev, campus_id: "" }))
    }
  }, [isDialogOpen, editing, campuses, formData.campus_id])

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
      setError(e instanceof Error ? getErrorMessage(e) : "Failed to load testimonials")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCampuses = async () => {
    try {
      const res = await fetch("/api/blaze/campuses")
      if (res.ok) {
        const data = await res.json()
        setCampuses(data || [])
      }
    } catch (e) {
      console.error("Failed to fetch campuses:", e)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data || [])
      }
    } catch (e) {
      console.error("Failed to fetch users:", e)
    }
  }

  const openDialog = (item?: TestimonialRow) => {
    if (item) {
      setEditing(item)
      setFormData({
        user_id: item.user_id,
        comment: item.comment,
        campus_id: campusIdForSelect(item.campus_id, campuses),
        display_order: item.display_order,
        is_active: item.is_active,
      })
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
    setFormData(EMPTY_FORM)
  }

  const handleSubmit = async () => {
    if (!formData.comment.trim()) {
      setError("Quote is required")
      return
    }
    if (!editing && !formData.user_id) {
      setError("Please select a parent user")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = editing
        ? {
            comment: formData.comment.trim(),
            campus_id: formData.campus_id || null,
            display_order: formData.display_order,
            is_active: formData.is_active,
          }
        : {
            user_id: formData.user_id,
            comment: formData.comment.trim(),
            campus_id: formData.campus_id || null,
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

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          (typeof data.error === "string" && data.error) || "Failed to save testimonial"
        )
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
            Leave location empty for network-wide quotes. Lower display order appears first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, comment, or location..."
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
                    <TableHead>Location</TableHead>
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
                        {item.location_name ? (
                          <Badge variant="secondary">{item.location_name}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Network-wide</span>
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
              Quotes appear on the home page and location pages. Author info comes from the user record only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>Parent name</Label>
                  <Input value={editing.name} readOnly disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={editing.email || ""}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Parent name *</Label>
                <Select
                  value={formData.user_id || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, user_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedUser ? (
              <>
                {!editing ? (
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={selectedUser.email || ""}
                      readOnly
                      disabled
                      className="bg-muted"
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex items-center gap-3">
                    {selectedUser.image ? (
                      <Image
                        src={selectedUser.image}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {(selectedUser.name || "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      From user profile (not editable here).
                    </p>
                  </div>
                </div>
              </>
            ) : null}

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
              <Label>Location scope</Label>
              <Select
                value={formData.campus_id || "all"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    campus_id: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Network-wide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Network-wide (all locations)</SelectItem>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campusLabel(campus)}
                      {!campus.is_active ? " (inactive)" : ""}
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
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save changes" : "Create testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
