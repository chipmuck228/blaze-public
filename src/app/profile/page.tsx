'use client'

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  MapPin, 
  Clock,
  Edit,
  Save,
  X,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserAnalytics } from "@/components/UserAnalytics"
import { AddPaymentMethodDialog } from "@/components/payment/AddPaymentMethodDialog"
import { Trash2, Star } from "lucide-react"

interface UserProfile {
  id: string
  name: string
  email: string
  email_verified: boolean
  image?: string
  created_at: string
}

interface Enrollment {
  id: string
  instance_id: string
  status: 'cart' | 'reserved' | 'enrolled' | 'waitlisted' | 'cancelled' | 'expired' | 'completed'
  enrolled_at?: string
  waitlist_position?: number
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
      category?: {
        name: string
        display_name?: string
      }
      series?: {
        name: string
        display_name?: string
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

interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank'
  card?: {
    brand?: string
    last4?: string
    exp_month?: number
    exp_year?: number
  }
  last4?: string
  brand?: string
  is_default: boolean
  expires_at?: string
  created?: number
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false)
  const [isRemovingPaymentMethod, setIsRemovingPaymentMethod] = useState<string | null>(null)
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user) {
      fetchProfile()
      fetchEnrollments()
      fetchPaymentMethods()
    }
  }, [status, session, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setEditName(data.name)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const response = await fetch("/api/user/enrollments")
      if (response.ok) {
        const data = await response.json()
        setEnrollments(data)
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch("/api/user/payment-methods")
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data || [])
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    }
  }

  const handleAddPaymentMethodSuccess = () => {
    fetchPaymentMethods()
  }

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return
    }

    setIsRemovingPaymentMethod(paymentMethodId)
    try {
      const response = await fetch(`/api/user/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchPaymentMethods()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove payment method')
      }
    } catch (error: any) {
      console.error('Error removing payment method:', error)
      alert('Failed to remove payment method')
    } finally {
      setIsRemovingPaymentMethod(null)
    }
  }

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    setIsSettingDefault(paymentMethodId)
    try {
      const response = await fetch(`/api/user/payment-methods/${paymentMethodId}`, {
        method: 'PATCH',
      })

      if (response.ok) {
        await fetchPaymentMethods()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to set default payment method')
      }
    } catch (error: any) {
      console.error('Error setting default payment method:', error)
      alert('Failed to set default payment method')
    } finally {
      setIsSettingDefault(null)
    }
  }

  const getCardBrandDisplay = (method: PaymentMethod): string => {
    if (method.card?.brand) {
      return method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)
    }
    if (method.brand) {
      return method.brand.charAt(0).toUpperCase() + method.brand.slice(1)
    }
    return method.type.toUpperCase()
  }

  const getCardLast4 = (method: PaymentMethod): string | undefined => {
    return method.card?.last4 || method.last4
  }

  const getCardExpiry = (method: PaymentMethod): string | undefined => {
    if (method.card?.exp_month && method.card?.exp_year) {
      return `${String(method.card.exp_month).padStart(2, '0')}/${method.card.exp_year}`
    }
    if (method.expires_at) {
      return formatDate(method.expires_at)
    }
    return undefined
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    
    setIsSaving(true)
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setProfile(updated)
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return ""
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "enrolled":
        return "default"
      case "completed":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "cart":
        return "outline"
      case "reserved":
        return "outline"
      case "waitlisted":
        return "secondary"
      case "expired":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!session || !profile) {
    return null
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8 sm:py-12">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal information, course enrollments, and payment methods
            </p>
          </div>

          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="enrollments">My Courses</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Update your personal details and account information
                      </CardDescription>
                    </div>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={session.user?.image || profile.image || undefined} />
                      <AvatarFallback className="text-2xl">
                        {profile.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Profile Picture</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your profile picture is managed by your authentication provider
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          id="name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false)
                            setEditName(profile.name)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{profile.name}</p>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{profile.email}</p>
                      {profile.email_verified ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Account Created */}
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{formatDate(profile.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Enrollments Tab */}
            <TabsContent value="enrollments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Courses</CardTitle>
                  <CardDescription>
                    View all your enrolled courses, cart items, and waitlist
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {enrollments.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No course enrollments yet</p>
                      <Button asChild>
                        <a href="/course-catalog">Browse Courses</a>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {enrollments.map((enrollment) => {
                        const courseName = enrollment.instance?.assignment?.course?.name || 'Course'
                        const category = enrollment.instance?.assignment?.category?.display_name || enrollment.instance?.assignment?.category?.name || ''
                        const series = enrollment.instance?.assignment?.series?.display_name || enrollment.instance?.assignment?.series?.name || ''
                        const location = enrollment.instance?.assignment?.location?.name || enrollment.instance?.location?.name
                        const startDate = enrollment.instance?.start_date
                        const endDate = enrollment.instance?.end_date
                        const startTime = enrollment.instance?.start_time
                        const endTime = enrollment.instance?.end_time

                        return (
                          <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold">{courseName}</h3>
                                    <Badge variant={getStatusColor(enrollment.status)}>
                                      {enrollment.status}
                                    </Badge>
                                    {enrollment.waitlist_position && (
                                      <Badge variant="secondary">
                                        Position #{enrollment.waitlist_position}
                                      </Badge>
                                    )}
                                  </div>
                                  {(category || series) && (
                                    <p className="text-sm text-muted-foreground">
                                      {category && series ? `${category} > ${series}` : category || series}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    {location && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span>{location}</span>
                                      </div>
                                    )}
                                    {startDate && endDate && (
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>
                                          {formatDate(startDate)} - {formatDate(endDate)}
                                        </span>
                                      </div>
                                    )}
                                    {startTime && endTime && (
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>
                                          {formatTime(startTime)} - {formatTime(endTime)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {enrollment.enrolled_at && (
                                    <p className="text-xs text-muted-foreground">
                                      Enrolled on {formatDate(enrollment.enrolled_at)}
                                    </p>
                                  )}
                                  {(enrollment.status === 'cart' || enrollment.status === 'waitlisted') && (
                                    <div className="flex gap-2 mt-2">
                                      {enrollment.status === 'cart' && (
                                        <Button size="sm" variant="outline" asChild>
                                          <a href="/enrollments/cart">View Cart</a>
                                        </Button>
                                      )}
                                      {enrollment.status === 'waitlisted' && (
                                        <Button size="sm" variant="outline" asChild>
                                          <a href="/enrollments/waitlist">View Waitlist</a>
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Learning Analytics</CardTitle>
                  <CardDescription>
                    Track your learning progress and statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserAnalytics />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Methods Tab */}
            <TabsContent value="payment" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Payment Methods</CardTitle>
                      <CardDescription>
                        Manage your payment methods and billing information
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => setIsAddPaymentMethodOpen(true)}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Add Payment Method
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No payment methods added</p>
                      <Button onClick={() => setIsAddPaymentMethodOpen(true)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Add Payment Method
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentMethods.map((method) => (
                        <Card key={method.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {getCardBrandDisplay(method)} 
                                      {getCardLast4(method) && ` •••• ${getCardLast4(method)}`}
                                    </p>
                                    {method.is_default && (
                                      <Badge variant="outline" className="text-xs">
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                  {getCardExpiry(method) && (
                                    <p className="text-sm text-muted-foreground">
                                      Expires {getCardExpiry(method)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {!method.is_default && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSetDefaultPaymentMethod(method.id)}
                                    disabled={isSettingDefault === method.id}
                                  >
                                    {isSettingDefault === method.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Star className="mr-2 h-4 w-4" />
                                        Set as Default
                                      </>
                                    )}
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRemovePaymentMethod(method.id)}
                                  disabled={isRemovingPaymentMethod === method.id}
                                >
                                  {isRemovingPaymentMethod === method.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Billing History */}
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>
                    View your payment history and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No billing history available</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={isAddPaymentMethodOpen}
        onOpenChange={setIsAddPaymentMethodOpen}
        onSuccess={handleAddPaymentMethodSuccess}
      />
    </>
  )
}

