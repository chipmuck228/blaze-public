'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { BookOpen, Users, Clipboard, Video, Zap, FileText, Lock, ExternalLink } from 'lucide-react'
import Image from 'next/image'

export default function TeacherPortalPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const token = sessionStorage.getItem('teacher_portal_token')
    if (!token) {
      router.push('/teacher-portal/login')
      return
    }
    setIsAuthenticated(true)
    setIsChecking(false)
  }, [router])

  const teacherTools = [
    { title: 'Curriculum Access', icon: <BookOpen className="w-6 h-6" />, desc: 'Browse lesson plans and project slides.' },
    { title: 'Class Rosters', icon: <Users className="w-6 h-6" />, desc: 'Manage attendance and student profiles.' },
    { title: 'Student Grading', icon: <Clipboard className="w-6 h-6" />, desc: 'Submit evaluations and badge awards.' },
    { title: 'Training Center', icon: <Video className="w-6 h-6" />, desc: 'Internal tutorials and safety training.' },
    { title: 'Inventory Log', icon: <Zap className="w-6 h-6" />, desc: 'Request parts and log kit status.' },
    { title: 'Resource Library', icon: <FileText className="w-6 h-6" />, desc: 'Handouts, worksheets, and CAD files.' },
  ]

  if (isChecking) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Verifying access...</p>
          </div>
        </main>
      </>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <Navbar />
      <main className="py-10 bg-slate-50 dark:bg-slate-900 min-h-screen">
        <section className="bg-indigo-900 dark:bg-indigo-950 py-20 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-2xl">
              <span className="text-indigo-300 font-bold uppercase tracking-widest text-xs">Instructor Workspace</span>
              <h1 className="text-5xl font-black mt-2 mb-6">Teacher Portal</h1>
              <p className="text-indigo-100 text-lg">
                Empowering our instructors with high-end curriculum resources and student management tools to deliver world-class robotics education.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-900 overflow-hidden">
                <Image 
                  src="https://picsum.photos/seed/teacher/100/100" 
                  alt="Profile" 
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs text-indigo-200 uppercase font-black tracking-widest leading-none mb-1">Welcome back,</p>
                <p className="font-bold text-lg leading-none">Instructor</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Tools Grid */}
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {teacherTools.map((tool, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group cursor-pointer flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                  {tool.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{tool.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>

          {/* Security / Auth State Simulated */}
          <div className="bg-slate-900 dark:bg-slate-950 text-white p-12 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 shadow-2xl">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-2xl font-bold mb-1">Administrative Level Access</h4>
                <p className="text-slate-400">Sensitive student data and financials require Admin level verification.</p>
              </div>
            </div>
            <Link
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold transition-all whitespace-nowrap inline-flex items-center gap-2"
            >
              Launch Admin Panel
              <ExternalLink className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
