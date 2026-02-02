'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, ArrowLeft, Save, Bell } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationSettings {
  email_enrollments: boolean
  email_waitlist: boolean
  email_payments: boolean
  email_refunds: boolean
  email_reminders: boolean
  email_announcements: boolean
}

export default function NotificationSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enrollments: true,
    email_waitlist: true,
    email_payments: true,
    email_refunds: true,
    email_reminders: true,
    email_announcements: true,
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchSettings()
    }
  }, [status, router])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/notifications')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || settings)
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
      // Use default settings if fetch fails
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Notification settings updated successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update notification settings')
      }
    } catch (error) {
      console.error('Error updating notification settings:', error)
      toast.error('Failed to update notification settings')
    } finally {
      setIsSaving(false)
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
      <div className="container mx-auto px-4 py-8 pt-24 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/profile')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Choose which email notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_enrollments">Enrollment Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when enrollments are confirmed or updated
                    </p>
                  </div>
                  <Switch
                    id="email_enrollments"
                    checked={settings.email_enrollments}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_enrollments: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_waitlist">Waitlist Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when spots become available from waitlist
                    </p>
                  </div>
                  <Switch
                    id="email_waitlist"
                    checked={settings.email_waitlist}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_waitlist: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_payments">Payment Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails for payment confirmations and receipts
                    </p>
                  </div>
                  <Switch
                    id="email_payments"
                    checked={settings.email_payments}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_payments: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_refunds">Refund Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when refunds are processed
                    </p>
                  </div>
                  <Switch
                    id="email_refunds"
                    checked={settings.email_refunds}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_refunds: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_reminders">Reminder Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails for class reminders and important dates
                    </p>
                  </div>
                  <Switch
                    id="email_reminders"
                    checked={settings.email_reminders}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_reminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_announcements">Announcement Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails for academy announcements and news
                    </p>
                  </div>
                  <Switch
                    id="email_announcements"
                    checked={settings.email_announcements}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_announcements: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/profile')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  )
}
