'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Trash2, Clock, Users, ArrowRight, Loader2, Bell, MapPin, Calendar } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useSession } from 'next-auth/react'

interface WaitlistItem {
  id: string
  user_id: string
  payer_user_id: string
  instance_id: string
  student_id: string | null
  student_name: string
  status: string
  waitlist_position?: number
  waitlisted_at?: string
  waitlist_notified_at?: string
  waitlist_expires_at?: string
  instance?: {
    id: string
    start_date: string
    end_date: string | null
    start_time?: string | null
    end_time?: string | null
    offering?: {
      id: string
      name: string
      description: string | null
      base_price: number
    } | null
    location?: {
      id: string
      name: string
      address: string | null
    } | null
    franchise?: {
      id: string
      code: string
      name: string
    } | null
  }
}

export default function WaitlistPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [waitlistItems, setWaitlistItems] = useState<WaitlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchWaitlist()
    }
  }, [status, router])

  const fetchWaitlist = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/enrollments/waitlist')
      if (response.ok) {
        const data = await response.json()
        setWaitlistItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove this from your waitlist?')) {
      return
    }

    try {
      setIsRemoving(enrollmentId)
      const response = await fetch(`/api/enrollments/waitlist/${enrollmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setWaitlistItems(prev => prev.filter(item => item.id !== enrollmentId))
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

  const getTimeRemaining = (expiresAt?: string): string | null => {
    if (!expiresAt) return null
    const expires = new Date(expiresAt)
    const now = new Date()
    const diff = expires.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days > 1 ? 's' : ''} remaining`
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} remaining`
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`
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
      <div className="pt-14 min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Waitlist</h1>
            <p className="text-muted-foreground">
              You'll be notified when a spot becomes available
            </p>
          </div>

          {waitlistItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No items in waitlist</h2>
                <p className="text-muted-foreground mb-6">
                  Courses you join the waitlist for will appear here
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
            <div className="space-y-4">
              {waitlistItems.map((item) => {
                const timeRemaining = getTimeRemaining(item.waitlist_expires_at)
                const isNotified = !!item.waitlist_notified_at
                const isExpired = timeRemaining === 'Expired'

                return (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">
                              {item.instance?.offering?.name || 'Course'}
                            </CardTitle>
                            {isNotified && !isExpired && (
                              <Badge variant="default" className="bg-green-600">
                                <Bell className="h-3 w-3 mr-1" />
                                Spot Available!
                              </Badge>
                            )}
                            {isExpired && (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                          </div>
                          <CardDescription className="space-y-1">
                            <div className="text-sm text-muted-foreground">
                              Student: {item.student_name}
                            </div>
                            {item.instance?.location?.name && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{item.instance.location.name}</span>
                              </div>
                            )}
                            {item.instance?.start_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {formatDate(item.instance.start_date)} - {formatDate(item.instance.end_date)}
                                </span>
                              </div>
                            )}
                            {item.instance?.start_time && item.instance?.end_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {formatTime(item.instance.start_time)} - {formatTime(item.instance.end_time)}
                                </span>
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
                      <div className="space-y-3">
                        {item.waitlist_position && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Your position in queue</span>
                            <Badge variant="secondary" className="text-base font-semibold">
                              #{item.waitlist_position}
                            </Badge>
                          </div>
                        )}
                        {isNotified && timeRemaining && (
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                              <Bell className="h-4 w-4" />
                              A spot is available!
                            </div>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              {timeRemaining}. Complete your enrollment to secure your spot.
                            </p>
                            {!isExpired && (
                              <Button
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => {
                                  router.push(`/enrollments/orders/${item.id}`)
                                }}
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                        )}
                        {item.waitlisted_at && (
                          <div className="text-xs text-muted-foreground">
                            Joined waitlist on {formatDate(item.waitlisted_at)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

