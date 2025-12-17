'use client'

import { useState } from "react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Copy, Check } from "lucide-react"

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onUserCreated,
}: CreateUserDialogProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"user" | "coach" | "admin">("user")
  const [passwordOption, setPasswordOption] = useState<"generate" | "custom" | "invite">("invite")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [requirePasswordChange, setRequirePasswordChange] = useState(false)
  const [isTestUser, setIsTestUser] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const resetForm = () => {
    setName("")
    setEmail("")
    setRole("user")
    setPasswordOption("invite")
    setPassword("")
    setConfirmPassword("")
    setRequirePasswordChange(false)
    setIsTestUser(false)
    setError("")
    setSuccess("")
    setGeneratedPassword(null)
    setCopied(false)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCreate = async () => {
    setError("")
    setSuccess("")
    setGeneratedPassword(null)

    // 验证必填字段
    if (!name || !email) {
      setError("Please fill in all required fields")
      return
    }

    // 验证 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    // 如果选择自定义密码，验证密码
    if (passwordOption === "custom") {
      if (!password) {
        setError("Please enter a password")
        return
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters")
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          role,
          password_option: passwordOption,
          password: passwordOption === "custom" ? password : undefined,
          require_password_change: requirePasswordChange,
          is_test_user: isTestUser,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create user")
        setIsLoading(false)
        return
      }

      // 如果生成密码且邮件发送失败，显示密码
      if (passwordOption === "generate" && data.generated_password) {
        setGeneratedPassword(data.generated_password)
        setSuccess("User created successfully! Please copy the password below.")
      } else if (data.emailSent) {
        setSuccess(
          passwordOption === "invite"
            ? "User created and invitation email sent successfully!"
            : "User created and password notification email sent successfully!"
        )
        // 3秒后关闭对话框
        setTimeout(() => {
          handleClose()
          onUserCreated()
        }, 3000)
      } else {
        setSuccess("User created successfully, but email sending failed. " + (data.emailError || ""))
        if (data.generated_password) {
          setGeneratedPassword(data.generated_password)
        }
      }

      setIsLoading(false)
    } catch (error: any) {
      setError("Failed to create user. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Create a new user account. Choose how the user will receive their credentials.
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
                placeholder="User name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
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

          <div className="space-y-3">
            <Label>Password Option <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={passwordOption}
              onValueChange={(value) => setPasswordOption(value as "generate" | "custom" | "invite")}
            >
              <div className="flex items-center space-x-2 p-3 border rounded-md">
                <RadioGroupItem value="invite" id="invite" />
                <Label htmlFor="invite" className="flex-1 cursor-pointer">
                  <div className="font-medium">Send invitation link</div>
                  <div className="text-xs text-muted-foreground">
                    User will set password via email link (Recommended)
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md">
                <RadioGroupItem value="generate" id="generate" />
                <Label htmlFor="generate" className="flex-1 cursor-pointer">
                  <div className="font-medium">Generate random password</div>
                  <div className="text-xs text-muted-foreground">
                    System generates a secure password and sends it via email
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="flex-1 cursor-pointer">
                  <div className="font-medium">Set custom password</div>
                  <div className="text-xs text-muted-foreground">
                    Admin sets the password manually
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {passwordOption === "custom" && (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="require_password_change"
                checked={requirePasswordChange}
                onCheckedChange={(checked) => setRequirePasswordChange(checked === true)}
              />
              <Label htmlFor="require_password_change" className="cursor-pointer">
                Require password change on first login
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_test_user"
                checked={isTestUser}
                onCheckedChange={(checked) => setIsTestUser(checked === true)}
              />
              <Label htmlFor="is_test_user" className="cursor-pointer">
                Mark as test user
              </Label>
            </div>
          </div>

          {generatedPassword && (
            <div className="bg-muted p-4 rounded-md border">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Generated Password</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPassword}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <code className="text-sm bg-background px-2 py-1 rounded block break-all">
                {generatedPassword}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Please save this password. It will not be shown again.
              </p>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {success && !generatedPassword && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
              {success}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {generatedPassword ? "Close" : "Cancel"}
          </Button>
          {!generatedPassword && (
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

