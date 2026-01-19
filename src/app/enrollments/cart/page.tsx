'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Trash2, Clock, ShoppingCart, ArrowRight, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useSession } from 'next-auth/react'

interface CartItem {
  id: string
  instance_id: string
  status: string
  cart_expires_at?: string
  time_remaining: number
  instance?: {
    id: string
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
    assignment?: {
      course?: {
        name: string
        base_price?: number
      }
      location?: {
        name: string
      }
    }
    location?: {
      name: string
    }
  }
}

export default function CartPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchCart()
      // 每30秒更新一次倒计时
      const interval = setInterval(() => {
        setCartItems(prev => prev.map(item => {
          if (item.cart_expires_at) {
            const expiresAt = new Date(item.cart_expires_at)
            const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
            return { ...item, time_remaining: timeRemaining }
          }
          return item
        }))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status, router])

  const fetchCart = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/enrollments/cart')
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async (enrollmentId: string) => {
    try {
      setIsRemoving(enrollmentId)
      const response = await fetch(`/api/enrollments/cart/${enrollmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCartItems(prev => prev.filter(item => item.id !== enrollmentId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove item')
      }
    } catch (error) {
      console.error('Error removing item:', error)
      alert('Failed to remove item')
    } finally {
      setIsRemoving(null)
    }
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    try {
      setIsCheckingOut(true)
      const enrollmentIds = cartItems.map(item => item.id)
      
      // 创建 Stripe Checkout Session
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrollment_ids: enrollmentIds,
        }),
      })

      // 检查响应内容类型
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an invalid response. Please try again.')
      }

      if (response.ok) {
        const data = await response.json()
        // 跳转到 Stripe Checkout 页面
        if (data.url) {
          window.location.href = data.url
        } else {
          throw new Error('No checkout URL returned')
        }
      } else {
        try {
          const error = await response.json()
          alert(error.error || 'Failed to create checkout session')
        } catch (parseError) {
          // 如果错误响应也不是 JSON，显示通用错误
          const text = await response.text()
          console.error('Error response:', text.substring(0, 200))
          alert(`Failed to create checkout session (${response.status}). Please try again.`)
        }
      }
    } catch (error: any) {
      console.error('Error during checkout:', error)
      if (error.message) {
        alert(error.message)
      } else {
        alert('Failed to checkout. Please try again.')
      }
    } finally {
      setIsCheckingOut(false)
    }
  }

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const calculateTotal = (): number => {
    return cartItems.reduce((total, item) => {
      const price = item.instance?.assignment?.course?.base_price || 0
      return total + price
    }, 0)
  }

  if (status === 'loading' || isLoading) {
    return (
      <>
        <Navbar />
        <div className="pt-14 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="pt-14 min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
            <p className="text-muted-foreground">
              Review your selected courses before checkout
            </p>
          </div>

          {cartItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
                <p className="text-muted-foreground mb-6">
                  Start adding courses to your cart to get started!
                </p>
                <Button asChild>
                  <a href="/#courses">
                    Browse Courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {item.instance?.assignment?.course?.name || 'Course'}
                          </CardTitle>
                          <CardDescription className="space-y-1">
                            {item.instance?.assignment?.location?.name || item.instance?.location?.name ? (
                              <div className="flex items-center gap-2">
                                <span>Location: {item.instance?.assignment?.location?.name || item.instance?.location?.name}</span>
                              </div>
                            ) : null}
                            {item.instance?.start_date && (
                              <div>
                                {new Date(item.instance.start_date).toLocaleDateString()} - {new Date(item.instance.end_date).toLocaleDateString()}
                              </div>
                            )}
                            {item.instance?.start_time && item.instance?.end_time && (
                              <div>
                                {item.instance.start_time} - {item.instance.end_time}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(item.id)}
                          disabled={isRemoving === item.id}
                        >
                          {isRemoving === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            Expires in: <strong className="text-foreground">
                              {formatTimeRemaining(item.time_remaining)}
                            </strong>
                          </span>
                        </div>
                        <div className="text-lg font-semibold">
                          ${item.instance?.assignment?.course?.base_price?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      {item.time_remaining < 300 && item.time_remaining > 0 && (
                        <Badge variant="destructive" className="mt-2">
                          Expiring soon!
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Checkout Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Items</span>
                      <span>{cartItems.length}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={isCheckingOut || cartItems.length === 0}
                    >
                      {isCheckingOut ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Proceed to Checkout
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Your items will be reserved for 10 minutes during checkout
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

