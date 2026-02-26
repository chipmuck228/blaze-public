'use client'

import { useState, useEffect, useMemo } from "react"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Trophy, ShieldCheck, Target, Users, GraduationCap, MessageSquare, Wrench, Award, ArrowRight, Mail, Phone, Calendar, Sparkles, Zap, Home } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CompetitionPage() {
  const [apiCategories, setApiCategories] = useState<any[]>([])

  // 获取 competition category 的链接
  const competitionCategoryLink = useMemo(() => {
    // 找到包含 competition 或 team 的 category
    const competitionCategory = apiCategories.find(cat => {
      const categoryName = (cat.name || '').toLowerCase()
      return categoryName.includes('competition') || categoryName.includes('team')
    })
    if (competitionCategory) {
      return `/programs?category=${encodeURIComponent(competitionCategory.id)}`
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
                Competition Teams
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">Local & National | Team Development | Year-Round Competitions</p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                Competitive teams representing Blaze Robotics in state championships and global competitions. Apply skills in real-game scenarios, collaborate with peers, and compete at the highest levels.
              </p>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-2xl border border-[#38bdf8]/20 mb-8 max-w-2xl">
                <h3 className="text-white font-bold text-lg mb-3">Step 3: Compete - Apply Your Skills</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Our competition teams are the final step in The Robotics Journey, where students apply all the skills and knowledge gained from camps (Step 1: Explore) and courses (Step 2: Build). Join tournament-ready teams, compete at local and global events, and experience the thrill of real-world engineering challenges. This is where curiosity becomes mastery and mastery becomes excellence!
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href={competitionCategoryLink}>
                    View All Competitions
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href="#team-interest">
                    Team Interest Form
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
                <Trophy className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">78 Awards</h3>
                <p className="text-gray-400 text-xs">Winning culture</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <ShieldCheck className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Baker League</h3>
                <p className="text-gray-400 text-xs">Premier Division</p>
              </div>
            </div>
          </div>
        </section>

        {/* Current Season Status */}
        <section className="py-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">2025-2026 Season Started</h2>
                <p className="text-slate-600 mt-1">Team positions are full. Join our interest list for future seasons.</p>
              </div>
              <div className="flex gap-3">
                <a href="tel:425-610-8618" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
                  <Phone className="w-5 h-5" />
                  <span className="hidden sm:inline">425-610-8618</span>
                </a>
                <a href="mailto:info@blazeroboticsacademy.org" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
                  <Mail className="w-5 h-5" />
                  <span className="hidden sm:inline">Email</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Competition Description Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            {/* Competition Description */}
            <div className="mb-16 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-10 rounded-3xl border border-blue-100 dark:border-slate-700">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
                  Step 3: Compete - Apply Your Skills
                </h2>
                <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                  Our competition teams are the final step in The Robotics Journey, where students apply all the skills and knowledge gained from camps (Step 1: Explore) and courses (Step 2: Build). Join tournament-ready teams and compete at local and global events.
                </p>
                <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                  This is where curiosity becomes mastery and mastery becomes excellence. Experience the thrill of real-world engineering challenges, collaborate with peers, and represent Blaze Robotics on the world stage!
                </p>
                <Button 
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href={competitionCategoryLink}>
                    View All Competitions
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-slate-900 mb-12 text-center">Current Season</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* VEX IQ */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 border-2 border-blue-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">VEX IQ</h3>
                    <p className="text-sm text-slate-600">Mix & Match Season</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-slate-900">Elementary Teams</p>
                      <p className="text-sm text-slate-600">Grades 3-5, born after May 1, 2013</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-slate-900">Middle School Teams</p>
                      <p className="text-sm text-slate-600">Grades 6-7, born after May 1, 2010</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-blue-200">
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">SOLD OUT</span>
                </div>
              </div>

              {/* VEX V5 */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border-2 border-indigo-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">VEX V5</h3>
                    <p className="text-sm text-slate-600">Push Back Season</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-slate-900">Middle School Teams</p>
                      <p className="text-sm text-slate-600">Grades 6-8, born after May 1, 2010</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-slate-900">High School Teams</p>
                      <p className="text-sm text-slate-600">Grades 9-12, born after May 1, 2006</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-indigo-200">
                  <Button 
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                    asChild
                  >
                    <Link href="#team-interest">
                      Join VEX V5 Teams
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Additional Services */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 mb-2">We also offer:</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>• Private/School team coaching</span>
                    <span>• Team registration services</span>
                    <span>• Team activities with classes</span>
                  </div>
                  <a href="mailto:info@blazeroboticsacademy.org" className="text-blue-600 hover:text-blue-700 text-sm font-semibold mt-2 inline-block">
                    Contact us for details →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Join - Simplified with Icons */}
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

        {/* Why VEX - Simplified */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-blue-600 font-bold uppercase tracking-widest text-sm">Our Choice</span>
                <h2 className="text-4xl font-bold text-slate-900 mt-4 mb-6">Why VEX?</h2>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Engineering Focus</h4>
                      <p className="text-slate-600 text-sm">Design iterations, problem-solving, and teamwork mirror real-world engineering.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Frequent Competitions</h4>
                      <p className="text-slate-600 text-sm">REC Foundation VIP partner with more local tournaments than any platform.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 mb-1">Inspiring Community</h4>
                      <p className="text-slate-600 text-sm">Extensive tournament network fosters peer inspiration and competitive drive.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-[40px] overflow-hidden shadow-2xl shadow-blue-900/10">
                <Image
                  src="https://picsum.photos/seed/competition-bot/800/600"
                  alt="VEX robotics competition"
                  width={800}
                  height={600}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Team Interest Form Section */}
        <section id="team-interest" className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">Join Our Teams</h2>
            <p className="text-xl text-blue-100 mb-8">
              Team positions are full for 2025-2026. Join our interest list for future seasons.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="mailto:info@blazeroboticsacademy.org"
                className="flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-full font-bold hover:bg-blue-50 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Email Us
              </a>
              <a 
                href="tel:425-610-8618"
                className="flex items-center gap-2 bg-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/30 transition-colors border border-white/30"
              >
                <Phone className="w-5 h-5" />
                425-610-8618
              </a>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
