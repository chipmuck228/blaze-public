'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Edit, School, Calendar, Phone, Mail, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Student {
  id: string
  name: string
  birth_date: string | null
  grade: string | null
  school: string | null
  student_user_id: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_notes: string | null
  notes: string | null
  is_active: boolean
  relationship: string
  is_primary: boolean
  is_payer: boolean
  can_manage_enrollments: boolean
  can_view_progress: boolean
  sync_cart_to_parent: boolean
  created_at: string
  updated_at: string
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    const loadStudentId = async () => {
      const resolvedParams = await params
      setStudentId(resolvedParams.id)
    }
    loadStudentId()
  }, [params])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && studentId) {
      fetchStudent()
    }
  }, [status, studentId, router])

  const fetchStudent = async () => {
    if (!studentId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/students/${studentId}`)
      if (response.ok) {
        const data = await response.json()
        setStudent(data.student)
      } else if (response.status === 404) {
        router.push('/students')
      }
    } catch (error) {
      console.error('Error fetching student:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  if (!student) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Student not found</p>
              <Button onClick={() => router.push('/students')}>
                Back to Students
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/students')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
          <Button onClick={() => router.push(`/students/${student.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{student.name}</CardTitle>
                    <CardDescription>
                      Student Profile Information
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {student.is_primary && (
                      <Badge variant="default">Primary</Badge>
                    )}
                    {student.is_payer && (
                      <Badge variant="secondary">Payer</Badge>
                    )}
                    {student.student_user_id && (
                      <Badge variant="outline">
                        <Mail className="h-3 w-3 mr-1" />
                        Has Account
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {student.birth_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Age</p>
                      <p className="font-medium">
                        {calculateAge(student.birth_date)} years old
                      </p>
                    </div>
                  )}
                  {student.grade && (
                    <div>
                      <p className="text-sm text-muted-foreground">Grade</p>
                      <p className="font-medium">{student.grade}</p>
                    </div>
                  )}
                </div>

                {student.school && (
                  <div className="flex items-center gap-2">
                    <School className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">School</p>
                      <p className="font-medium">{student.school}</p>
                    </div>
                  </div>
                )}

                {student.birth_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Birth Date</p>
                      <p className="font-medium">{formatDate(student.birth_date)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {(student.emergency_contact_name || student.emergency_contact_phone) && (
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {student.emergency_contact_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{student.emergency_contact_name}</p>
                    </div>
                  )}
                  {student.emergency_contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{student.emergency_contact_phone}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Medical Notes */}
            {student.medical_notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Medical Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{student.medical_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Additional Notes */}
            {student.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relationship</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{student.relationship}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Can Manage:</span>
                  <span>{student.can_manage_enrollments ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Can View Progress:</span>
                  <span>{student.can_view_progress ? 'Yes' : 'No'}</span>
                </div>
                {student.sync_cart_to_parent && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cart Sync:</span>
                    <span>Enabled</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/enrollments/orders?student=${student.id}`}>
                    View Orders
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/students/${student.id}/edit`}>
                    Edit Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
