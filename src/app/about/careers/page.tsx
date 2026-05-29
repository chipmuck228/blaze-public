import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AboutHero } from '@/components/about/AboutHero'
import { Briefcase, ChevronRight, Award, Star, MapPin } from 'lucide-react'

const jobs = [
  { title: 'After School Program STEM Teacher Assistant', type: 'Part-Time', location: 'All Campuses', desc: 'Support our STEM instructors in delivering engaging robotics and coding programs.', url: 'https://www.indeed.com/job/after-school-program-stem-teacher-assistant-e9f8e026bdbfab05?_gl=1*hiog7l*_gcl_au*OTY2NDQ1NTkzLjE3NTAzNzA1ODk.*_ga*ODMwMDM2MDI1LjE3NDIyNTY2ODk.*_ga_5KTMMETCF4*czE3NTU1NDYxMjUkbzM2JGcxJHQxNzU1NTUyNzQ3JGozNSRsMCRoMA..*_fplc*NWtLTGIzOG8zaEg1YnI1NTV4RGRhMyUyRkNjUFpPU0JZT0FMQ1FqUUpicFF5Rk1iT1pHRWg3cnZvOHlmZHRhJTJGJTJCcTZwNHpJMWVKbDBQeVdpeEswRkVzSFdSSlJ0JTJGT2hUQThKTmZBS0pkeldmd2hVY0pKOHZ0N2VYckNXaEhyS3clM0QlM0Q.' },
  { title: 'After School Program STEM Instructor - Bellevue', type: 'Part-Time / Full-Time', location: 'Bellevue', desc: 'Lead engaging robotics and STEM classes for elementary and middle school students.', url: 'https://www.indeed.com/job/after-school-program-stem-instructor-f87a7f377d70add6?_gl=1*hiog7l*_gcl_au*OTY2NDQ1NTkzLjE3NTAzNzA1ODk.*_ga*ODMwMDM2MDI1LjE3NDIyNTY2ODk.*_ga_5KTMMETCF4*czE3NTU1NDYxMjUkbzM2JGcxJHQxNzU1NTUyNzQ3JGozNSRsMCRoMA..*_fplc*NWtLTGIzOG8zaEg1YnI1NTV4RGRhMyUyRkNjUFpPU0JZT0FMQ1FqUUpicFF5Rk1iT1pHRWg3cnZvOHlmZHRhJTJGJTJCcTZwNHpJMWVKbDBQeVdpeEswRkVzSFdSSlJ0JTJGT2hUQThKTmZBS0pkeldmd2hVY0pKOHZ0N2VYckNXaEhyS3clM0QlM0Q.' },
  { title: 'After School Program STEM Instructor - Issaquah', type: 'Part-Time / Full-Time', location: 'Issaquah', desc: 'Lead engaging robotics and STEM classes for elementary and middle school students.', url: 'https://www.indeed.com/job/after-school-program-stem-instructor-d3bad4434bef878e?_gl=1*u93grx*_gcl_au*OTY2NDQ1NTkzLjE3NTAzNzA1ODk.*_ga*ODMwMDM2MDI1LjE3NDIyNTY2ODk.*_ga_5KTMMETCF4*czE3NTU1NDYxMjUkbzM2JGcxJHQxNzU1NTUyNzQ3JGozNSRsMCRoMA..*_fplc*NWtLTGIzOG8zaEg1YnI1NTV4RGRhMyUyRkNjUFpPU0JZT0FMQ1FqUUpicFF5Rk1iT1pHRWg3cnZvOHlmZHRhJTJGJTJCcTZwNHpJMWVKbDBQeVdpeEswRkVzSFdSSlJ0JTJGT2hUQThKTmZBS0pkeldmd2hVY0pKOHZ0N2VYckNXaEhyS3clM0QlM0Q.' },
  { title: 'VEX Robotics IQ Coaches', type: 'Seasonal', location: 'All Campuses', desc: 'Coach competitive VEX IQ teams and guide students to state and world championships.', url: 'https://www.indeed.com/viewjob?jk=115c2b6e2ebae98a' },
  { title: 'Operations Assistant', type: 'Part-Time / Full-Time', location: 'All Campuses', desc: 'Support daily operations and administrative tasks to ensure smooth program delivery.', url: 'https://www.indeed.com/job/operations-assistant-2c42052508c46299' },
]

export default function AboutCareersPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <div className="pb-24 bg-white">
          <AboutHero />

          <section className="py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="bg-[#0f172a] rounded-[50px] p-12 md:p-20 text-white relative overflow-hidden flex flex-col lg:flex-row items-center gap-16 shadow-2xl">
                <div className="lg:w-1/2">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20">
                    <Briefcase className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black mb-6">Join the Blaze Family</h2>
                  <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                    We are always looking for passionate STEM educators and competitive robotics veterans to help us inspire the next generation.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-slate-300">
                      <Award className="w-5 h-5 text-blue-500" />
                      <span>Competitive compensation & performance bonuses</span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-300">
                      <Star className="w-5 h-5 text-blue-500" />
                      <span>Ongoing training and VEX certification paths</span>
                    </div>
                  </div>
                </div>

                <div className="lg:w-1/2 w-full space-y-4">
                  <h4 className="text-xl font-bold mb-6">Open Roles</h4>
                  {jobs.map((job, idx) => (
                    <a
                      key={idx}
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-all group cursor-pointer"
                    >
                      <h5 className="text-lg font-bold group-hover:text-[#38bdf8] transition-colors mb-3">{job.title}</h5>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500 px-2 py-1 rounded-md self-start">{job.type}</span>
                        <div className="flex items-center text-slate-500 text-xs">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          {job.location}
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm line-clamp-1">{job.desc}</p>
                      <div className="mt-4 flex items-center text-[#38bdf8] text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        View Position <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </a>
                  ))}
                  <div className="pt-4 text-center">
                    <a
                      href="mailto:info@blazeroboticsacademy.com?subject=Resume Submission"
                      className="text-slate-500 hover:text-white transition-colors font-bold text-sm inline-block"
                    >
                      Don&apos;t see a fit? Send us your resume →
                    </a>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
