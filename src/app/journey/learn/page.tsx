'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { ArrowRight, Home, Target, BookOpen, Cpu, Layers } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function JourneyLearnPage() {
  return (
    <>
      <Navbar />
      <div className="pb-24 pt-14">
        {/* Hero */}
        <section className="bg-[#0f172a] py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#38bdf8]/5 -skew-x-12 translate-x-20" />
          <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-3/5 text-white">
              <p className="text-[#38bdf8] font-semibold uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm mb-2 leading-snug text-balance max-w-xl sm:max-w-none">
                The Programs for Your Robotics Journey
              </p>
              <nav className="flex flex-wrap gap-2 mb-6" aria-label="Journey steps">
                <Link
                  href="/journey/explore"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/30 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Step 1: Explore
                </Link>
                <Link
                  href="/journey/learn"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#38bdf8]/20 border border-[#38bdf8] text-white"
                >
                  Step 2: Learn
                </Link>
                <Link
                  href="/journey/compete"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/30 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Step 3: Compete & Innovate
                </Link>
              </nav>
              <h1 className="text-5xl md:text-6xl font-black mb-6 leading-none">
                Learn
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">
                Where skills become mastery.
              </p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                Structured courses for ages 12–18. Develop core robotics skills—programming, control, sensors, and automation—using VEX V5 and VEX EXP. Build the technical foundation for competition and beyond.
              </p>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-2xl border border-[#38bdf8]/20 mb-8 max-w-2xl">
                <h3 className="text-white font-bold text-lg mb-3">From Exploration to Expertise</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Learn is the natural next step after <strong>Explore</strong>. In structured courses, students deepen their programming and engineering skills, work with advanced platforms, and prepare for <strong>Step 3: Compete & Innovate</strong>—whether that means joining a team or diving into innovation labs.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href="/course">
                    <span className="sm:hidden">Start...</span>
                    <span className="hidden sm:inline">Start your LEARN</span>
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
                <BookOpen className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1.5} />
                <h3 className="text-white font-bold text-lg mb-1">Ages 12–18</h3>
                <p className="text-gray-400 text-xs">Intermediate to advanced—build on your Explore experience.</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Cpu className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1.5} />
                <h3 className="text-white font-bold text-lg mb-1">Programming & Control</h3>
                <p className="text-gray-400 text-xs">Structured curriculum in coding and systems design.</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Layers className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1.5} />
                <h3 className="text-white font-bold text-lg mb-1">VEX V5 & EXP</h3>
                <p className="text-gray-400 text-xs">Industry-standard platforms for serious learning.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 mt-20">
          <div className="mb-16 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-10 rounded-3xl border border-blue-100 dark:border-slate-700">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Where Skills Become Mastery
              </h2>
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                The Learn step turns curiosity into capability. Through structured courses, students develop core robotics skills: programming, control systems, sensors, and automation. Using VEX V5 and VEX EXP, they tackle real engineering challenges and prepare for competition or career paths.
              </p>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                Whether the goal is joining a competitive team or exploring advanced applications, Learn provides the technical foundation. Ready to level up? Enroll in a course and build your future.
              </p>
              <Button
                size="lg"
                className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                asChild
              >
                <Link href="/course">
                  <span className="sm:hidden">Start...</span>
                  <span className="hidden sm:inline">Start your LEARN</span>
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Why Learn */}
          <section className="bg-[#0f172a] dark:bg-slate-900 py-16 sm:py-20 lg:py-24 relative overflow-hidden rounded-3xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold text-white dark:text-slate-100 mb-4">Why Learn?</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">Structured learning that prepares you for what’s next.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Target className="w-8 h-8 text-[#38bdf8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Core Skills</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">Programming, control, sensors, and automation in a clear progression.</p>
                </div>
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <BookOpen className="w-8 h-8 text-[#38bdf8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Structured Curriculum</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">Designed to take you from intermediate to competition-ready.</p>
                </div>
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Layers className="w-8 h-8 text-[#38bdf8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Career & Competition Ready</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">The foundation for teams, events, and future engineering paths.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="mt-20 text-center">
            <div className="bg-slate-100 dark:bg-slate-800/50 p-12 rounded-3xl border border-slate-200 dark:border-slate-700">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Ready to Learn?</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
                Browse courses at your location and take the next step on your robotics journey.
              </p>
              <Button
                size="lg"
                className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                asChild
              >
                <Link href="/course">
                  <span className="sm:hidden">Start...</span>
                  <span className="hidden sm:inline">Start your LEARN</span>
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
