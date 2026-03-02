'use client'

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { ArrowRight, Home, Zap, Sparkles, Target, Compass } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function JourneyExplorePage() {
  const [beginnerCategoryId, setBeginnerCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/public/categories')
        if (!res.ok) return
        const data = await res.json()
        const list = data.categories || []
        const beginner = list.find((c: { name: string }) => (c.name || '').toLowerCase() === 'beginner_robotics')
        if (beginner?.id) setBeginnerCategoryId(beginner.id)
      } catch {
        // ignore
      }
    }
    fetchCategories()
  }, [])

  const exploreProgramsHref = beginnerCategoryId
    ? `/programs?category=${encodeURIComponent(beginnerCategoryId)}`
    : '/programs'

  return (
    <>
      <Navbar />
      <div className="pb-24 pt-14">
        {/* Hero */}
        <section className="bg-[#0f172a] py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#38bdf8]/5 -skew-x-12 translate-x-20" />
          <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-3/5 text-white">
              <p className="text-[#38bdf8] font-semibold uppercase tracking-widest text-sm mb-2">The Robotics Journey</p>
              <nav className="flex flex-wrap gap-2 mb-6" aria-label="Journey steps">
                <Link
                  href="/journey/explore"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#38bdf8]/20 border border-[#38bdf8] text-white"
                >
                  Step 1: Explore
                </Link>
                <Link
                  href="/journey/build"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/30 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Step 2: Build
                </Link>
                <Link
                  href="/journey/compete"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/30 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Step 3: Compete & Innovate
                </Link>
              </nav>
              <h1 className="text-5xl md:text-6xl font-black mb-6 leading-none">
                Explore
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">
                Where curiosity becomes confidence.
              </p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                The first step is discovery. Through beginner programs—camps, courses, and workshops—with platforms like VEX IQ, young learners ages 8–12 build foundational skills and a lasting passion for robotics. No experience required.
              </p>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-2xl border border-[#38bdf8]/20 mb-8 max-w-2xl">
                <h3 className="text-white font-bold text-lg mb-3">Your Robotics Journey Starts Here</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Explore is the perfect introduction: high-energy, game-style learning that sparks interest and builds confidence. You can start with a <strong>camp</strong>, a <strong>course</strong>, or a <strong>workshop</strong>—all designed for beginners. From here, students progress to <strong>Step 2: Build</strong> and eventually <strong>Step 3: Compete & Innovate</strong>. Begin your journey today.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href={exploreProgramsHref}>
                    Explore beginner programs
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20"
                  asChild
                  title="Back to Journey"
                >
                  <Link href="/#journey">
                    <Home className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="md:w-2/5 grid grid-cols-1 gap-4">
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Compass className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1} />
                <h3 className="text-white font-bold text-lg mb-1">Ages 8–12</h3>
                <p className="text-gray-400 text-xs">Designed for beginners—no prior experience needed.</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Zap className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1} />
                <h3 className="text-white font-bold text-lg mb-1">Camps, Courses & Workshops</h3>
                <p className="text-gray-400 text-xs">Beginner offerings in the format that fits you.</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Sparkles className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1} />
                <h3 className="text-white font-bold text-lg mb-1">VEX IQ & Beyond</h3>
                <p className="text-gray-400 text-xs">Game-style learning that ignites a love for robotics.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Where Curiosity Becomes Confidence */}
        <div className="max-w-7xl mx-auto px-4 mt-20">
          <div className="mb-16 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-10 rounded-3xl border border-blue-100 dark:border-slate-700">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Where Curiosity Becomes Confidence
              </h2>
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                The Explore step is the foundation of The Robotics Journey. We meet young learners where they are—with beginner <strong>camps</strong>, <strong>courses</strong>, and <strong>workshops</strong> that spark interest in building and coding. Through VEX IQ and game-style learning, students develop foundational skills and the confidence to take the next step.
              </p>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                This isn’t just an intro—it’s the moment many discover a lifelong passion. From here, the path leads to structured courses (Build) and competition or innovation (Compete & Innovate). Your journey begins with a single step: <strong>Explore.</strong>
              </p>
              <Button
                size="lg"
                className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                asChild
              >
                <Link href={exploreProgramsHref}>
                  Explore beginner programs
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Why Start with Explore */}
          <section className="bg-[#0f172a] dark:bg-slate-900 py-16 sm:py-20 lg:py-24 relative overflow-hidden rounded-3xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold text-white dark:text-slate-100 mb-4">Why Start with Explore?</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">The perfect first step for every young learner.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Zap className="w-8 h-8 text-[#38bdf8]" strokeWidth={1} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Spark Interest</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">Fun, low-pressure environments where curiosity leads the way.</p>
                </div>
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Target className="w-8 h-8 text-[#38bdf8]" strokeWidth={1} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Build Foundations</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">Core skills and confidence that set up success in Build and Compete.</p>
                </div>
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Sparkles className="w-8 h-8 text-[#38bdf8]" strokeWidth={1} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">No Experience Needed</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">Ages 8–12, all welcome. Your journey starts the moment you say yes.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="mt-20 text-center">
            <div className="bg-slate-100 dark:bg-slate-800/50 p-12 rounded-3xl border border-slate-200 dark:border-slate-700">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Ready to Explore?</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
                Find beginner programs—camps, courses, and workshops—at a location near you and take the first step on your robotics journey.
              </p>
              <Button
                size="lg"
                className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                asChild
              >
                <Link href={exploreProgramsHref}>
                  Explore beginner programs
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}
