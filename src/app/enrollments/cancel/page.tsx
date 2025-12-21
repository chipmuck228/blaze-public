'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was cancelled. Your items are still in your cart and will be reserved for a limited time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            You can return to your cart to complete your purchase, or continue browsing courses.
          </p>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/enrollments/cart">Return to Cart</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/course-catalog">Browse Courses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

