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
import { X, Plus } from "lucide-react"

interface TeamMember {
  id: string
  image_url: string
  name: string
  position: string
  description: string
  display_order: number
  social_networks: Array<{
    id: string
    name: string
    url: string
    display_order: number
  }>
}

interface TeamEditDialogProps {
  team: TeamMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamUpdated: () => void
}

export function TeamEditDialog({
  team,
  open,
  onOpenChange,
  onTeamUpdated,
}: TeamEditDialogProps) {
  const [imageUrl, setImageUrl] = useState("")
  const [name, setName] = useState("")
  const [position, setPosition] = useState("")
  const [description, setDescription] = useState("")
  const [displayOrder, setDisplayOrder] = useState(0)
  const [socialNetworks, setSocialNetworks] = useState<Array<{ name: string; url: string; display_order: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      if (team) {
        // 编辑模式
        setImageUrl(team.image_url || "")
        setName(team.name || "")
        setPosition(team.position || "")
        setDescription(team.description || "")
        setDisplayOrder(team.display_order || 0)
        setSocialNetworks(
          team.social_networks.map(sn => ({
            name: sn.name || "",
            url: sn.url || "",
            display_order: sn.display_order || 0,
          }))
        )
      } else {
        // 新建模式 - 清空所有字段
        setImageUrl("")
        setName("")
        setPosition("")
        setDescription("")
        setDisplayOrder(0)
        setSocialNetworks([])
      }
      setError("")
      setIsLoading(false)
    }
  }, [open, team])

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

  const handleSave = async () => {
    if (!imageUrl || !name || !position || !description) {
      setError("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const url = team ? `/api/admin/teams/${team.id}` : "/api/admin/teams"
      const method = team ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          name,
          position,
          description,
          display_order: displayOrder,
          social_networks: socialNetworks.filter(sn => sn.name && sn.url),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || `Failed to ${team ? "update" : "create"} team member`)
        setIsLoading(false)
        return
      }

      onTeamUpdated()
      onOpenChange(false)
    } catch (error: any) {
      setError(`Failed to ${team ? "update" : "create"} team member. Please try again.`)
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{team ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          <DialogDescription>
            {team 
              ? "Update team member information. Changes will be saved immediately." 
              : "Fill in the information below to add a new team member."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter team member name"
                required
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
            <Label htmlFor="image_url">
              Image URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="image_url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/path/to/image.png"
              required
            />
            <p className="text-xs text-muted-foreground">
              Path to the image file in the public directory (e.g., /team-member.png)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a brief description of the team member..."
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              rows={4}
              required
            />
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
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : team ? "Save Changes" : "Create Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

