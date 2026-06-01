'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X, Plus, Upload, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { adminToast } from "@/lib/admin-toast"
import { isUsableTeamImageUrl } from "@/lib/team-avatar"
import type { StringKeyRecord } from "@/lib/typed-error"

interface TeamMember {
  id: string
  user_id?: string | null
  image_url: string
  name: string
  position: string
  description: string
  bio?: string
  display_order: number
  is_featured?: boolean
  is_active?: boolean
  social_networks: Array<{
    id: string
    name: string
    url: string
    display_order: number
  }>
  user?: {
    id: string
    name: string
    email: string
    image?: string
    role: string
  }
}

interface Coach {
  id: string
  name: string
  email: string
  image?: string
  role: string
  has_team_profile?: boolean
}

interface TeamEditDialogProps {
  team: TeamMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamUpdated: () => void
  prefilledUserId?: string  // 从 User Management 跳转时预填充的 user_id
}

export function TeamEditDialog({
  team,
  open,
  onOpenChange,
  onTeamUpdated,
  prefilledUserId,
}: TeamEditDialogProps) {
  const [userId, setUserId] = useState<string>("")
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [imageUrl, setImageUrl] = useState("")
  const [name, setName] = useState("")
  const [position, setPosition] = useState("")
  const [description, setDescription] = useState("")
  const [bio, setBio] = useState("")
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [socialNetworks, setSocialNetworks] = useState<Array<{ name: string; url: string; display_order: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(false)
  const [error, setError] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // 获取 coach 用户列表
  useEffect(() => {
    if (open) {
      fetchCoaches()
    }
  }, [open])

  const fetchCoaches = async () => {
    try {
      setIsLoadingCoaches(true)
      const response = await fetch("/api/admin/users/coaches")
      if (response.ok) {
        const data = await response.json()
        setCoaches(data)
      }
    } catch (error) {
      console.error("Error fetching coaches:", error)
    } finally {
      setIsLoadingCoaches(false)
    }
  }

  // 当选择 user_id 时，自动填充 name 和 image
  useEffect(() => {
    if (userId && coaches.length > 0) {
      const selectedCoach = coaches.find(c => c.id === userId)
      if (selectedCoach) {
        if (!team) {
          // 新建模式：自动填充
          setName(selectedCoach.name || "")
          if (selectedCoach.image) {
            setImageUrl(selectedCoach.image)
            setPreviewUrl(selectedCoach.image)
          }
        }
      }
    }
  }, [userId, coaches, team])

  useEffect(() => {
    if (open) {
      if (team) {
        // 编辑模式
        setUserId(team.user_id || "")
        setImageUrl(team.image_url || team.user?.image || "")
        setPreviewUrl(team.image_url || team.user?.image || null)
        setName(team.name || team.user?.name || "")
        setPosition(team.position || "")
        setDescription(team.description || "")
        setBio(team.bio || "")
        setDisplayOrder(team.display_order || 0)
        setIsFeatured(team.is_featured ?? false)
        setIsActive(team.is_active ?? true)
        setSocialNetworks(
          team.social_networks.map(sn => ({
            name: sn.name || "",
            url: sn.url || "",
            display_order: sn.display_order || 0,
          }))
        )
      } else {
        // 新建模式 - 清空所有字段
        setUserId(prefilledUserId || "")
        setImageUrl("")
        setPreviewUrl(null)
        setName("")
        setPosition("")
        setDescription("")
        setBio("")
        setDisplayOrder(0)
        setIsFeatured(false)
        setIsActive(true)
        setSocialNetworks([])
      }
      setError("")
      setIsLoading(false)
      setIsUploading(false)
    }
  }, [open, team, prefilledUserId])

  // 清理预览 URL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const addSocialNetwork = () => {
    setSocialNetworks([
      ...socialNetworks,
      { name: "", url: "", display_order: socialNetworks.length },
    ])
  }

  const removeSocialNetwork = (index: number) => {
    setSocialNetworks(socialNetworks.filter((_, i) => i !== index))
  }

  const updateSocialNetwork = (index: number, field: "name" | "url", value: string) => {
    const updated = [...socialNetworks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialNetworks(updated)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // 验证文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError("File size must be less than 5MB")
      return
    }

    setIsUploading(true)
    setError("")

    try {
      // 创建预览 URL
      const localPreviewUrl = URL.createObjectURL(file)
      setPreviewUrl(localPreviewUrl)

      // 上传到 Vercel Blob
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/admin/teams/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setPreviewUrl(null)
        setError(data.error || "Failed to upload image")
        setIsUploading(false)
        return
      }

      // 设置上传后的 URL
      setImageUrl(data.url)
      setPreviewUrl(data.url)
      setIsUploading(false)

      // 编辑模式：上传成功后立即写入 teams.image_url（无需等 Save）
      if (team?.id && data.url) {
        const patchRes = await fetch(`/api/admin/teams/${team.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: data.url }),
        })
        if (!patchRes.ok) {
          const patchData = await patchRes.json().catch(() => ({}))
          setError(patchData.error || "Avatar uploaded but failed to save to database")
          return
        }
        adminToast.success("Avatar saved", {
          description: "Image URL stored on this team member.",
        })
        onTeamUpdated()
      } else if (data.url) {
        adminToast.success("Avatar uploaded", {
          description: "Click Create Member to save this team profile.",
        })
      }
    } catch (error: unknown) {
      setPreviewUrl(null)
      setError("Failed to upload image. Please try again.")
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    // 验证必填字段
    if (!position || !description) {
      setError("Please fill in all required fields (Position and Description)")
      return
    }

    // 如果没有 user_id，name 和 image_url 是必需的（向后兼容）
    if (!userId && (!name || !imageUrl)) {
      setError("Please either select a Coach user or provide Name and Avatar Image")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const url = team ? `/api/admin/teams/${team.id}` : "/api/admin/teams"
      const method = team ? "PATCH" : "POST"

      const payload: StringKeyRecord = {
        position,
        description,
        display_order: displayOrder,
        is_featured: isFeatured,
        is_active: isActive,
        social_networks: socialNetworks.filter(sn => sn.name && sn.url),
      }

      if (userId) {
        payload.user_id = userId
        if (name) payload.name = name
      } else {
        payload.name = name
      }

      // 始终持久化 teams.image_url（Admin 上传的 Blob URL 存在 teams 表）
      if (imageUrl && isUsableTeamImageUrl(imageUrl)) {
        payload.image_url = imageUrl
      }

      if (bio) {
        payload.bio = bio
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || `Failed to ${team ? "update" : "create"} team member`)
        setIsLoading(false)
        return
      }

      onTeamUpdated()
      onOpenChange(false)
    } catch (error: unknown) {
      setError(`Failed to ${team ? "update" : "create"} team member. Please try again.`)
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] lg:max-w-[800px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{team ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          <DialogDescription>
            {team 
              ? "Update team member information. Changes will be saved immediately." 
              : "Fill in the information below to add a new team member."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">
              Coach User <span className="text-muted-foreground">(Optional but recommended)</span>
            </Label>
            <Select
              value={userId || "__none__"}
              onValueChange={(value) => setUserId(value === "__none__" ? "" : value)}
              disabled={isLoadingCoaches || !!team?.user_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingCoaches ? "Loading coaches..." : "Select a coach user"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (Manual Entry)</SelectItem>
                {coaches
                  .filter((coach) => {
                    // 编辑模式：显示所有 coach（包括当前选中的）
                    if (team) {
                      return coach.id === team.user_id || !coach.has_team_profile
                    }
                    // 创建模式：只显示没有 Teams 记录的用户
                    return !coach.has_team_profile
                  })
                  .map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name} ({coach.email})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {team?.user_id 
                ? "User cannot be changed after creation. Edit user information in User Management."
                : "Selecting a coach user will auto-fill name and avatar. Leave empty to enter manually."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name {!userId && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={userId ? "Auto-filled from user" : "Enter team member name"}
                disabled={!!userId && !team}
                required={!userId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">
                Position <span className="text-destructive">*</span>
              </Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g., Senior Coach, Chef Coach"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_upload">
              Avatar Image {!userId && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex flex-col gap-4">
              {previewUrl && (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-border">
                  <img
                    src={previewUrl}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="avatar_upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                {isUploading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload an image file (JPG, PNG, etc.). Maximum file size: 5MB. Image will be stored in Vercel Blob.
            </p>
            {imageUrl && !isUploading && (
              <p className="text-xs text-muted-foreground">
                Uploaded: <span className="text-primary break-all">{imageUrl}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a brief description of the team member..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              Bio <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Enter a detailed biography (optional)..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Detailed personal biography. This will be displayed on the team member's profile page.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_featured"
                checked={isFeatured}
                onCheckedChange={(checked) => setIsFeatured(checked === true)}
              />
              <Label htmlFor="is_featured" className="cursor-pointer">
                Featured on Homepage
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              min="0"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first. Leave as 0 to add to the end.
            </p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Social Networks</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Add social media links for this team member (optional)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSocialNetwork}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
            {socialNetworks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                No social networks added. Click "Add Link" to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {socialNetworks.map((sn, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border rounded-md bg-muted/30">
                    <div className="flex-1 space-y-2">
                      <div>
                        <Label className="text-xs">Platform Name</Label>
                        <Input
                          value={sn.name}
                          onChange={(e) => updateSocialNetwork(index, "name", e.target.value)}
                          placeholder="Youtube, Facebook, Instagram, Xiaohongshu, etc."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">URL</Label>
                        <Input
                          value={sn.url}
                          onChange={(e) => updateSocialNetwork(index, "url", e.target.value)}
                          placeholder="https://..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSocialNetwork(index)}
                      className="mt-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </div>
        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? "Saving..." : team ? "Save Changes" : "Create Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

