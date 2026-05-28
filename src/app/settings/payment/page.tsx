'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Plus, CreditCard, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AddPaymentMethodDialog } from '@/components/payment/AddPaymentMethodDialog'

interface PaymentMethod {
  id: string
  type: string
  last4: string
  brand: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

export default function PaymentSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchPaymentMethods()
    }
  }, [status, router])

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/payment-methods')
      if (response.ok) {
        const data = await response.json()
        const methods = Array.isArray(data) ? data : data.payment_methods || []
        setPaymentMethods(
          methods.map((method: {
            id: string
            type: string
            card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number }
            brand?: string
            last4?: string
            exp_month?: number
            exp_year?: number
            is_default?: boolean
          }) => ({
            id: method.id,
            type: method.type,
            brand: method.card?.brand ?? method.brand ?? '',
            last4: method.card?.last4 ?? method.last4 ?? '',
            exp_month: method.card?.exp_month ?? method.exp_month ?? 0,
            exp_year: method.card?.exp_year ?? method.exp_year ?? 0,
            is_default: method.is_default ?? false,
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      toast.error('Failed to load payment methods')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return
    }

    try {
      setIsDeleting(paymentMethodId)
      const response = await fetch(`/api/user/payment-methods/${paymentMethodId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Payment method removed successfully')
        fetchPaymentMethods()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove payment method')
      }
    } catch (error) {
      console.error('Error deleting payment method:', error)
      toast.error('Failed to remove payment method')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const response = await fetch(`/api/user/payment-methods/${paymentMethodId}`, {
        method: 'PATCH'
      })

      if (response.ok) {
        toast.success('Default payment method updated')
        fetchPaymentMethods()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update default payment method')
      }
    } catch (error) {
      console.error('Error setting default payment method:', error)
      toast.error('Failed to update default payment method')
    }
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
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/profile')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Payment Methods</h1>
            <p className="text-muted-foreground mt-1">
              Manage your payment methods for course enrollments
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment Method
          </Button>
        </div>

        {paymentMethods.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No payment methods added</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Payment Method
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <Card key={method.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {method.brand} •••• {method.last4}
                          </p>
                          {method.is_default && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Expires {method.exp_month}/{method.exp_year}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!method.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          Set as Default
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(method.id)}
                        disabled={isDeleting === method.id}
                      >
                        {isDeleting === method.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddPaymentMethodDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchPaymentMethods}
      />

      <Footer />
    </>
  )
}
