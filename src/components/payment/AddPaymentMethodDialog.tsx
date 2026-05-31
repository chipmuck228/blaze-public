'use client'

import { getErrorMessage } from "@/lib/typed-error"
import { useState, useEffect } from 'react'
import { loadStripe, StripeElementsOptions, type Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// 初始化 Stripe（延迟加载，避免在服务端执行）
let stripePromiseInstance: Promise<Stripe | null> | null = null

const getStripePromise = (): Promise<Stripe | null> | null => {
  if (typeof window === 'undefined') {
    return null // 服务端不执行
  }
  
  if (!stripePromiseInstance) {
    // 优先使用 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY（客户端）
    // 如果没有，尝试使用 STRIPE_PUBLISHABLE_KEY（向后兼容）
    const publishableKey = 
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 
      process.env.STRIPE_PUBLISHABLE_KEY
    
    if (!publishableKey) {
      console.error('Stripe Publishable Key is not configured.')
      console.error('Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env.local file')
      return null
    }
    
    if (!publishableKey.startsWith('pk_')) {
      console.error('Invalid Stripe Publishable Key format. It should start with "pk_"')
      return null
    }
    
    stripePromiseInstance = loadStripe(publishableKey)
  }
  return stripePromiseInstance
}

interface AddPaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function PaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // 确认 Setup Intent
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/profile?payment_method_added=true`,
        },
        redirect: 'if_required',
      })

      if (confirmError) {
        setError(confirmError.message || 'Failed to add payment method')
        setIsProcessing(false)
        return
      }

      // 成功
      onSuccess()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'An unexpected error occurred')
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Add Payment Method
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export function AddPaymentMethodDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPaymentMethodDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && !clientSecret) {
      createSetupIntent()
    } else if (!open) {
      setClientSecret(null)
      setError(null)
    }
  }, [open])

  const createSetupIntent = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/payment-methods', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create setup intent')
      }

      const data = await response.json()
      setClientSecret(data.client_secret)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to initialize payment form')
      console.error('Error creating setup intent:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccess = () => {
    onSuccess()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const options: StripeElementsOptions | null = clientSecret ? {
    clientSecret: clientSecret,
    appearance: {
      theme: 'stripe',
    },
  } : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new payment method to your account. Your payment information is secure and encrypted.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : clientSecret && options ? (
          (() => {
            const stripePromise = getStripePromise()
            if (!stripePromise) {
              return (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-semibold">Stripe is not configured.</p>
                    <p className="text-sm">
                      Please set <code className="bg-muted px-1 rounded text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in your <code className="bg-muted px-1 rounded text-xs">.env.local</code> file.
                    </p>
                    <p className="text-sm">
                      You can get your Publishable Key from{' '}
                      <a 
                        href="https://dashboard.stripe.com/apikeys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-primary/80"
                      >
                        Stripe Dashboard
                      </a>.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      After adding the key, please restart your development server.
                    </p>
                  </AlertDescription>
                </Alert>
              )
            }
            return (
              <Elements stripe={stripePromise} options={options}>
                <PaymentForm onSuccess={handleSuccess} onCancel={handleCancel} />
              </Elements>
            )
          })()
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

