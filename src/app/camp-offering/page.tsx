'use client'

import { useState, useEffect, useMemo } from "react"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Calendar, MapPin, Loader2, ArrowRight, Home, Clock, UtensilsCrossed, Building2, Trophy, GraduationCap, Users, Wrench, MessageSquare, Award, Sparkles, Target, Zap, Rocket, Code, Printer } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CampOfferingPage() {
  const [apiCategories, setApiCategories] = useState<any[]>([])

  // 获取 camps category 的链接
  const campsCategoryLink = useMemo(() => {
    const campsCategory = apiCategories.find(cat => {
      const categoryName = (cat.name || '').toLowerCase()
      return categoryName.includes('camp')
    })
    if (campsCategory) {
      return `/programs?category=${encodeURIComponent(campsCategory.id)}`
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
                Blaze Robotics Camp Offerings
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">
                Summer Camps | Mid-Winter Breaks | Spring Intensives
              </p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                Empowering students through immersive STEM experiences across all locations. Spark curiosity, build skills, and ignite passion for robotics and engineering.
              </p>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-2xl border border-[#38bdf8]/20 mb-8 max-w-2xl">
                <h3 className="text-white font-bold text-lg mb-3">Step 1: Explore - Your Robotics Journey Begins</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Our camps are the foundational first step in The Robotics Journey, designed to ignite curiosity and passion for robotics, coding, and engineering. Through hands-on exploration and fun, high-energy activities, students discover the exciting world of building and programming.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href={campsCategoryLink}>
                    View All Camps
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
                <Clock className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Extended Care</h3>
                <p className="text-gray-400 text-xs">8:30 AM – 9:00 AM or 4:00 PM – 5:00 PM</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <UtensilsCrossed className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Camp Lunch</h3>
                <p className="text-gray-400 text-xs">Pizza & Drink option available daily</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Building2 className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">All Locations</h3>
                <p className="text-gray-400 text-xs">Certified Instructors & 1:1 Kits</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <Rocket className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">90% Return</h3>
                <p className="text-gray-400 text-xs">Campers come back</p>
              </div>
            </div>
          </div>
        </section>

        {/* Camp Highlights - Visual Cards */}
        <section id="main-content" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Why Choose Blaze Camps?</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Three key elements that make our camps exceptional learning experiences
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Sparking STEM Curiosity */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 border-2 border-blue-200 hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">Sparking STEM Curiosity</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">6000 sq ft Robot House</p>
                      <p className="text-sm text-slate-600">Dedicated facility for all ages</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">90% Return Rate</p>
                      <p className="text-sm text-slate-600">Campers come back for more</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Inspiring Community</p>
                      <p className="text-sm text-slate-600">Curious and dedicated learners</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hands-On Experience */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border-2 border-indigo-200 hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">Hands-On Experience</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Wrench className="w-6 h-6 text-indigo-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Build Robots</p>
                      <p className="text-sm text-slate-600">Practical construction activities</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Code className="w-6 h-6 text-indigo-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Program & Code</p>
                      <p className="text-sm text-slate-600">Interactive programming sessions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Printer className="w-6 h-6 text-indigo-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">3D Design & Print</p>
                      <p className="text-sm text-slate-600">Create and bring ideas to life</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expert Guidance */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl p-8 border-2 border-cyan-200 hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-cyan-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">Expert Guidance</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-6 h-6 text-cyan-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Competition Coaches</p>
                      <p className="text-sm text-slate-600">Mentors from winning teams</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Target className="w-6 h-6 text-cyan-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Personalized Support</p>
                      <p className="text-sm text-slate-600">Individual attention for each camper</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-cyan-600 mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Nurturing Environment</p>
                      <p className="text-sm text-slate-600">Reach highest potential</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Camp Introduction */}
        <section className="py-20 px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-10 rounded-3xl border border-blue-100 dark:border-slate-700">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6 text-center">
                  Our Camp Experience
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Rocket className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Sparking Curiosity</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Our 6000 sq ft Robot House creates an inspiring environment where 90% of campers return, building a community of passionate learners.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Zap className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Hands-On Learning</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Campers actively build robots, program solutions, and create 3D printed projects, developing deep understanding through practical experience.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Expert Mentors</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Competition team coaches provide personalized guidance in a nurturing setting, helping every camper reach their highest potential.
                    </p>
                  </div>
                </div>
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

        {/* Our Choice - Why Camps */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-blue-600 font-bold uppercase tracking-widest text-sm">Our Choice</span>
                <h2 className="text-4xl font-bold text-slate-900 mt-4 mb-6">Why Camps?</h2>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Fun & Engaging</h4>
                      <p className="text-slate-600 text-sm">High-energy activities that spark curiosity and make learning robotics exciting and enjoyable.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Perfect Introduction</h4>
                      <p className="text-slate-600 text-sm">Ideal first step for beginners to explore robotics, coding, and engineering in a supportive environment.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Hands-On Learning</h4>
                      <p className="text-slate-600 text-sm">Build, code, and create through immersive week-long experiences that prepare students for structured courses.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-[40px] overflow-hidden shadow-2xl shadow-blue-900/10">
                <Image
                  src="https://picsum.photos/seed/camps/800/600"
                  alt="Robotics camps"
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
