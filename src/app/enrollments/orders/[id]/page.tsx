'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Calendar, MapPin, Clock, FileText, QrCode, Download, AlertCircle } from 'lucide-react'
import { RefundDialog } from '@/components/enrollments/RefundDialog'
import { QRCodeDisplay } from '@/components/enrollments/QRCodeDisplay'

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
  check_in_qr_code: string | null
  check_in_qr_code_expires_at: string | null
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

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)

  useEffect(() => {
    const loadEnrollmentId = async () => {
      const resolvedParams = await params
      setEnrollmentId(resolvedParams.id)
    }
    loadEnrollmentId()
  }, [params])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && enrollmentId) {
      fetchEnrollment()
    }
  }, [status, enrollmentId, router])

  useEffect(() => {
    // Check if refund action is requested
    if (searchParams.get('action') === 'refund') {
      setIsRefundDialogOpen(true)
    }
  }, [searchParams])

  const fetchEnrollment = async () => {
    if (!enrollmentId) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/enrollments/${enrollmentId}`)
      if (response.ok) {
        const data = await response.json()
        setEnrollment(data.enrollment)
      } else if (response.status === 404) {
        router.push('/enrollments/orders')
      }
    } catch (error) {
      console.error('Error fetching enrollment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
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

  if (!enrollment) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Enrollment not found</p>
              <Button onClick={() => router.push('/enrollments/orders')}>
                Back to Enrollments
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    )
  }

  const canRequestRefund = enrollment.status === 'enrolled' && enrollment.payment_status === 'paid'
  const isPayer = session?.user?.id === enrollment.payer_user_id

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <Button
          variant="ghost"
          onClick={() => router.push('/enrollments/orders')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Enrollments
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Information */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {enrollment.instance?.offering?.name || 'Course'}
                    </CardTitle>
                    <CardDescription>
                      Student: {enrollment.student_name}
                    </CardDescription>
                  </div>
                  {getStatusBadge(enrollment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrollment.instance && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Date:</span>
                      <span>
                        {formatDate(enrollment.instance.start_date)} - {formatDate(enrollment.instance.end_date || null)}
                      </span>
                    </div>
                    {enrollment.instance.start_time && enrollment.instance.end_time && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Time:</span>
                        <span>
                          {formatTime(enrollment.instance.start_time)} - {formatTime(enrollment.instance.end_time)}
                        </span>
                      </div>
                    )}
                    {enrollment.instance.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Location:</span>
                        <span>{enrollment.instance.location.name}</span>
                        {enrollment.instance.location.address && (
                          <span className="text-muted-foreground">({enrollment.instance.location.address})</span>
                        )}
                      </div>
                    )}
                    {enrollment.instance.franchise && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Franchise:</span>
                        <span>{enrollment.instance.franchise.name}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {enrollment.amount_paid && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-semibold">${enrollment.amount_paid.toFixed(2)}</span>
                  </div>
                )}
                {enrollment.tax_amount && enrollment.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>${enrollment.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <Badge variant={enrollment.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {enrollment.payment_status}
                  </Badge>
                </div>
                {enrollment.enrolled_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Date:</span>
                    <span>{formatDate(enrollment.enrolled_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refund Policy */}
            {canRequestRefund && isPayer && (
              <Card>
                <CardHeader>
                  <CardTitle>Refund Policy</CardTitle>
                  <CardDescription>
                    Request a refund or convert to credit based on our refund policy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setIsRefundDialogOpen(true)}
                    className="w-full"
                  >
                    Request Refund
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Waitlist Information */}
            {enrollment.status === 'waitlisted' && enrollment.waitlist_position && (
              <Card>
                <CardHeader>
                  <CardTitle>Waitlist Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Your Position:</span>
                    <Badge variant="secondary">#{enrollment.waitlist_position}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    You will be notified when a spot becomes available.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code for Check-in */}
            {enrollment.status === 'enrolled' && enrollment.check_in_qr_code && (
              <Card>
                <CardHeader>
                  <CardTitle>Check-in QR Code</CardTitle>
                  <CardDescription>
                    Show this QR code at check-in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <QRCodeDisplay
                    qrCodeData={enrollment.check_in_qr_code}
                    enrollmentId={enrollment.id}
                    studentName={enrollment.student_name}
                  />
                  {enrollment.check_in_qr_code_expires_at && (
                    <p className="text-xs text-center text-muted-foreground">
                      Expires: {formatDate(enrollment.check_in_qr_code_expires_at)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Enrollment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enrollment ID:</span>
                  <span className="font-mono text-xs">{enrollment.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(enrollment.created_at)}</span>
                </div>
                {enrollment.updated_at !== enrollment.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{formatDate(enrollment.updated_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Refund Dialog */}
      {enrollment && (
        <RefundDialog
          enrollment={enrollment}
          open={isRefundDialogOpen}
          onOpenChange={(open) => {
            setIsRefundDialogOpen(open)
            if (!open) {
              // Remove action parameter from URL
              router.replace(`/enrollments/orders/${enrollment.id}`)
            }
          }}
        />
      )}

      <Footer />
    </>
  )
}
