'use client'

import { useState, useEffect, useMemo } from "react"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Calendar, MapPin, Loader2, ArrowRight, Home, BookOpen, GraduationCap, Award, Trophy, Users, Wrench, MessageSquare, Sparkles, Target, Zap } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CourseOfferingPage() {
  const [apiCategories, setApiCategories] = useState<any[]>([])

  // 获取 courses category 的链接（排除 camps）
  const coursesCategoryLink = useMemo(() => {
    // 找到第一个不是 camps 的 category
    const courseCategory = apiCategories.find(cat => {
      const categoryName = (cat.name || '').toLowerCase()
      return !categoryName.includes('camp')
    })
    if (courseCategory) {
      return `/programs?category=${encodeURIComponent(courseCategory.id)}`
    }
    return '/programs'
  }, [apiCategories])

  useEffect(() => {
    // 获取 categories
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/public/categories')
        if (response.ok) {
          const data = await response.json()
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
        {/* Hero */}
        <section className="bg-[#0f172a] py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#38bdf8]/5 -skew-x-12 translate-x-20"></div>
          <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-3/5 text-white">
              <h1 className="text-5xl md:text-6xl font-black mb-6 leading-none">
                Blaze Robotics Course Offerings
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">
                Year-Round Learning | Structured Pathways | Skill Development
              </p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                Empowering students through STEM mastery across all locations. Build foundational skills, advance through structured pathways, and prepare for competitive robotics.
              </p>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-2xl border border-[#38bdf8]/20 mb-8 max-w-2xl">
                <h3 className="text-white font-bold text-lg mb-3">Step 2: Build - Master the Fundamentals</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Our structured courses are the second step in The Robotics Journey, building upon the exploration and curiosity sparked in camps. Through comprehensive curriculum and hands-on practice, students master the fundamentals of mechanics, programming, and engineering. This deep learning experience prepares them to advance to competitive teams (Step 3: Compete) where they can apply their skills in real-world tournaments and challenges.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href={coursesCategoryLink}>
                    View All Courses
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
                <BookOpen className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Comprehensive</h3>
                <p className="text-gray-400 text-xs">Full curriculum</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <GraduationCap className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">3 Pathways</h3>
                <p className="text-gray-400 text-xs">K-2, 3-5, 6-8</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Award className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Certified</h3>
                <p className="text-gray-400 text-xs">Industry recognized</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <Calendar className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Year-Round</h3>
                <p className="text-gray-400 text-xs">Continuous learning</p>
              </div>
            </div>
          </div>
        </section>

        {/* Course Pathways Map */}
        <section id="main-content" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-50 rounded-[40px] p-8 md:p-16 border border-slate-200">
              <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Your Robotics Pathway</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                <div className="relative z-10 text-center">
                  <div className="bg-cyan-600 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-slate-300">
                    1
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">RoboQuests</h3>
                  <span className="text-sm font-bold uppercase tracking-wider text-blue-600">Grades K-2</span>
                  <p className="mt-4 text-slate-500">Laying the foundations of logic and building.</p>
                </div>
                <div className="relative z-10 text-center">
                  <div className="bg-blue-600 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-slate-300">
                    2
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">LaunchPad</h3>
                  <span className="text-sm font-bold uppercase tracking-wider text-blue-600">Grades 3-5</span>
                  <p className="mt-4 text-slate-500">Stepping into complex mechanics and coding.</p>
                </div>
                <div className="relative z-10 text-center">
                  <div className="bg-indigo-600 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-slate-300">
                    3
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">RoboChamps</h3>
                  <span className="text-sm font-bold uppercase tracking-wider text-blue-600">Grades 6-8</span>
                  <p className="mt-4 text-slate-500">Professional tools and competitive mastery.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Introduction */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-10 rounded-3xl border border-blue-100 dark:border-slate-700">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6 text-center">
                  Our Curriculum
                </h2>
                <div className="space-y-4 text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p>
                    Our curriculum offers a structured yet flexible pathway from exploration to competition readiness.
                  </p>
                  <p>
                    <strong>RoboQuests</strong> introduces young learners in K–2 to robotics through creative, hands-on activities. <strong>LaunchPad</strong> for grades 3 and up builds foundational skills in building and programming, sparking interest and confidence. <strong>RoboChamps</strong> takes students further, strengthening technical and strategic abilities for competitive robotics.
                  </p>
                  <p>
                    Students learn by doing, building robots, programming, applying the engineering design process, and developing problem-solving and teamwork skills. RoboQuests and LaunchPad require no prior experience. RoboChamps is ideal for students with prior exposure through our camps, workshops, or introductory courses and prepares them for competition-level robotics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Blaze Robotics Course Map */}
        <section className="py-20 px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Blaze Robotics Course Map</h2>
              <p className="text-lg text-slate-600 max-w-4xl mx-auto leading-relaxed">
                This course map outlines the recommended learning paths across our VEX GO, VEX IQ Builder, VEX IQ Coder, VEX V5 Builder, and VEX V5 Coder tracks. Arrows show suggested progression based on skill level and instructional depth. While these sequences reflect the ideal order for building strong robotics foundations, all courses remain flexible and students may join at any point or skip ahead based on experience and readiness.
              </p>
            </div>

            {/* Course Map Visualization */}
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200">
              <div className="space-y-8">
                {/* VEX GO Track */}
                <div className="border-l-4 border-cyan-500 pl-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      GO
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">VEX GO Track</h3>
                  </div>
                  <p className="text-slate-600 mb-4">Perfect introduction for K-2 students. Builds foundational understanding through hands-on exploration.</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>→</span>
                    <span>Leads to VEX IQ Builder</span>
                  </div>
                </div>

                {/* VEX IQ Builder Track */}
                <div className="border-l-4 border-blue-500 pl-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      IQ B
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">VEX IQ Builder Track</h3>
                  </div>
                  <p className="text-slate-600 mb-4">Grades 3-5. Focuses on mechanical design and building skills. Develops spatial reasoning and engineering principles.</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>→</span>
                    <span>Leads to VEX IQ Coder</span>
                  </div>
                </div>

                {/* VEX IQ Coder Track */}
                <div className="border-l-4 border-indigo-500 pl-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      IQ C
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">VEX IQ Coder Track</h3>
                  </div>
                  <p className="text-slate-600 mb-4">Grades 3-5. Builds programming skills and computational thinking. Combines building with coding.</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>→</span>
                    <span>Leads to VEX V5 Builder</span>
                  </div>
                </div>

                {/* VEX V5 Builder Track */}
                <div className="border-l-4 border-purple-500 pl-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      V5 B
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">VEX V5 Builder Track</h3>
                  </div>
                  <p className="text-slate-600 mb-4">Grades 6-8. Advanced mechanical design and engineering. Prepares for competitive building challenges.</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>→</span>
                    <span>Leads to VEX V5 Coder</span>
                  </div>
                </div>

                {/* VEX V5 Coder Track */}
                <div className="border-l-4 border-pink-500 pl-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      V5 C
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">VEX V5 Coder Track</h3>
                  </div>
                  <p className="text-slate-600 mb-4">Grades 6-8. Advanced programming and algorithm development. Competition-ready coding skills.</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>→</span>
                    <span>Competition Teams</span>
                  </div>
                </div>
              </div>

              {/* Visual Flow Diagram */}
              <div className="mt-12 pt-12 border-t border-slate-200">
                <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Learning Path Flow</h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 flex-wrap">
                  <div className="bg-cyan-100 px-6 py-4 rounded-xl text-center min-w-[140px]">
                    <div className="font-bold text-cyan-700 mb-1">VEX GO</div>
                    <div className="text-xs text-cyan-600">K-2</div>
                  </div>
                  <div className="text-2xl text-slate-400">→</div>
                  <div className="bg-blue-100 px-6 py-4 rounded-xl text-center min-w-[140px]">
                    <div className="font-bold text-blue-700 mb-1">IQ Builder</div>
                    <div className="text-xs text-blue-600">3-5</div>
                  </div>
                  <div className="text-2xl text-slate-400">→</div>
                  <div className="bg-indigo-100 px-6 py-4 rounded-xl text-center min-w-[140px]">
                    <div className="font-bold text-indigo-700 mb-1">IQ Coder</div>
                    <div className="text-xs text-indigo-600">3-5</div>
                  </div>
                  <div className="text-2xl text-slate-400">→</div>
                  <div className="bg-purple-100 px-6 py-4 rounded-xl text-center min-w-[140px]">
                    <div className="font-bold text-purple-700 mb-1">V5 Builder</div>
                    <div className="text-xs text-purple-600">6-8</div>
                  </div>
                  <div className="text-2xl text-slate-400">→</div>
                  <div className="bg-pink-100 px-6 py-4 rounded-xl text-center min-w-[140px]">
                    <div className="font-bold text-pink-700 mb-1">V5 Coder</div>
                    <div className="text-xs text-pink-600">6-8</div>
                  </div>
                  <div className="text-2xl text-slate-400">→</div>
                  <div className="bg-slate-800 text-white px-6 py-4 rounded-xl text-center min-w-[140px]">
                    <div className="font-bold mb-1">Competition</div>
                    <div className="text-xs text-slate-300">Teams</div>
                  </div>
                </div>
                <p className="text-center text-sm text-slate-500 mt-6 italic">
                  Note: Students can join at any level based on experience and readiness
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Join Blaze */}
        <section className="bg-[#0f172a] dark:bg-slate-900 py-16 sm:py-20 lg:py-24 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-600/10 dark:bg-sky-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white dark:text-slate-100 mb-6">Why Join Blaze?</h2>
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

        {/* Our Choice - Why Structured Courses */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-blue-600 font-bold uppercase tracking-widest text-sm">Our Choice</span>
                <h2 className="text-4xl font-bold text-slate-900 mt-4 mb-6">Why Structured Courses?</h2>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Comprehensive Curriculum</h4>
                      <p className="text-slate-600 text-sm">Structured pathways from K-2 to 6-8 that build foundational skills systematically and prepare students for competitive robotics.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Master Fundamentals</h4>
                      <p className="text-slate-600 text-sm">Deep dive into mechanics, programming, and engineering principles through year-round learning and hands-on practice.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Progressive Learning</h4>
                      <p className="text-slate-600 text-sm">Build upon camp experiences and advance through structured pathways that prepare students for competitive teams.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-[40px] overflow-hidden shadow-2xl shadow-blue-900/10">
                <Image
                  src="https://picsum.photos/seed/courses/800/600"
                  alt="Structured robotics courses"
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
