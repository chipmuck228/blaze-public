'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, Calendar, MapPin, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Enrollment {
  id: string
  user_id: string
  payer_user_id: string
  instance_id: string
  student_id: string | null
  student_name: string
  status: 'cart' | 'reserved' | 'enrolled' | 'waitlisted' | 'cancelled' | 'expired' | 'completed' | 'dropped' | 'credited'
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'credited'
  amount_paid: number | null
  tax_amount: number | null
  enrolled_at: string | null
  waitlist_position: number | null
  created_at: string
  updated_at: string
  instance: {
    id: string
    start_date: string
    end_date: string | null
    start_time: string | null
    end_time: string | null
    offering: {
      id: string
      name: string
      description: string | null
      base_price: number
    } | null
    location: {
      id: string
      name: string
      address: string | null
    } | null
    franchise: {
      id: string
      code: string
      name: string
    } | null
  } | null
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Enrollment[]>([])
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'waitlisted' | 'cancelled'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchOrders()
    }
  }, [status, filter, router])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/enrollments/orders?status=${filter === 'all' ? '' : filter}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.enrollments || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      enrolled: { variant: 'default' as const, label: 'Enrolled' },
      waitlisted: { variant: 'secondary' as const, label: 'Waitlisted' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      cart: { variant: 'outline' as const, label: 'In Cart' },
      reserved: { variant: 'outline' as const, label: 'Reserved' },
      completed: { variant: 'default' as const, label: 'Completed' },
      expired: { variant: 'destructive' as const, label: 'Expired' },
      dropped: { variant: 'destructive' as const, label: 'Dropped' },
      credited: { variant: 'secondary' as const, label: 'Credited' },
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Sort orders
  const sortedOrders = [...orders].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'date':
        const dateA = new Date(a.enrolled_at || a.created_at).getTime()
        const dateB = new Date(b.enrolled_at || b.created_at).getTime()
        comparison = dateA - dateB
        break
      case 'amount':
        const amountA = a.amount_paid || 0
        const amountB = b.amount_paid || 0
        comparison = amountA - amountB
        break
      case 'name':
        const nameA = a.instance?.offering?.name || ''
        const nameB = b.instance?.offering?.name || ''
        comparison = nameA.localeCompare(nameB)
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

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
            <h1 className="text-3xl font-bold">My Enrollments</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your course enrollments and orders
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="amount">Sort by Amount</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Enrollments</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No enrollments found</p>
              <Button asChild>
                <Link href="/course-catalog">Browse Courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {order.instance?.offering?.name || 'Course'}
                      </CardTitle>
                      <CardDescription>
                        Student: {order.student_name}
                      </CardDescription>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {order.instance && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span>
                            {formatDate(order.instance.start_date)} - {formatDate(order.instance.end_date || null)}
                          </span>
                        </div>
                        {order.instance.start_time && order.instance.end_time && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Time:</span>
                            <span>
                              {formatTime(order.instance.start_time)} - {formatTime(order.instance.end_time)}
                            </span>
                          </div>
                        )}
                        {order.instance.location && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Location:</span>
                            <span>{order.instance.location.name}</span>
                          </div>
                        )}
                      </>
                    )}
                    {order.amount_paid && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-semibold">${order.amount_paid.toFixed(2)}</span>
                      </div>
                    )}
                    {order.status === 'waitlisted' && order.waitlist_position && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Waitlist Position:</span>
                        <span>#{order.waitlist_position}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/enrollments/orders/${order.id}`)}
                    >
                      View Details
                    </Button>
                    {order.status === 'enrolled' && order.payment_status === 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/enrollments/orders/${order.id}?action=refund`)}
                      >
                        Request Refund
                      </Button>
                    )}
                    {order.status === 'waitlisted' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to remove this from the waitlist?')) return
                          try {
                            const response = await fetch(`/api/enrollments/waitlist/${order.id}`, {
                              method: 'DELETE'
                            })
                            if (response.ok) {
                              fetchOrders()
                            }
                          } catch (error) {
                            console.error('Error removing from waitlist:', error)
                          }
                        }}
                      >
                        Remove from Waitlist
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}
