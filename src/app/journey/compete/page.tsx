'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { ArrowRight, Home, Users, Trophy, Sparkles, Lightbulb } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function JourneyCompetePage() {
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
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/30 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Step 2: Learn
                </Link>
                <Link
                  href="/journey/compete"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#38bdf8]/20 border border-[#38bdf8] text-white"
                >
                  Step 3: Compete & Innovate
                </Link>
              </nav>
              <h1 className="text-5xl md:text-6xl font-black mb-6 leading-none">
                Compete & Innovate
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">
                Where mastery meets the world.
              </p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                Join a team, build competition-ready robots, and take on local and global VEX events—or explore AI, IoT, and automation in our Innovation Lab. The choice is yours: compete at the highest level or pioneer what’s next.
              </p>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-2xl border border-[#38bdf8]/20 mb-8 max-w-2xl">
                <h3 className="text-white font-bold text-lg mb-3">The Pinnacle of Your Journey</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  After <strong>Explore</strong> and <strong>Learn</strong>, Step 3 opens two paths: <strong>Competition</strong>—team-based VEX events and world-stage excellence—or <strong>Innovation</strong>—labs where students explore AI, IoT, and automation. Both demand the skills you’ve built; both lead to extraordinary outcomes.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href="/competition">
                    <span className="sm:hidden">Start...</span>
                    <span className="hidden sm:inline">Start your COMPETE</span>
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
                <Trophy className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1.5} />
                <h3 className="text-white font-bold text-lg mb-1">Competition</h3>
                <p className="text-gray-400 text-xs">VEX teams, strategy, and local to global events.</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Lightbulb className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1.5} />
                <h3 className="text-white font-bold text-lg mb-1">Innovation Lab</h3>
                <p className="text-gray-400 text-xs">AI, IoT, automation—explore what’s next.</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Users className="text-[#38bdf8] w-10 h-10 mb-4" strokeWidth={1.5} />
                <h3 className="text-white font-bold text-lg mb-1">Team & Community</h3>
                <p className="text-gray-400 text-xs">Collaborate, compete, and create together.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 mt-20">
          <div className="mb-16 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-10 rounded-3xl border border-blue-100 dark:border-slate-700">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Where Mastery Meets the World
              </h2>
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                Step 3 is the culmination of The Programs for Your Robotics Journey. On the <strong>Competition</strong> track, students join teams, design and build tournament-ready robots, and compete in VEX events from local to world championships. On the <strong>Innovation</strong> track, they explore AI, IoT, and automation in dedicated labs—turning ideas into real projects.
              </p>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                Both paths build on the skills from Explore and Learn. Whether you’re drawn to the thrill of competition or the frontier of innovation, this is where your journey reaches its peak. <strong>Compete & Innovate</strong>—and leave your mark.
              </p>
              <Button
                size="lg"
                className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                asChild
              >
                <Link href="/competition">
                  <span className="sm:hidden">Start...</span>
                  <span className="hidden sm:inline">Start your COMPETE</span>
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Why Compete & Innovate */}
          <section className="bg-[#0f172a] dark:bg-slate-900 py-16 sm:py-20 lg:py-24 relative overflow-hidden rounded-3xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold text-white dark:text-slate-100 mb-4">Why Compete & Innovate?</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">Two paths. One destination: excellence.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Trophy className="w-8 h-8 text-[#38bdf8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Competition</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">Join a team, build for the arena, and compete at local and global VEX events.</p>
                </div>
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Sparkles className="w-8 h-8 text-[#38bdf8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Innovation Lab</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">Explore AI, IoT, and automation in hands-on projects and real applications.</p>
                </div>
                <div className="bg-slate-800/50 dark:bg-slate-800/70 p-6 rounded-3xl border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-sm text-center">
                  <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Users className="w-8 h-8 text-[#38bdf8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white dark:text-slate-100 mb-2">Team & Impact</h3>
                  <p className="text-slate-400 dark:text-slate-300 text-sm">Collaborate with peers and mentors; leave your mark on the world stage or the lab.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="mt-20 text-center">
            <div className="bg-slate-100 dark:bg-slate-800/50 p-12 rounded-3xl border border-slate-200 dark:border-slate-700">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Ready to Compete or Innovate?</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
                Find teams and events at your location, or discover our Innovation Lab programs.
              </p>
              <Button
                size="lg"
                className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                asChild
              >
                <Link href="/competition">
                  <span className="sm:hidden">Start...</span>
                  <span className="hidden sm:inline">Start your COMPETE</span>
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
