'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'

interface Credit {
  id: string
  user_id: string
  credit_amount: number
  used_amount: number
  available_amount: number
  source_enrollment_id: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function CreditsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [credits, setCredits] = useState<Credit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchCredits()
    }
  }, [status, router])

  const fetchCredits = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/enrollments/credits')
      if (response.ok) {
        const data = await response.json()
        setCredits(data.credits || [])
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalAvailable = credits.reduce((sum, c) => sum + (c.available_amount || 0), 0)
  const totalUsed = credits.reduce((sum, c) => sum + (c.used_amount || 0), 0)
  const totalCredits = credits.reduce((sum, c) => sum + (c.credit_amount || 0), 0)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No expiration'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  return (
    <>
      <Navbar />
      <div className="pt-14 min-h-screen bg-background">
      <div className="ccontainer mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Credits</h1>
          <p className="text-muted-foreground mt-1">
            View your available credits and credit history
          </p>
        </div>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Credit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Available</p>
                <p className="text-3xl font-bold text-primary">
                  ${totalAvailable.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Used</p>
                <p className="text-3xl font-bold">
                  ${totalUsed.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Credits</p>
                <p className="text-3xl font-bold">
                  ${totalCredits.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit History */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Credit History</h2>
          {credits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No credits available</p>
                <p className="text-sm text-muted-foreground">
                  Credits will appear here when you convert a refund to credit
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {credits.map((credit) => (
                <Card key={credit.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Credit #{credit.id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          Created on {formatDate(credit.created_at)}
                        </CardDescription>
                      </div>
                      <Badge variant={credit.available_amount > 0 ? 'default' : 'secondary'}>
                        {credit.available_amount > 0 ? 'Available' : 'Used'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Credit Amount</p>
                          <p className="text-lg font-semibold">${credit.credit_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Used</p>
                          <p className="text-lg font-semibold">${credit.used_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Available</p>
                          <p className="text-lg font-semibold text-primary">
                            ${credit.available_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {credit.expires_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Expires:</span>
                          <span>{formatDate(credit.expires_at)}</span>
                        </div>
                      )}

                      {credit.source_enrollment_id && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/enrollments/orders/${credit.source_enrollment_id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Source Order
                            </Link>
                          </Button>
                        </div>
                      )}

                      {credit.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Notes:</p>
                          <p className="text-sm">{credit.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      </div>
      <Footer />
    </>
  )
}
