'use client'

import { useState, useEffect, useMemo } from "react"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import {
  Calendar,
  ArrowRight,
  Home,
  Box,
  Bot,
  Sparkles,
  Trophy,
  Users,
  Wrench,
  MessageSquare,
  Award,
  GraduationCap,
  Layers,
  Code2,
  Clock,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function WorkshopOfferingPage() {
  const [apiCategories, setApiCategories] = useState<any[]>([])

  const workshopsLink = useMemo(() => {
    const workshopCategory = apiCategories.find((cat) => {
      const name = (cat.name || "").toLowerCase()
      return name.includes("workshop")
    })
    if (workshopCategory) {
      return `/programs?category=${encodeURIComponent(workshopCategory.id)}`
    }
    return "/programs"
  }, [apiCategories])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/public/categories")
        if (res.ok) {
          const data = await res.json()
          setApiCategories(data.categories || [])
        }
      } catch (err) {
        console.error("Error fetching categories:", err)
      }
    }
    fetchCategories()
  }, [])

  return (
    <>
      <Navbar />
      <div className="pb-24 pt-14">
        {/* Hero - same structure as course */}
        <section className="bg-[#0f172a] py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#38bdf8]/5 -skew-x-12 translate-x-20" />
          <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-3/5 text-white">
              <h1 className="text-5xl md:text-6xl font-black mb-6 leading-none">
                Blaze STEAM Workshops
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">
                Project-Based Learning | 3D & Robotics | Your Pace, Your Schedule
              </p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                A creative space where your child discovers technology through 3D design, printing, robotics, and coding—with flexible scheduling that fits your family.
              </p>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-2xl border border-[#38bdf8]/20 mb-8 max-w-2xl">
                <h3 className="text-white font-bold text-lg mb-3">Project-Based Learning</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Research from Lucas Education Research and five major universities shows that students in PBL classrooms <strong>significantly outperform</strong> those in traditional settings. Our workshops use guided mini-lessons and the latest software and hardware so students design, build, and test at their own pace.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href={workshopsLink}>
                    View Workshops
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  asChild
                  title="Back to Home"
                >
                  <Link href="/#journey">
                    <Home className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="md:w-2/5 grid grid-cols-2 gap-4">
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Box className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">3D & Design</h3>
                <p className="text-gray-400 text-xs">Model, print, create</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <Bot className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Robotics</h3>
                <p className="text-gray-400 text-xs">VEX, build & code</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Sparkles className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">PBL</h3>
                <p className="text-gray-400 text-xs">Research-backed</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <Calendar className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Flexible</h3>
                <p className="text-gray-400 text-xs">Pick your dates</p>
              </div>
            </div>
          </div>
        </section>

        {/* Workshop Highlights - graphical + short copy */}
        <section id="main-content" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-50 rounded-[40px] p-8 md:p-16 border border-slate-200">
              <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
                Workshop Highlights
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-12">
                Choose your focus: 3D design & printing, robotics & coding, or both. Progress at your own pace through design → build → test.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 3D Focus */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6">
                    <Layers className="w-8 h-8 text-cyan-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">3D Design & Printing</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Focus on 3D modeling and printing: airplanes, rockets, or custom problem-solving designs. Go from digital concept to a real 3D object.
                  </p>
                </div>
                {/* Robotics */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                    <Bot className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Robotics & Coding</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Design and build robots with VEX elements. Learn block-based or text-based coding. Solve real-world problems with creativity.
                  </p>
                </div>
                {/* Flexible Schedule */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Flexible Scheduling</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    You choose the dates and times that work for your family. No rigid terms—learn when it fits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PBL + What We Offer - compact intro */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-10 rounded-3xl border border-blue-100 dark:border-slate-700">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
                  Why Project-Based Learning?
                </h2>
                <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                  Blaze workshops combine robotics, coding, and creative design in a hands-on PBL format. Students work through design → build → test tasks that grow in difficulty, building skills and confidence.
                </p>
                <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  Backed by <strong>Lucas Education Research</strong> and five major universities: PBL students <strong>significantly outperform</strong> those in traditional classrooms. We use guided mini-lessons and the latest software and hardware to support your child’s STEAM journey.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Visual: Design → Build → Test */}
        <section className="py-20 px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              How It Works
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-md border border-slate-200 text-center min-w-[200px]">
                <div className="w-14 h-14 bg-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Code2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Design</h3>
                <p className="text-slate-500 text-sm">Digital concept & plan</p>
              </div>
              <div className="text-2xl text-slate-400">→</div>
              <div className="bg-white rounded-2xl p-8 shadow-md border border-slate-200 text-center min-w-[200px]">
                <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Wrench className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Build</h3>
                <p className="text-slate-500 text-sm">Hands-on creation</p>
              </div>
              <div className="text-2xl text-slate-400">→</div>
              <div className="bg-white rounded-2xl p-8 shadow-md border border-slate-200 text-center min-w-[200px]">
                <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Test</h3>
                <p className="text-slate-500 text-sm">Iterate & improve</p>
              </div>
            </div>
            <p className="text-center text-slate-500 mt-6 text-sm">
              Students progress at their own pace through tasks that gradually increase in difficulty.
            </p>
          </div>
        </section>

        {/* Why Join Blaze - same as course */}
        <section className="bg-[#0f172a] dark:bg-slate-900 py-16 sm:py-20 lg:py-24 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-600/10 dark:bg-sky-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white dark:text-slate-100 mb-6">
                Why Join Blaze?
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 dark:border-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700/70 transition-colors backdrop-blur-sm text-center">
                <div className="w-12 h-12 bg-[#2563eb] dark:bg-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/20">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">78 Awards</h3>
                <p className="text-slate-400 dark:text-slate-300 text-sm">State & world champions</p>
              </div>
              <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 dark:border-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700/70 transition-colors backdrop-blur-sm text-center">
                <div className="w-12 h-12 bg-[#2563eb] dark:bg-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/20">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">26 Years</h3>
                <p className="text-slate-400 dark:text-slate-300 text-sm">Combined experience</p>
              </div>
              <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 dark:border-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700/70 transition-colors backdrop-blur-sm text-center">
                <div className="w-12 h-12 bg-[#2563eb] dark:bg-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/20">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Expert Coaches</h3>
                <p className="text-slate-400 dark:text-slate-300 text-sm">World-winning mentors</p>
              </div>
              <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 dark:border-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700/70 transition-colors backdrop-blur-sm text-center">
                <div className="w-12 h-12 bg-[#2563eb] dark:bg-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/20">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Robot House</h3>
                <p className="text-slate-400 dark:text-slate-300 text-sm">6000 sq ft facility</p>
              </div>
              <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 dark:border-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700/70 transition-colors backdrop-blur-sm text-center">
                <div className="w-12 h-12 bg-[#2563eb] dark:bg-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/20">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Community</h3>
                <p className="text-slate-400 dark:text-slate-300 text-sm">Vibrant peer network</p>
              </div>
              <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 dark:border-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700/70 transition-colors backdrop-blur-sm text-center">
                <div className="w-12 h-12 bg-[#2563eb] dark:bg-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/20">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Alumni Success</h3>
                <p className="text-slate-400 dark:text-slate-300 text-sm">MIT & top schools</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA - same style as course "Our Choice" */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-blue-600 font-bold uppercase tracking-widest text-sm">
                  Workshops
                </span>
                <h2 className="text-4xl font-bold text-slate-900 mt-4 mb-6">
                  Creative Space for STEAM
                </h2>
                <p className="text-slate-600 mb-6">
                  Discover 3D modeling, 3D printing, robotics, and programming in a project-based setting. Choose your focus, progress at your pace, and pick the schedule that works for your family.
                </p>
                <Button
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href={workshopsLink}>
                    View Workshops
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
              <div className="rounded-[40px] overflow-hidden shadow-2xl shadow-blue-900/10">
                <Image
                  src="https://picsum.photos/seed/workshop/800/600"
                  alt="Blaze STEAM workshop"
                  width={800}
                  height={600}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
