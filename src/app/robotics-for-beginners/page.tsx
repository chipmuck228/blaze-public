'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Rocket, Trophy, Sparkles, CheckCircle2, ArrowRight, Users, Target, Award, Lightbulb, Zap, GraduationCap } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function RoboticsForBeginnersPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <span className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-blue-500/20">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Beginner Robotics Program</span>
              </span>
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
                Robotics for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-[#2563eb]">Beginners</span>
              </h1>
              <p className="text-slate-300 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed mb-8">
                Build a strong foundation in robotics and coding through our structured, step-by-step program designed for students ages 8-12.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full shadow-lg shadow-blue-500/20"
                  asChild
                >
                  <Link href="/programs?category=beginner_robotics">
                    Explore Programs
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-2 border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href="#how-it-works">
                    Learn How It Works
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* What is Robotics for Beginners Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                What is Robotics for Beginners?
              </h2>
              <p className="text-slate-600 text-lg max-w-3xl mx-auto">
                Our Robotics for Beginners program introduces students to the exciting world of robotics through hands-on learning with VEX IQ kits. Students learn fundamental concepts while building and programming their own robots.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all hover:shadow-xl">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                    <BookOpen className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Structured Learning</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Our curriculum follows a carefully designed progression, ensuring students master each concept before moving to the next level.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all hover:shadow-xl">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Age-Appropriate</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Designed specifically for students ages 8-12, our program uses age-appropriate tools and teaching methods that keep young learners engaged.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all hover:shadow-xl">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                    <Lightbulb className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Hands-On Experience</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Every student works with their own robot kit, providing maximum hands-on time and personalized learning experiences.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                How It Works
              </h2>
              <p className="text-slate-600 text-lg max-w-3xl mx-auto">
                Our Robotics for Beginners program is structured to help students progress at their own pace while building essential skills.
              </p>
            </div>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-slate-200">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">Assessment & Placement</h3>
                    <p className="text-slate-600 text-lg leading-relaxed mb-4">
                      We start by assessing your child's current level and interests. Our experienced instructors evaluate their skills and recommend the appropriate starting point in our program.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600">Free trial class available</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600">Personalized learning path recommendation</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600">No prior experience required</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-slate-200">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">Structured Learning Path</h3>
                    <p className="text-slate-600 text-lg leading-relaxed mb-4">
                      Students progress through carefully designed levels, each building upon the previous one. Our curriculum covers:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Rocket className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">Building Fundamentals</h4>
                          <p className="text-slate-600 text-sm">Learn to construct robots using VEX IQ components</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Zap className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">Basic Programming</h4>
                          <p className="text-slate-600 text-sm">Introduction to coding concepts and robot control</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Target className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">Problem Solving</h4>
                          <p className="text-slate-600 text-sm">Develop critical thinking through challenges</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">Teamwork Skills</h4>
                          <p className="text-slate-600 text-sm">Collaborate with peers on projects</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-slate-200">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">Regular Practice & Progress</h3>
                    <p className="text-slate-600 text-lg leading-relaxed mb-4">
                      Students attend weekly sessions where they work on projects, complete challenges, and receive personalized feedback from instructors.
                    </p>
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <h4 className="font-bold text-slate-900 mb-3">Program Features:</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-slate-600">Weekly 2-hour sessions</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-slate-600">Small class sizes (6:1 student-to-teacher ratio)</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-slate-600">1:1 hardware ratio - every student has their own robot kit</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-slate-600">Progress tracking and regular assessments</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-slate-200">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black">
                      4
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">Advancement & Mastery</h3>
                    <p className="text-slate-600 text-lg leading-relaxed mb-4">
                      As students master each level, they advance to more challenging concepts. Our program prepares them for:
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <GraduationCap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-900 mb-1">Intermediate Programs</h4>
                        <p className="text-slate-600 text-sm">Advanced robotics concepts</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-900 mb-1">Competition Teams</h4>
                        <p className="text-slate-600 text-sm">Join competitive robotics</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-xl">
                        <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-900 mb-1">Innovation Projects</h4>
                        <p className="text-slate-600 text-sm">Explore creative applications</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                Why Choose Robotics for Beginners?
              </h2>
              <p className="text-slate-600 text-lg max-w-3xl mx-auto">
                Our program offers numerous benefits that help students develop essential skills for success in STEM fields and beyond.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all">
                <CardContent className="p-6">
                  <Award className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Builds Confidence</h3>
                  <p className="text-slate-600">
                    Students gain confidence as they successfully build and program robots, seeing their ideas come to life.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all">
                <CardContent className="p-6">
                  <Lightbulb className="w-12 h-12 text-yellow-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Develops Critical Thinking</h3>
                  <p className="text-slate-600">
                    Students learn to analyze problems, think logically, and develop creative solutions through hands-on challenges.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all">
                <CardContent className="p-6">
                  <Users className="w-12 h-12 text-green-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Enhances Collaboration</h3>
                  <p className="text-slate-600">
                    Working with peers on projects teaches valuable teamwork and communication skills.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all">
                <CardContent className="p-6">
                  <Zap className="w-12 h-12 text-purple-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Prepares for Future</h3>
                  <p className="text-slate-600">
                    Early exposure to robotics and coding prepares students for future academic and career opportunities in STEM.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all">
                <CardContent className="p-6">
                  <Target className="w-12 h-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Makes Learning Fun</h3>
                  <p className="text-slate-600">
                    Hands-on projects and interactive learning make complex concepts accessible and enjoyable for young students.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200 hover:border-blue-500 transition-all">
                <CardContent className="p-6">
                  <Rocket className="w-12 h-12 text-indigo-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Structured Progression</h3>
                  <p className="text-slate-600">
                    Our carefully designed curriculum ensures students master each concept before advancing to the next level.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Getting Started Section */}
        <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-blue-100 text-xl max-w-3xl mx-auto mb-8">
                Join hundreds of students who are discovering the exciting world of robotics through our beginner program.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-black">1</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Find a Location</h3>
                  <p className="text-blue-100">
                    Choose from our locations across the region. All locations offer the Robotics for Beginners program.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-black">2</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Schedule a Trial</h3>
                  <p className="text-blue-100">
                    Book a free trial class to see if our program is the right fit for your child. No commitment required.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-black">3</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Start Learning</h3>
                  <p className="text-blue-100">
                    Once enrolled, your child will begin their robotics journey with personalized instruction and support.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Button 
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 px-12 py-6 text-lg font-bold rounded-full shadow-xl"
                asChild
              >
                <Link href="/programs?category=beginner_robotics">
                  View Available Programs
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-slate-600 text-lg">
                Everything you need to know about our Robotics for Beginners program.
              </p>
            </div>

            <div className="space-y-6">
              <Card className="border-2 border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    What age is this program designed for?
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Our Robotics for Beginners program is specifically designed for students ages 8-12. This age range ensures that the curriculum, tools, and teaching methods are age-appropriate and engaging for young learners.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Does my child need any prior experience?
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    No prior experience is required! Our program is designed for complete beginners. We start with the fundamentals and guide students through each step of building and programming their first robot.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    What equipment will my child need?
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    All equipment is provided! Each student works with their own VEX IQ robot kit during class. We also provide laptops or iPads for programming. Students don't need to bring anything except their enthusiasm to learn.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    How long does the program take?
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Our standard program runs in 10-week sessions, with weekly 2-hour classes. However, students progress at their own pace, so the time to complete each level may vary. Some students may advance more quickly, while others may need more time to master certain concepts.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    What is the class size?
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    We maintain a low student-to-teacher ratio of 6:1 to ensure every student receives personalized attention and support. This allows instructors to work closely with each student and adapt instruction to their individual needs.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Can my child try a class before enrolling?
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Yes! We offer free trial classes so you and your child can experience our program before making a commitment. During the trial, students will work on a fun introductory project and our instructors will assess their level and interests.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    What happens after my child completes the beginner program?
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    After mastering the beginner level, students can advance to our intermediate robotics program, where they'll learn more advanced concepts and work with more complex robots. Some students may also choose to join our competitive robotics teams or explore our innovation lab programs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-[#0f172a] text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Start Your Child's Robotics Journey Today
            </h2>
            <p className="text-slate-300 text-xl mb-8 max-w-2xl mx-auto">
              Join our Robotics for Beginners program and watch your child develop essential STEM skills while having fun building and programming robots.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg"
                className="bg-[#2563eb] hover:bg-blue-600 text-white px-12 py-6 text-lg font-bold rounded-full shadow-lg shadow-blue-500/20"
                asChild
              >
                <Link href="/programs?category=beginner_robotics">
                  Find a Program Near You
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-2 border-white/20 text-white hover:bg-white/10 px-12 py-6 text-lg font-bold rounded-full"
                asChild
              >
                <Link href="/about">
                  Learn More About Us
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
