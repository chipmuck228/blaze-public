'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowLeft, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  student_user_id: string | null
}

export default function InviteStudentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [email, setEmail] = useState('')
  const [invitationSent, setInvitationSent] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchStudents()
    }
  }, [status, router])

  const fetchStudents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/students')
      if (response.ok) {
        const data = await response.json()
        // Filter out students who already have accounts
        const studentsWithoutAccounts = (data.students || []).filter(
          (s: Student) => !s.student_user_id
        )
        setStudents(studentsWithoutAccounts)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStudentId || !email.trim()) {
      toast.error('Please select a student and enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    try {
      const selectedStudent = students.find(s => s.id === selectedStudentId)
      const response = await fetch('/api/students/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          email: email.trim(),
          student_name: selectedStudent?.name || ''
        })
      })

      if (response.ok) {
        const data = await response.json()
        setInvitationSent(true)
        if (data.emailSent) {
          toast.success('Invitation sent successfully!')
        } else {
          toast.warning('Invitation created but email sending failed. Please try again later.')
        }
        // Reset form
        setEmail('')
        setSelectedStudentId('')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error('Failed to send invitation')
    } finally {
      setIsSubmitting(false)
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
            onClick={() => router.push('/students')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invite Student to Create Account</CardTitle>
            <CardDescription>
              Send an invitation email to allow a student to create their own account and link it to yours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  All your students already have accounts, or you haven't added any students yet.
                </p>
                <Button onClick={() => router.push('/students')}>
                  Go to Students
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="student">Select Student</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId} required>
                    <SelectTrigger id="student">
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only students without accounts are shown
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The student will receive an invitation email at this address
                  </p>
                </div>

                {invitationSent && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Invitation sent successfully!</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      The student will receive an email with instructions to create their account.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/students')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !selectedStudentId || !email.trim()}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  )
}
