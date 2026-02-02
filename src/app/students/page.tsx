'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, User, School, Edit, Trash2, Mail } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

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

export default function StudentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStudentAccount, setIsStudentAccount] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

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
        setStudents(data.students || [])
        setIsStudentAccount(data.is_student || false)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
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

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(studentId)
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Student deleted successfully')
        fetchStudents()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete student')
      }
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student')
    } finally {
      setIsDeleting(null)
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
          <div>
            <h1 className="text-3xl font-bold">My Students</h1>
            <p className="text-muted-foreground mt-1">
              Manage student profiles and enrollment information
            </p>
          </div>
          {!isStudentAccount && (
            <Button onClick={() => router.push('/students/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          )}
        </div>

        {students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No students added yet</p>
              {!isStudentAccount && (
                <Button onClick={() => router.push('/students/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Student
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{student.name}</CardTitle>
                      <CardDescription>
                        {student.birth_date && (
                          <span>Age: {calculateAge(student.birth_date)}</span>
                        )}
                        {student.grade && <span> • Grade: {student.grade}</span>}
                      </CardDescription>
                    </div>
                    {student.is_primary && (
                      <Badge variant="default">Primary</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {student.school && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <School className="h-4 w-4" />
                        {student.school}
                      </div>
                    )}
                    {student.student_user_id && (
                      <Badge variant="outline" className="w-fit">
                        <Mail className="h-3 w-3 mr-1" />
                        Has Account
                      </Badge>
                    )}
                    {student.is_payer && (
                      <Badge variant="secondary" className="w-fit">Payer</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/students/${student.id}`)}
                      className="flex-1"
                    >
                      View
                    </Button>
                    {!isStudentAccount && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/students/${student.id}/edit`)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(student.id)}
                          disabled={isDeleting === student.id}
                        >
                          {isDeleting === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Invite Student Section */}
        {!isStudentAccount && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Invite Student to Create Account</CardTitle>
              <CardDescription>
                Send an invitation to allow a student to create their own account and link it to yours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => router.push('/students/invite')}>
                <Mail className="mr-2 h-4 w-4" />
                Send Invitation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </>
  )
}
