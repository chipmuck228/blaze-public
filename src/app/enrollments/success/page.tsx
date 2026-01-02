'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status: sessionStatus, update: updateSession } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setIsLoading(false)
      return
    }

    // 等待 session 加载完成
    if (sessionStatus === 'loading') {
      return
    }

    // 验证支付并获取注册信息
    const verifyPayment = async () => {
      try {
        // 如果 session 不存在，先尝试刷新（可能从 Stripe 返回时 session 还未更新）
        if (!session?.user && sessionStatus !== 'unauthenticated') {
          await updateSession()
          // 等待 session 更新
          await new Promise(resolve => setTimeout(resolve, 300))
        }

        const response = await fetch(`/api/payments/success?session_id=${sessionId}`)
        const data = await response.json()

        if (response.ok) {
          setEnrollments(data.enrollments || [])
        } else {
          // 如果是 401 错误，可能是 session 过期或未登录
          if (response.status === 401) {
            // 尝试刷新 session 后重试一次
            await updateSession()
            await new Promise(resolve => setTimeout(resolve, 300))
            
            const retryResponse = await fetch(`/api/payments/success?session_id=${sessionId}`)
            const retryData = await retryResponse.json()
            
            if (retryResponse.ok) {
              setEnrollments(retryData.enrollments || [])
            } else {
              // 如果重试后仍然失败，跳转到登录页面（带回调 URL）
              const callbackUrl = encodeURIComponent(`/enrollments/success?session_id=${sessionId}`)
              router.push(`/login?callbackUrl=${callbackUrl}`)
            }
          } else {
            setError(data.error || 'Failed to verify payment')
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to verify payment')
      } finally {
        setIsLoading(false)
      }
    }

    verifyPayment()
  }, [sessionId, session, sessionStatus, router, updateSession])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Payment Verification Failed</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/enrollments/cart">Back to Cart</Link>
              </Button>
              <Button asChild>
                <Link href="/enrollments">View My Enrollments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for your payment. Your enrollment has been confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrollments.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Enrolled Courses:</h3>
              <ul className="space-y-2">
                {enrollments.map((enrollment) => (
                  <li key={enrollment.id} className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">
                      {enrollment.instance?.assignment?.course?.name || 'Unknown Course'}
                    </p>
                    {enrollment.instance?.name && (
                      <p className="text-sm text-muted-foreground">
                        Instance: {enrollment.instance.name}
                      </p>
                    )}
                    {enrollment.amount_paid && (
                      <p className="text-sm text-muted-foreground">
                        Amount: {enrollment.currency} ${enrollment.amount_paid.toFixed(2)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button asChild className="flex-1">
              <Link href="/enrollments">View My Enrollments</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/course-catalog">Browse More Courses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

