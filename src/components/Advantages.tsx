'use client'
import { Sparkles, Hand, GraduationCap, Users, Trophy, Award } from "lucide-react"

interface Feature {
  icon: React.ReactNode
  title: string
  desc: string
}

interface Stat {
  value: string
  label: string
}

const features: Feature[] = [
  {
    icon: <Sparkles className="w-6 h-6 text-white" />,
    title: "Sparking STEM Curiosity",
    desc: "Blaze Robotics Academy stands out with a 6000 sq ft Robot House for all ages, from elementary to high school enthusiasts. Our camps ignite a passion for STEM, blending education with excitement."
  },
  {
    icon: <Hand className="w-6 h-6 text-white" />,
    title: "Hands-On Experience",
    desc: "We emphasize the importance of hands-on, interactive learning. Our camps are packed with practical activities, from building and programming robots to designing and creating 3D printed projects."
  },
  {
    icon: <GraduationCap className="w-6 h-6 text-white" />,
    title: "Expert Guidance",
    desc: "Our instructors are more than teachers; they're mentors from competition team coaches and robotics enthusiasts with extensive experience in building robots."
  },
  {
    icon: <Users className="w-6 h-6 text-white" />,
    title: "Building 21st Century Skills",
    desc: "In today's rapidly evolving world, skills such as collaboration, communication, critical thinking, and creativity (the 4Cs) are indispensable."
  },
  {
    icon: <Award className="w-6 h-6 text-white" />,
    title: "Showcase and Recognition",
    desc: "Every camper's hard work and creativity are celebrated. Our end-of-camp showcases allow students to present their projects, fostering a sense of accomplishment."
  },
  {
    icon: <Trophy className="w-6 h-6 text-white" />,
    title: "Pathway to Compete",
    desc: "Join Blaze camps as a gateway to our competitive teams, where passionate campers advance to compete in robotics challenges globally."
  }
]

const stats: Stat[] = [
  {
    value: "9",
    label: "YEARS OF EXPERIENCE"
  },
  {
    value: "78",
    label: "AWARDS WON"
  },
  {
    value: "19+",
    label: "ACTIVE TEAMS"
  },
  {
    value: "25",
    label: "WORLD QUALIFIERS"
  }
]

export const Advantages = () => {
  return (
    <section id="advantages" className="bg-[#0f172a] dark:bg-slate-900 py-16 sm:py-20 lg:py-24 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-600/10 dark:bg-sky-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="text-[#38bdf8] dark:text-blue-400 font-bold tracking-widest uppercase text-sm">The Blaze Difference</span>
          <h2 className="text-3xl md:text-5xl font-bold text-white dark:text-slate-100 mt-2 mb-6">Why Choose Blaze Robotics?</h2>
          <p className="text-slate-400 dark:text-slate-300 text-lg max-w-2xl mx-auto">
            We don't just teach robotics; we forge future engineers through a rigorous, hands-on curriculum and a culture of excellence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-slate-800/50 dark:bg-slate-800/70 p-8 rounded-3xl border border-slate-700 dark:border-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700/70 transition-colors backdrop-blur-sm">
              <div className="w-12 h-12 bg-[#2563eb] dark:bg-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white dark:text-slate-100 mb-3">{feature.title}</h3>
              <p className="text-slate-400 dark:text-slate-300 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-slate-800 dark:border-slate-700 pt-16">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-4xl md:text-6xl font-extrabold text-[#38bdf8] dark:text-blue-400 mb-2">{stat.value}</div>
              <div className="text-xs md:text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
