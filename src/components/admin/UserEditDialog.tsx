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
import { Badge } from "@/components/ui/badge"

interface User {
  id: string
  name: string
  email: string
  email_verified: boolean
  role?: string
  created_at: string
  updated_at: string
}

interface UserEditDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: UserEditDialogProps) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [emailVerified, setEmailVerified] = useState(user.email_verified)
  const [role, setRole] = useState(user.role || "user")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setName(user.name)
      setEmail(user.email)
      setEmailVerified(user.email_verified)
      setRole(user.role || "user")
      setError("")
    }
  }, [open, user])

  const handleSave = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          email_verified: emailVerified,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to update user")
        setIsLoading(false)
        return
      }

      onUserUpdated()
    } catch (error: unknown) {
      setError("Failed to update user. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] lg:max-w-[600px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={role === "user" ? "default" : "outline"}
                size="sm"
                onClick={() => setRole("user")}
              >
                User
              </Button>
              <Button
                type="button"
                variant={role === "coach" ? "default" : "outline"}
                size="sm"
                onClick={() => setRole("coach")}
              >
                Coach
              </Button>
              <Button
                type="button"
                variant={role === "admin" ? "default" : "outline"}
                size="sm"
                onClick={() => setRole("admin")}
              >
                Admin
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="email_verified"
              checked={emailVerified}
              onChange={(e) => setEmailVerified(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="email_verified" className="cursor-pointer">
              Email Verified
            </Label>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
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
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

