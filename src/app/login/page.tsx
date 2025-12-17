'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn, useSession } from "next-auth/react"
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
import { Mail, Lock, Chrome } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setIsLoading(false)
      } else {
        // 登录成功，跳转到首页
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      setError("Login failed, please try again later")
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError("")
    try {
      const result = await signIn("google", { 
        callbackUrl: "/",
        redirect: false 
      })
      
      console.log("Google sign in result:", result)
      
      if (result?.error) {
        console.error("Google sign in error:", result.error)
        // 提供更友好的错误信息
        let errorMessage = "Google login failed. "
        if (result.error === "OAuthSignin" || result.error === "OAuthCallback") {
          errorMessage += "There was a problem with the authentication process. Please try again."
        } else if (result.error === "OAuthCreateAccount") {
          errorMessage += "Could not create your account. Please try again or contact support."
        } else if (result.error === "EmailCreateAccount") {
          errorMessage += "Could not create account with this email. Please try again."
        } else if (result.error === "Callback") {
          errorMessage += "There was a problem during authentication. Please try again."
        } else {
          errorMessage += `${result.error}. Please check server logs for more details.`
        }
        setError(errorMessage)
        setIsLoading(false)
      } else if (result?.url) {
        // 优先检查 URL：如果 signIn 返回 URL，说明需要重定向到 Google OAuth 页面
        // 即使 result.ok === true，如果有 URL，也应该重定向到 Google
        console.log("Redirecting to Google OAuth:", result.url)
        window.location.href = result.url
        // 注意：这里不需要 setIsLoading(false)，因为页面会立即重定向
      } else if (result?.ok) {
        // 登录成功且没有 URL（OAuth 回调已完成）
        console.log("Google sign in successful, updating session and redirecting...")
        
        // 强制更新 session
        try {
          await updateSession()
          console.log("Session updated successfully")
        } catch (sessionError) {
          console.error("Error updating session:", sessionError)
          // 即使 session 更新失败，也尝试重定向，因为登录可能已经成功
        }
        
        // 等待一小段时间确保 session 更新
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 重定向到首页
        router.push("/")
        router.refresh()
      } else if (result === undefined || result === null) {
        // result 为 undefined/null，可能是 OAuth 回调已完成但 session 还未更新
        console.log("No explicit result, checking session and redirecting...")
        try {
          await updateSession()
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (sessionError) {
          console.error("Error updating session:", sessionError)
        }
        router.push("/")
        router.refresh()
      } else {
        // 其他情况：尝试更新 session 并重定向
        console.log("Unexpected result format, attempting to update session and redirect...", result)
        try {
          await updateSession()
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (sessionError) {
          console.error("Error updating session:", sessionError)
        }
        router.push("/")
        router.refresh()
      }
    } catch (error: any) {
      console.error("Google login exception:", error)
      setIsLoading(false)
      setError(`Google login failed: ${error?.message || "Unknown error"}. Please check server logs.`)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                  />
                </div>
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                  />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full"
                variant={"destructive"}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              {isLoading ? "Connecting..." : "Sign in with Google"}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}

