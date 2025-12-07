'use client'

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Navbar } from "@/components/Navbar"
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setStatus('error')
      setMessage("Missing verification token")
      return
    }

    // 验证邮箱
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus('success')
          setMessage(data.message)
          setEmail(data.user?.email || "")
          // 3秒后跳转到登录页
          setTimeout(() => {
            router.push("/login")
          }, 3000)
        } else {
          setStatus('error')
          setMessage(data.error || "Verification failed")
        }
      })
      .catch((error) => {
        setStatus('error')
        setMessage("An error occurred during verification, please try again later")
      })
  }, [searchParams, router])

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Verify Email</CardTitle>
            <CardDescription>
              {status === 'loading' && "Verifying your email..."}
              {status === 'success' && "Verification successful!"}
              {status === 'error' && "Verification failed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              {status === 'loading' && (
                <>
                  <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Please wait...</p>
                </>
              )}
              {status === 'success' && (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                  <p className="text-center text-lg font-medium mb-2">{message}</p>
                  {email && (
                    <p className="text-sm text-muted-foreground">
                      Email: {email}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-4">
                    Redirecting to login page...
                  </p>
                </>
              )}
              {status === 'error' && (
                <>
                  <XCircle className="h-16 w-16 text-destructive mb-4" />
                  <p className="text-center text-lg font-medium text-destructive mb-2">
                    {message}
                  </p>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      You can:
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        const email = prompt("Please enter your email address:")
                        if (email) {
                          try {
                            const res = await fetch("/api/auth/resend-verification", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email }),
                            })
                            const data = await res.json()
                            if (res.ok) {
                              alert("Verification email has been resent. Please check your inbox.")
                            } else {
                              alert(data.error || "Failed to send")
                            }
                          } catch (error) {
                            alert("Failed to send, please try again later")
                          }
                        }
                      }}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Resend verification email
                    </Button>
                  </div>
                </>
              )}
            </div>
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

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  )
}

