"use client"

import { getErrorMessage } from "@/lib/typed-error"
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
      } catch (err: unknown) {
        setStatus("error")
        setError(getErrorMessage(err) || "An error occurred while processing your request")
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
              <p className="text-muted-foreground">Processing your unsubscribe request…</p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">
                  You have been unsubscribed
                </h3>
                {email && (
                  <p className="text-sm text-muted-foreground">
                    Email: <span className="font-mono">{email}</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-4">
                  We&apos;re sorry to see you go.
                  <br />
                  You can resubscribe anytime from our homepage.
                </p>
              </div>
              <Button asChild className="w-full mt-4">
                <Link href="/">Return home and resubscribe</Link>
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
                <h3 className="text-lg font-semibold">Unsubscribe failed</h3>
                <p className="text-sm text-muted-foreground">
                  {error || "Something went wrong. Please try again later."}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Check that your link is correct, or contact support for help.
                </p>
              </div>
              <Button variant="outline" asChild className="w-full mt-4">
                <Link href="/">Return home</Link>
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
            <p className="text-muted-foreground">Loading…</p>
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
