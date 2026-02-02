'use client'

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Navbar } from "@/components/Navbar"
import { MobileLayout } from "@/app/mobile-layout"
import { usePlatform } from "@/hooks/usePlatform"
import { Footer } from "@/components/Footer"
import { Loader2, User, Mail, Phone, Save, Plus, Settings, Trash2, GraduationCap, Bell, Shield, Lock, AlertCircle, Camera, ChevronRight, Heart } from "lucide-react"
import Link from "next/link"

interface UserProfile {
  id: string
  name: string
  email: string
  email_verified: boolean
  image?: string
  created_at: string
}

interface Student {
  id: string
  name: string
  grade: string | null
  school: string | null
  medical_notes: string | null
}

interface NotificationSettings {
  emailReminders?: boolean
  smsAlerts?: boolean
  newsletter?: boolean
  emergencyOnly?: boolean
  email_enrollments?: boolean
  email_waitlist?: boolean
  email_payments?: boolean
  email_refunds?: boolean
  email_reminders?: boolean
  email_announcements?: boolean
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isNative, isReady } = usePlatform()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailReminders: true,
    smsAlerts: false,
    newsletter: true,
    emergencyOnly: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user) {
      fetchProfile()
      fetchStudents()
      fetchNotifications()
    }
  }, [status, session, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        // Split name into first and last
        const nameParts = data.name.split(" ")
        setFirstName(nameParts[0] || "")
        setLastName(nameParts.slice(1).join(" ") || "")
        setEmail(data.email || "")
        // Phone would come from profile if available
        setPhone("")
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/user/notifications")
      if (response.ok) {
        const data = await response.json()
        const settings = data.settings || {}
        setNotifications({
          emailReminders: settings.email_reminders ?? true,
          smsAlerts: settings.email_waitlist ?? false,
          newsletter: settings.email_announcements ?? true,
          emergencyOnly: settings.email_payments ?? false,
        })
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
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
          name: `${firstName} ${lastName}`.trim(),
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setProfile(updated)
        setIsEditingInfo(false)
        toast.success("Profile updated successfully")
      } else {
        toast.error("Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateNotifications = async (key: string, value: boolean) => {
    const updatedNotifications = { ...notifications, [key]: value }
    setNotifications(updatedNotifications)
    
    // Map to API format
    const apiSettings: any = {}
    if (key === 'emailReminders') apiSettings.email_reminders = value
    if (key === 'smsAlerts') apiSettings.email_waitlist = value
    if (key === 'newsletter') apiSettings.email_announcements = value
    if (key === 'emergencyOnly') apiSettings.email_payments = value

    try {
      const response = await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiSettings),
      })

      if (!response.ok) {
        // Revert on error
        setNotifications(notifications)
        toast.error("Failed to update notification settings")
      }
    } catch (error) {
      console.error("Error updating notifications:", error)
      setNotifications(notifications)
      toast.error("Failed to update notification settings")
    }
  }

  const getMemberSince = () => {
    if (!profile?.created_at) return "2024"
    return new Date(profile.created_at).getFullYear().toString()
  }

  if (status === "loading" || isLoading) {
    return (
      <>
        <Navbar />
        <div className="pt-14 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!session || !profile) {
    return null
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const content = (
    <div className="pb-24 bg-slate-50 min-h-screen">
      {/* Portal Header */}
      <section className="bg-[#0f172a] py-16 text-white">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black mb-2">My Profile</h1>
              <p className="text-slate-400">Manage your family account, student details, and communication preferences.</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-white">{profile.name}</p>
                <p className="text-xs text-slate-500">Member since {getMemberSince()}</p>
              </div>
              <div className="relative group">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-black shadow-xl shadow-blue-500/20">
                  {getUserInitials(profile.name)}
                </div>
                <button className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-xl text-blue-600 shadow-lg border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* General Info Card */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Personal Information</h3>
                </div>
                <button 
                  onClick={() => {
                    if (isEditingInfo) {
                      handleSaveProfile()
                    } else {
                      setIsEditingInfo(true)
                    }
                  }}
                  disabled={isSaving}
                  className="flex items-center space-x-2 text-sm font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                  ) : isEditingInfo ? (
                    <><Save className="w-4 h-4" /><span>Save Changes</span></>
                  ) : (
                    <span>Edit Profile</span>
                  )}
                </button>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                    <input 
                      disabled={!isEditingInfo}
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none font-medium transition-all ${
                        isEditingInfo ? 'bg-white border-blue-500 ring-2 ring-blue-500/10' : 'bg-slate-50 border-slate-200'
                      }`} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                    <input 
                      disabled={!isEditingInfo}
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none font-medium transition-all ${
                        isEditingInfo ? 'bg-white border-blue-500 ring-2 ring-blue-500/10' : 'bg-slate-50 border-slate-200'
                      }`} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        disabled={!isEditingInfo}
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none font-medium transition-all ${
                          isEditingInfo ? 'bg-white border-blue-500 ring-2 ring-blue-500/10' : 'bg-slate-50 border-slate-200'
                        }`} 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        disabled={!isEditingInfo}
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (425) 555-0123"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none font-medium transition-all ${
                          isEditingInfo ? 'bg-white border-blue-500 ring-2 ring-blue-500/10' : 'bg-slate-50 border-slate-200'
                        }`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Profiles Section */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Student Profiles</h3>
                </div>
                <button 
                  onClick={() => router.push('/students/new')}
                  className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Student</span>
                </button>
              </div>
              <div className="p-8">
                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-4">No students added yet</p>
                    <button 
                      onClick={() => router.push('/students/new')}
                      className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all"
                    >
                      Add Your First Student
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {students.map((student) => (
                      <div key={student.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50 relative group hover:border-blue-300 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-indigo-600">
                            {getUserInitials(student.name)}
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => router.push(`/students/${student.id}`)}
                              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">{student.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {student.grade && (
                            <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-widest">{student.grade}</span>
                          )}
                          {student.school && (
                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{student.school}</span>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center space-x-4 text-xs">
                          <div className="flex items-center text-slate-500">
                            <Heart className={`w-3 h-3 mr-1 ${student.medical_notes ? 'text-red-500 fill-red-500' : ''}`} />
                            <span>Allergies: {student.medical_notes || 'None'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Communications</h3>
                </div>
              </div>
              <div className="p-8 space-y-6">
                {[
                  { key: 'emailReminders', title: 'Email Reminders', desc: 'Class schedules, registration updates, and announcements.' },
                  { key: 'smsAlerts', title: 'SMS Notifications', desc: 'Real-time alerts for waitlist spots and emergency campus updates.' },
                  { key: 'newsletter', title: 'Monthly Newsletter', desc: 'Student achievements, seasonal camp launches, and STEM articles.' },
                  { key: 'emergencyOnly', title: 'Emergency Only', desc: 'Crucial account alerts and mandatory policy updates.' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="max-w-md">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateNotifications(item.key, !notifications[item.key as keyof typeof notifications])}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        notifications[item.key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Card */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Account Security</h3>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="font-bold text-slate-900">Change Password</p>
                    <p className="text-xs text-slate-500">Ensure your account is using a long, random password to stay secure.</p>
                  </div>
                  <button className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Update Password</span>
                  </button>
                </div>
                
                <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-slate-900">Active Sessions</p>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded">Secure</span>
                    </div>
                    <p className="text-xs text-slate-500">You are currently logged into this device.</p>
                  </div>
                  <button className="text-red-500 font-bold text-sm hover:underline">Log out all other devices</button>
                </div>
              </div>
            </div>

            {/* Delete Account Notice */}
            <div className="p-8 bg-red-50 rounded-[32px] border border-red-100 flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-bold text-red-900 mb-1">Danger Zone</h4>
                <p className="text-red-700 text-sm">Deleting your account will permanently remove all student progress, order history, and saved data. This action cannot be undone.</p>
              </div>
              <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-500/20 whitespace-nowrap">
                Delete Account
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )

  // 移动端：使用移动端布局
  if (isReady && isNative) {
    return (
      <MobileLayout>
        {content}
      </MobileLayout>
    )
  }

  // Web 端：使用完整布局
  return (
    <>
      <Navbar />
      <div className="pt-14">
        {content}
      </div>
      <Footer />
    </>
  )
}
