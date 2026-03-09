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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  birth_date: string | null
  grade: string | null
  school: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_notes: string | null
  notes: string | null
}

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Student>({
    id: '',
    name: '',
    birth_date: null,
    grade: null,
    school: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    medical_notes: null,
    notes: null,
  })

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
        setFormData({
          id: data.student.id,
          name: data.student.name || '',
          birth_date: data.student.birth_date || null,
          grade: data.student.grade || null,
          school: data.student.school || null,
          emergency_contact_name: data.student.emergency_contact_name || null,
          emergency_contact_phone: data.student.emergency_contact_phone || null,
          medical_notes: data.student.medical_notes || null,
          notes: data.student.notes || null,
        })
      } else if (response.status === 404) {
        router.push('/students')
      }
    } catch (error) {
      console.error('Error fetching student:', error)
      toast.error('Failed to load student')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Student name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          birth_date: formData.birth_date || null,
          grade: formData.grade || null,
          school: formData.school || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          medical_notes: formData.medical_notes || null,
          notes: formData.notes || null,
        })
      })

      if (response.ok) {
        toast.success('Student updated successfully')
        router.push(`/students/${studentId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update student')
      }
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('Failed to update student')
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
        <Button
          variant="ghost"
          onClick={() => router.push(`/students/${studentId}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Student
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Student</CardTitle>
            <CardDescription>
              Update student profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter student's full name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Birth Date</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={formData.grade || ''}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value || null })}
                    placeholder="e.g., 3rd, 5th"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Input
                  id="school"
                  value={formData.school || ''}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value || null })}
                  placeholder="School name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name || ''}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value || null })}
                  placeholder="Emergency contact person"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone || ''}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value || null })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_notes">Medical Notes</Label>
                <Textarea
                  id="medical_notes"
                  value={formData.medical_notes || ''}
                  onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value || null })}
                  placeholder="Any medical conditions or allergies..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  placeholder="Any additional information..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/students/${studentId}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Student'
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
