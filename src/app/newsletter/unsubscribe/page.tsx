"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

type UnsubscribeStatus = "loading" | "success" | "error"

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<UnsubscribeStatus>("loading")
  const [email, setEmail] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setStatus("error")
      setError("Unsubscribe token is missing")
      return
    }

    // 调用退订 API
    const unsubscribe = async () => {
      try {
        const response = await fetch(`/api/public/newsletter/unsubscribe?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setStatus("success")
          setEmail(data.email || "")
        } else {
          setStatus("error")
          setError(data.error || "Failed to unsubscribe")
        }
      } catch (err: any) {
        setStatus("error")
        setError(err.message || "An error occurred while processing your request")
      }
    }

    unsubscribe()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Newsletter Unsubscribe</CardTitle>
          <CardDescription>
            {status === "loading" && "Processing your request..."}
            {status === "success" && "Unsubscribe confirmation"}
            {status === "error" && "Error"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading State */}
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">正在处理退订请求...</p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">您已成功退订 Newsletter</h3>
                {email && (
                  <p className="text-sm text-muted-foreground">
                    邮箱地址：<span className="font-mono">{email}</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-4">
                  我们很抱歉看到您离开。
                  <br />
                  如果您改变主意，可以随时重新订阅。
                </p>
              </div>
              <Button asChild className="w-full mt-4">
                <Link href="/">返回首页并重新订阅</Link>
              </Button>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">退订失败</h3>
                <p className="text-sm text-muted-foreground">
                  {error || "发生错误，请稍后重试"}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  请检查链接是否正确，或联系客服获取帮助。
                </p>
              </div>
              <Button variant="outline" asChild className="w-full mt-4">
                <Link href="/">返回首页</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function UnsubscribeFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Newsletter Unsubscribe</CardTitle>
          <CardDescription>Processing your request...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">正在加载...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribeFallback />}>
      <UnsubscribeContent />
    </Suspense>
  )
}
