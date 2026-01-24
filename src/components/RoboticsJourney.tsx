'use client'

import { ArrowRight, Zap, Target, Users } from "lucide-react"
import Link from "next/link"

interface JourneyStep {
  id: number
  stepNumber: string
  title: string
  description: string
  ctaText: string
  ctaLink: string
  icon: React.ReactNode
  gradientFrom: string
  gradientTo: string
  badge?: string
}

const journeySteps: JourneyStep[] = [
  {
    id: 1,
    stepNumber: "Step 1",
    title: "Explore",
    description: "Discover the world of building and coding through our fun, high-energy camps.",
    ctaText: "Join Our Camps",
    ctaLink: "#camps",
    icon: <Zap className="w-8 h-8" />,
    gradientFrom: "#0f172a",
    gradientTo: "#0f172a",
    badge: "Start Here"
  },
  {
    id: 2,
    stepNumber: "Step 2",
    title: "Build",
    description: "Master the fundamentals of mechanics and programming in our structured courses.",
    ctaText: "Enroll in Our Courses",
    ctaLink: "#courses",
    icon: <Target className="w-8 h-8" />,
    gradientFrom: "#2563eb",
    gradientTo: "#2563eb"
  },
  {
    id: 3,
    stepNumber: "Step 3",
    title: "Compete",
    description: "Join a team, build a tournament-ready robot, and compete at local and global events.",
    ctaText: "Join Our Teams",
    ctaLink: "/programs",
    icon: <Users className="w-8 h-8" />,
    gradientFrom: "#e0f2fe",
    gradientTo: "#e0f2fe"
  }
]

export const RoboticsJourney = () => {
  return (
    <section
      id="journey"
      className="py-16 sm:py-20 lg:py-24 bg-white dark:bg-slate-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-[#0f172a] dark:text-white mb-4 tracking-tight">The Robotics Journey</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">Your pathway from curiosity to professional engineering starts here.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
          
          {journeySteps.map((step, index) => {
            // 根据步骤设置图标背景色
            let iconBgClass = ''
            let iconTextClass = ''
            if (index === 0) {
              iconBgClass = 'bg-[#0f172a] dark:bg-slate-800'
              iconTextClass = 'text-[#38bdf8]'
            } else if (index === 1) {
              iconBgClass = 'bg-[#2563eb]'
              iconTextClass = 'text-white'
            } else {
              iconBgClass = 'bg-[#e0f2fe] dark:bg-blue-900/30'
              iconTextClass = 'text-[#0f172a] dark:text-blue-300'
            }
            
            return (
              <div 
                key={step.id}
                className="bg-slate-50 dark:bg-slate-800 p-10 rounded-3xl relative z-10 border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all group"
              >
                <div className={`w-16 h-16 ${iconBgClass} rounded-2xl flex items-center justify-center ${iconTextClass} mb-6 group-hover:scale-110 transition-transform shadow-md`}>
                  {step.icon}
                </div>
                <h3 className="text-2xl font-bold text-[#0f172a] dark:text-white mb-3">{step.stepNumber}: {step.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{step.description}</p>
                <Link 
                  href={step.ctaLink} 
                  className="text-[#2563eb] dark:text-blue-400 font-bold flex items-center hover:translate-x-2 transition-transform"
                >
                  {step.ctaText} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>

    </section>
  )
}
