'use client'

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Navbar } from "@/components/Navbar"
import { Lock, CheckCircle2, XCircle, Loader2 } from "lucide-react"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (!tokenParam) {
      setTokenValid(false)
      setError("Missing reset token")
      return
    }

    setToken(tokenParam)

    // 验证令牌
    fetch(`/api/auth/reset-password?token=${tokenParam}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok && data.valid) {
          setTokenValid(true)
        } else {
          setTokenValid(false)
          setError(data.error || "Invalid or expired reset token")
        }
      })
      .catch(() => {
        setTokenValid(false)
        setError("An error occurred while verifying the token")
      })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (!token) {
      setError("Missing reset token")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to reset password")
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setIsLoading(false)

      // 3秒后跳转到登录页
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error: any) {
      setError("Failed to reset password, please try again later")
      setIsLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Verifying reset token...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (tokenValid === false) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-3xl font-bold">Reset Password</CardTitle>
              <CardDescription>Invalid reset link</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <XCircle className="h-16 w-16 text-destructive mb-4" />
                <p className="text-center text-lg font-medium text-destructive mb-2">
                  {error || "Invalid or expired reset token"}
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Please request a new password reset link.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/forgot-password">Request new reset link</Link>
              </Button>
              <Link href="/login" className="text-sm text-primary hover:underline">
                Back to login
              </Link>
            </CardFooter>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              {success
                ? "Password reset successful!"
                : "Enter your new password"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <p className="text-center text-lg font-medium mb-2">
                  Password reset successful!
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to login page...
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
            <Card className="w-full max-w-md shadow-lg">
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}

