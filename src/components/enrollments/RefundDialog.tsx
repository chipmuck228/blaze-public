'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Enrollment {
  id: string
  status: string
  payment_status: string
  amount_paid: number | null
  instance: {
    start_date: string
  } | null
}

interface RefundPolicy {
  daysUntilStart: number
  canRefund: boolean
  canCredit: boolean
  refundAmount: number
  creditAmount: number
  processingFee: number
  taxAmount: number
  refundPercentage: number
  creditPercentage: number
}

interface RefundDialogProps {
  enrollment: Enrollment
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RefundDialog({ enrollment, open, onOpenChange }: RefundDialogProps) {
  const router = useRouter()
  const [refundType, setRefundType] = useState<'refund' | 'credit'>('credit')
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [policy, setPolicy] = useState<RefundPolicy | null>(null)
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false)

  useEffect(() => {
    if (open && enrollment) {
      fetchRefundPolicy()
    }
  }, [open, enrollment])

  const fetchRefundPolicy = async () => {
    setIsLoadingPolicy(true)
    try {
      const response = await fetch(`/api/enrollments/${enrollment.id}/refund`)
      if (response.ok) {
        const data = await response.json()
        setPolicy(data.policy)
        // Set default refund type based on policy
        if (data.policy.canRefund) {
          setRefundType('refund')
        } else if (data.policy.canCredit) {
          setRefundType('credit')
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to load refund policy')
      }
    } catch (error) {
      console.error('Error fetching refund policy:', error)
      toast.error('Failed to load refund policy')
    } finally {
      setIsLoadingPolicy(false)
    }
  }

  const handleSubmit = async () => {
    if (!policy) return

    if (refundType === 'refund' && !policy.canRefund) {
      toast.error('Refund is not available. Only credit is available.')
      return
    }

    if (refundType === 'credit' && !policy.canCredit) {
      toast.error('Credit is not available.')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/enrollments/${enrollment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_type: refundType,
          reason: reason || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(
          refundType === 'refund'
            ? 'Refund request submitted successfully'
            : 'Credit created successfully'
        )
        onOpenChange(false)
        router.refresh()
        // Redirect to orders page after a short delay
        setTimeout(() => {
          router.push('/enrollments/orders')
        }, 1000)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to process refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('Failed to process refund')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Choose your refund option based on the policy below
          </DialogDescription>
        </DialogHeader>

        {isLoadingPolicy ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : policy ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Refund Policy</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Days until start: <span className="font-medium">{policy.daysUntilStart} days</span>
              </p>
              {policy.canRefund && (
                <div className="mb-2">
                  <p className="text-sm font-medium">Refund Option:</p>
                  <p className="text-sm">
                    ${policy.refundAmount.toFixed(2)} (minus ${policy.processingFee.toFixed(2)} processing fee)
                  </p>
                </div>
              )}
              {policy.canCredit && (
                <div>
                  <p className="text-sm font-medium">Credit Option:</p>
                  <p className="text-sm">${policy.creditAmount.toFixed(2)}</p>
                </div>
              )}
              {!policy.canRefund && !policy.canCredit && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Refund is not available at this time.</span>
                </div>
              )}
            </div>

            {policy.canRefund || policy.canCredit ? (
              <>
                <div className="space-y-2">
                  <Label>Refund Type</Label>
                  <RadioGroup value={refundType} onValueChange={(v) => setRefundType(v as 'refund' | 'credit')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="refund" id="refund" disabled={!policy.canRefund} />
                      <Label
                        htmlFor="refund"
                        className={!policy.canRefund ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      >
                        Refund (${policy.refundAmount.toFixed(2)})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="credit" id="credit" disabled={!policy.canCredit} />
                      <Label
                        htmlFor="credit"
                        className={!policy.canCredit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      >
                        Credit (${policy.creditAmount.toFixed(2)})
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide a reason for the refund..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || (refundType === 'refund' && !policy.canRefund) || (refundType === 'credit' && !policy.canCredit)}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Refund is not available for this enrollment.
                </p>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-4">
                  Close
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Failed to load refund policy. Please try again.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
