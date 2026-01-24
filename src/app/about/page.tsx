'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { AIChatButton } from "@/components/location/AIChatButton"
import { Users, Briefcase, HelpCircle, Info, BookOpen, Tent, Trophy, Plus, Minus, Star, ChevronRight, Award, MapPin, Loader2, Linkedin, ThumbsUp, Bookmark } from 'lucide-react'
import Image from 'next/image'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { YoutubeIcon, XiaohongshuIcon, FacebookIcon, InstagramIcon } from "@/components/Icons"

interface TeamMember {
  id: string
  user_id?: string | null
  image_url: string
  name: string
  position: string
  description: string
  bio?: string
  display_order: number
  is_featured?: boolean
  is_active?: boolean
  social_networks?: Array<{
    id: string
    name: string
    url: string
    display_order: number
  }>
}

export default function AboutPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<'general' | 'courses' | 'camps' | 'competition'>('general')
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [coaches, setCoaches] = useState<TeamMember[]>([])
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(true)
  const [thumbedUpCoaches, setThumbedUpCoaches] = useState<Set<string>>(new Set())
  const [markedCoaches, setMarkedCoaches] = useState<Set<string>>(new Set())

  // 为每个 coach 生成模拟的点赞数（基于 ID 的哈希值，确保每次刷新都一致）
  const coachThumbUpCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    coaches.forEach((coach) => {
      // 使用 coach.id 生成一个 10-99 之间的数字
      const hash = coach.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      counts[coach.id] = 10 + (hash % 90)
    })
    return counts
  }, [coaches])

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setIsLoadingCoaches(true)
        const response = await fetch('/api/teams')
        if (!response.ok) {
          throw new Error('Failed to fetch coaches')
        }
        const data = await response.json()
        // 只显示激活的、featured 的团队成员，并按 display_order 排序
        const activeCoaches = (data || [])
          .filter((coach: TeamMember) => coach.is_active !== false && coach.is_featured !== false)
          .sort((a: TeamMember, b: TeamMember) => a.display_order - b.display_order)
        setCoaches(activeCoaches)
      } catch (error) {
        console.error('Error fetching coaches:', error)
        setCoaches([])
      } finally {
        setIsLoadingCoaches(false)
      }
    }

    fetchCoaches()
  }, [])

  // 处理 hash 锚点滚动和 FAQ 默认打开状态
  useEffect(() => {
    // 检查 URL hash，如果有 hash（如 #careers），不默认打开 FAQ
    const hash = window.location.hash
    
    if (hash) {
      // 如果有 hash，不默认打开 FAQ，避免页面高度变化影响滚动
      setOpenIndex(null)
      
      // 立即阻止页面滚动到顶部（Next.js 路由导航可能会自动滚动）
      window.scrollTo(0, 0)
    }

    const scrollToHash = (hashValue: string, retries = 0): boolean => {
      const element = document.querySelector(hashValue)
      if (element) {
        // 计算固定导航栏的高度（通常是 80px，根据 Navbar 的实际高度调整）
        const navbarHeight = 80
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - navbarHeight

        // 使用 window.scrollTo 而不是 scrollIntoView，以便精确控制偏移量
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
        return true
      } else if (retries < 50) {
        // 如果元素还没加载，重试（最多50次，每次延迟200ms）
        setTimeout(() => scrollToHash(hashValue, retries + 1), 200)
        return false
      }
      console.warn(`Failed to find element with hash: ${hashValue} after ${retries} retries`)
      return false
    }

    const handleHashScroll = () => {
      const currentHash = window.location.hash
      if (currentHash) {
        // 等待 DOM 更新和内容加载
        // 使用多层延迟确保内容完全渲染
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToHash(currentHash)
          }, 100)
        })
      }
    }

    // 初始加载时检查 hash
    if (hash) {
      // 等待 Team 数据加载完成后再滚动
      const performScroll = () => {
        // 如果 Team 数据还在加载，等待加载完成
        if (isLoadingCoaches) {
          // 等待最多 5 秒，每 100ms 检查一次
          let checkCount = 0
          const checkInterval = setInterval(() => {
            checkCount++
            if (!isLoadingCoaches || checkCount >= 50) {
              clearInterval(checkInterval)
              // Team 数据加载完成后，再等待一段时间确保 DOM 完全渲染
              // 使用 requestAnimationFrame 确保在下一帧执行
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    handleHashScroll()
                  }, 500)
                })
              })
            }
          }, 100)
        } else {
          // Team 数据已加载，等待页面完全加载后再滚动
          const handleLoad = () => {
            // 页面加载完成后，再等待一段时间确保所有内容都已渲染
            // 使用多层 requestAnimationFrame 确保 DOM 完全更新
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setTimeout(() => {
                  handleHashScroll()
                }, 500)
              })
            })
          }

          // 如果页面已经加载完成，立即执行
          if (document.readyState === 'complete') {
            handleLoad()
          } else {
            // 否则等待页面加载完成
            window.addEventListener('load', handleLoad, { once: true })
          }
        }
      }

      // 延迟执行，确保组件已完全挂载
      setTimeout(performScroll, 100)
      
      return () => {
        // 清理函数会在组件卸载时执行
      }
    }

    // 监听 hash 变化（用于同一页面内的导航）
    window.addEventListener('hashchange', handleHashScroll)
    return () => window.removeEventListener('hashchange', handleHashScroll)
  }, [pathname, isLoadingCoaches]) // 添加 isLoadingCoaches 作为依赖，确保 Team 数据加载完成后再滚动

  // 社交账号图标映射函数
  const getSocialIcon = (name: string) => {
    switch (name) {
      case "Linkedin":
        return <Linkedin className="w-5 h-5" />
      case "Facebook":
        return <FacebookIcon className="w-5 h-5" />
      case "Instagram":
        return <InstagramIcon className="w-5 h-5" />
      case "Youtube":
        return <YoutubeIcon className="w-5 h-5" />
      case "Xiaohongshu":
        return <XiaohongshuIcon className="w-5 h-5" />
      default:
        return null
    }
  }

  // 处理 thumbup 点击
  const handleThumbUp = (coachId: string) => {
    setThumbedUpCoaches((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(coachId)) {
        newSet.delete(coachId)
      } else {
        newSet.add(coachId)
      }
      return newSet
    })
  }

  // 处理 mark 点击
  const handleMark = (coachId: string) => {
    setMarkedCoaches((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(coachId)) {
        newSet.delete(coachId)
      } else {
        newSet.add(coachId)
      }
      return newSet
    })
  }

  const jobs = [
    { 
      title: 'After School Program STEM Teacher Assistant', 
      type: 'Part-Time', 
      location: 'All Locations', 
      desc: 'Support our STEM instructors in delivering engaging robotics and coding programs.',
      url: 'https://www.indeed.com/job/after-school-program-stem-teacher-assistant-e9f8e026bdbfab05?_gl=1*hiog7l*_gcl_au*OTY2NDQ1NTkzLjE3NTAzNzA1ODk.*_ga*ODMwMDM2MDI1LjE3NDIyNTY2ODk.*_ga_5KTMMETCF4*czE3NTU1NDYxMjUkbzM2JGcxJHQxNzU1NTUyNzQ3JGozNSRsMCRoMA..*_fplc*NWtLTGIzOG8zaEg1YnI1NTV4RGRhMyUyRkNjUFpPU0JZT0FMQ1FqUUpicFF5Rk1iT1pHRWg3cnZvOHlmZHRhJTJGJTJCcTZwNHpJMWVKbDBQeVdpeEswRkVzSFdSSlJ0JTJGT2hUQThKTmZBS0pkeldmd2hVY0pKOHZ0N2VYckNXaEhyS3clM0QlM0Q.'
    },
    { 
      title: 'After School Program STEM Instructor - Bellevue', 
      type: 'Part-Time / Full-Time', 
      location: 'Bellevue', 
      desc: 'Lead engaging robotics and STEM classes for elementary and middle school students.',
      url: 'https://www.indeed.com/job/after-school-program-stem-instructor-f87a7f377d70add6?_gl=1*hiog7l*_gcl_au*OTY2NDQ1NTkzLjE3NTAzNzA1ODk.*_ga*ODMwMDM2MDI1LjE3NDIyNTY2ODk.*_ga_5KTMMETCF4*czE3NTU1NDYxMjUkbzM2JGcxJHQxNzU1NTUyNzQ3JGozNSRsMCRoMA..*_fplc*NWtLTGIzOG8zaEg1YnI1NTV4RGRhMyUyRkNjUFpPU0JZT0FMQ1FqUUpicFF5Rk1iT1pHRWg3cnZvOHlmZHRhJTJGJTJCcTZwNHpJMWVKbDBQeVdpeEswRkVzSFdSSlJ0JTJGT2hUQThKTmZBS0pkeldmd2hVY0pKOHZ0N2VYckNXaEhyS3clM0QlM0Q.'
    },
    { 
      title: 'After School Program STEM Instructor - Issaquah', 
      type: 'Part-Time / Full-Time', 
      location: 'Issaquah', 
      desc: 'Lead engaging robotics and STEM classes for elementary and middle school students.',
      url: 'https://www.indeed.com/job/after-school-program-stem-instructor-d3bad4434bef878e?_gl=1*u93grx*_gcl_au*OTY2NDQ1NTkzLjE3NTAzNzA1ODk.*_ga*ODMwMDM2MDI1LjE3NDIyNTY2ODk.*_ga_5KTMMETCF4*czE3NTU1NDYxMjUkbzM2JGcxJHQxNzU1NTUyNzQ3JGozNSRsMCRoMA..*_fplc*NWtLTGIzOG8zaEg1YnI1NTV4RGRhMyUyRkNjUFpPU0JZT0FMQ1FqUUpicFF5Rk1iT1pHRWg3cnZvOHlmZHRhJTJGJTJCcTZwNHpJMWVKbDBQeVdpeEswRkVzSFdSSlJ0JTJGT2hUQThKTmZBS0pkeldmd2hVY0pKOHZ0N2VYckNXaEhyS3clM0QlM0Q.'
    },
    { 
      title: 'VEX Robotics IQ Coaches', 
      type: 'Seasonal', 
      location: 'All Locations', 
      desc: 'Coach competitive VEX IQ teams and guide students to state and world championships.',
      url: 'https://www.indeed.com/viewjob?jk=115c2b6e2ebae98a'
    },
    { 
      title: 'Operations Assistant', 
      type: 'Part-Time / Full-Time', 
      location: 'All Locations', 
      desc: 'Support daily operations and administrative tasks to ensure smooth program delivery.',
      url: 'https://www.indeed.com/job/operations-assistant-2c42052508c46299'
    },
  ]

  const faqData = {
    general: {
      label: 'General',
      icon: <Info className="w-4 h-4" />,
      items: [
        {
          question: "What is the student-to-teacher ratio?",
          answer: "We maintain a low ratio of 6:1 to ensure every student gets personal attention and hands-on guidance during building and coding phases."
        },
        {
          question: "Can my child join if they have no experience?",
          answer: "Absolutely! Our 'RoboQuests' and 'LaunchPad' programs are designed specifically for beginners. We also offer a free 1-hour trial class to assess their level and interest."
        },
        {
          question: "Where are your campuses located?",
          answer: "We have campuses in Bellevue (Main and Bel-Red) and Issaquah, as well as programs at partner schools like St. Louise."
        }
      ]
    },
    courses: {
      label: 'Courses',
      icon: <BookOpen className="w-4 h-4" />,
      items: [
        {
          question: "What types of courses does Blaze Robotics Academy offer?",
          answer: "We offer a range of courses designed to enhance skills in robotics and STEM, including introductory sessions for beginners, advanced programming, robotics engineering, and competition preparation courses."
        },
        {
          question: "Are there prerequisites for any of the courses?",
          answer: "Some advanced courses may have prerequisites, such as basic knowledge of programming or prior completion of specific introductory courses. Check the course description for details."
        },
        {
          question: "How long do courses typically last?",
          answer: "Our standard courses run in a 10-week format, focusing on a broad range of robotics and STEM topics. For those interested in competition-specific training, we offer both a 10-week format during the school year and a 2-week intensive format in the summer, detailed in a separate FAQ."
        },
        {
          question: "How are your competition courses structured throughout the year?",
          answer: "During the school year, our competition courses are offered in a 10-week format, with sessions lasting 3 hours per week, totaling 30 hours. This format is designed to integrate seamlessly with students' regular schedules, providing ongoing, in-depth preparation for competitions. In the summer, we condense the same comprehensive 30-hour curriculum into a 2-week intensive course, running full days from 9 AM to 3 PM. Despite the difference in delivery time frames, both courses cover identical content, ensuring all students receive the same level of preparation for joining the competition team."
        },
        {
          question: "What is the class size for each course?",
          answer: "We maintain small class sizes to ensure personalized attention and an optimal learning environment, typically capping classes at 10-15 students."
        },
        {
          question: "Can I enroll in multiple courses at once?",
          answer: "Yes, students are welcome to enroll in multiple courses as long as the schedule permits. We recommend considering workload and course intensity when planning."
        },
        {
          question: "What materials will I need for the courses?",
          answer: "Most materials and equipment are provided. However, for certain courses, students may be advised to bring their laptop or subscribe to specific software. Check the course requirements for details."
        },
        {
          question: "Who teaches the courses?",
          answer: "Our courses are taught by experienced instructors and competition team coaches with extensive backgrounds in robotics, engineering, and STEM education."
        },
        {
          question: "What happens if I miss a class?",
          answer: "We understand that conflicts can arise. While we encourage full attendance to get the most out of each course, missed classes can often be made up through session recordings or additional materials, depending on the instructor's policy."
        },
        {
          question: "Do students need to bring their own laptop?",
          answer: "For our introductory courses and camps, we provide all necessary equipment including laptops and iPads. For competitive teams, having a personal laptop is recommended for working on code at home, but not required in class."
        },
        {
          question: "Are the robot kits shared?",
          answer: "No. We provide a 1:1 hardware ratio. Every student works with their own dedicated robot kit during the duration of the class to ensure maximum hands-on time."
        },
        {
          question: "What is the refund policy for courses?",
          answer: (
            <div className="space-y-2">
              <p>At Blaze Robotics Academy, we understand that plans can change. Here's our refund policy for courses:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>100% of refund</strong> minus a 3% fee (+ any applicable taxes) until 15 day(s) before the beginning of the activity</li>
                <li><strong>Prorated credit</strong> after the start of the activity, based on the number of classes remaining at the time of cancellation</li>
              </ul>
              <p>To request a refund, please contact our administration team with your registration details and the reason for cancellation. We aim to process all refunds within 14 business days.</p>
            </div>
          )
        }
      ]
    },
    camps: {
      label: 'Camps',
      icon: <Tent className="w-4 h-4" />,
      items: [
        {
          question: "What age groups do you cater to?",
          answer: "Our camps are designed for students in elementary, middle, and high school, with age-appropriate activities for each group."
        },
        {
          question: "Do I need any prior experience in robotics to join a camp?",
          answer: "No prior experience is necessary! Our camps are structured to welcome beginners and challenge those with previous experience."
        },
        {
          question: "How are campers grouped in each camp?",
          answer: "Campers are grouped by age and skill level to ensure everyone is learning and engaging at a pace that suits them best."
        },
        {
          question: "What is the daily schedule for the camps?",
          answer: (
            <div className="space-y-2">
              <p>Our camps run from 9:00 AM to 3:00 PM, Monday through Friday. Here's what a typical day looks like:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>9:00 AM - 10:30 AM:</strong> Morning session focused on interactive instruction and hands-on activities.</li>
                <li><strong>10:30 AM - 10:45 AM:</strong> Short break.</li>
                <li><strong>10:45 AM - 12:00 PM:</strong> Continuation of robotics projects and engaging learning activities.</li>
                <li><strong>12:00 PM - 12:30 PM:</strong> Lunch break. Campers can enjoy their packed lunches or opt for our provided lunch selections.</li>
                <li><strong>12:30 PM - 1:00 PM:</strong> Team-building activities designed to foster collaboration and strengthen teamwork among campers.</li>
                <li><strong>1:00 PM - 2:40 PM:</strong> Afternoon session emphasizing project development and teamwork.</li>
                <li><strong>2:40 PM - 3:00 PM:</strong> End-of-day wrap-up, including project reviews and setting goals for the next day.</li>
              </ul>
              <p>This structured yet flexible schedule ensures each camper gets the most out of their day, blending learning, fun, and essential social skills development.</p>
            </div>
          )
        },
        {
          question: "Who teaches the camps?",
          answer: "Our camps are taught by experienced instructors and competition team coaches who are passionate about STEM education and robotics."
        },
        {
          question: "What is the camper to instructor ratio?",
          answer: "We maintain a low camper to instructor ratio to ensure personalized attention and a supportive learning environment."
        },
        {
          question: "Can I sign up for more than one camp?",
          answer: "Absolutely! We encourage campers to explore different areas of interest by signing up for multiple camps throughout the summer."
        },
        {
          question: "How can I progress after attending a camp?",
          answer: "Campers interested in furthering their robotics journey can enroll in our courses and even join our competitive teams to apply their skills in real-world scenarios."
        },
        {
          question: "What should I bring to camp?",
          answer: "Campers should bring their lunch (unless opting for our provided options), a water bottle, and any snacks they might want throughout the day. All robotics equipment will be provided."
        },
        {
          question: "Are there any lunch options available at camp?",
          answer: "Yes, we offer a variety of lunch options from popular local vendors, including pizza, sandwiches, and more. We also provide facilities for those who prefer to bring their own lunch."
        },
        {
          question: "Is there a lot of screen time involved?",
          answer: "While our camp does involve some screen time for programming and design activities, we are mindful of balancing digital engagement with plenty of hands-on learning and physical team-building activities. Screen time is structured and purposeful, aimed at enhancing learning while ensuring that campers also enjoy ample time away from screens. Our daily schedule incorporates a variety of activities that encourage movement, collaboration, and creativity, minimizing the potential for screen fatigue."
        },
        {
          question: "What is the daily schedule for full-day camps?",
          answer: "Camps typically run from 9:00 AM to 4:00 PM. The morning focuses on hardware engineering, while the afternoon is dedicated to programming, 3D design, and team challenges."
        },
        {
          question: "Is lunch provided during camp?",
          answer: "We offer an optional Pizza & Drink package for $12/day. Otherwise, parents are asked to pack a nut-free lunch and two snacks for their campers."
        },
        {
          question: "Do you offer extended care?",
          answer: "Yes, we offer early drop-off (8:30 AM) and late pick-up (until 5:00 PM) for an additional fee of $15/day."
        },
        {
          question: "What is the refund policy?",
          answer: (
            <div className="space-y-2">
              <p>At Blaze Robotics Academy, we understand that plans can change. Here's our refund policy for camps:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>100% of refund</strong> minus a 3% processing fee (+ any applicable taxes) until 30 day(s) before the beginning of the activity</li>
                <li><strong>100% of credit</strong> until it starts</li>
              </ul>
              <p>To request a refund, please contact our administration team with your registration details and the reason for cancellation. We aim to process all refunds within 14 business days.</p>
            </div>
          )
        }
      ]
    },
    competition: {
      label: 'Competition',
      icon: <Trophy className="w-4 h-4" />,
      items: [
        {
          question: "How do I join the Blaze Robotics competition team?",
          answer: "Joining our team starts with participating in our courses or camps to build foundational skills. We also recommend attending an informational session or reaching out directly to our team coordinator for specific joining criteria and the application process."
        },
        {
          question: "Are there prerequisites for joining the team?",
          answer: "Yes, we typically look for students who have completed certain courses or camps that provide the necessary robotics and teamwork skills. A passion for robotics and a commitment to the team's schedule and goals are also important."
        },
        {
          question: "What age groups can join the Blaze Robotics competition teams?",
          answer: "Blaze Robotics Academy welcomes students from 3rd grade through high school to join our competition teams. Our program is designed to cater to various age groups, ensuring a productive and enriching experience for all members, from elementary students to high schoolers."
        },
        {
          question: "How often do teams meet and practice?",
          answer: "Our VEX IQ teams typically meet once a week, focusing on a consistent and intensive learning experience. As the competition season progresses, we may offer additional practice sessions to further refine our robots and strategies. Please refer to each team level's description on our website for the most accurate schedule. Regardless of the season, our workshop provides extended access for those team members keen on extra practice time, supporting their dedication and drive to excel."
        },
        {
          question: "What competitions do Blaze teams participate in?",
          answer: "Blaze Robotics teams actively compete in local, out-of-state, and world VEX Robotics Competition (VRC) and VEX IQ Robotics Competition (VIQRC) events. Our commitment to challenging our teams and showcasing their talents takes us beyond local competitions; some of our teams travel out-of-state to participate in prestigious Signature Events. These varied competitive experiences, recognized by major robotics and STEM organizations, provide our students with a comprehensive platform to test their skills, innovate, and excel on a global stage."
        },
        {
          question: "Is there a fee to join the competition team?",
          answer: "Yes, we charge an all-inclusive team membership fee that simplifies participation costs. This single fee covers everything the team needs for the season, including team registration, tournament fees, parts, tools, field access, and facility use. Our goal is to make participation as straightforward and accessible as possible, keeping costs manageable while providing everything needed for a successful competition season."
        },
        {
          question: "What makes Blaze Robotics teams unique?",
          answer: "With over 20 years of combined experience, access to a dynamic workshop, and mentorship by world-winning coaches, our teams are well-equipped for success. Our students not only excel in competitions but also represent Blaze Robotics Academy's values of innovation and excellence in their academic and personal achievements."
        },
        {
          question: "When does the competition season start and end?",
          answer: (
            <div className="space-y-2">
              <p>Our competition season is segmented into three phases to maximize learning and competition opportunities:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Early Season (June to August):</strong> This period is ideal for passionate returning students who wish to get a head start on the next season's game, which is released every May after the World Championship.
                </li>
                <li>
                  <strong>Regular Season (September to February):</strong> The majority of our students enroll during the summer, with teams officially forming before the school year starts. The regular season is focused on preparing for and participating in local and out-of-state competitions.
                </li>
                <li>
                  <strong>Post Season (March to May):</strong> Teams that advance to state or world championships extend their season into the post period, culminating their year either in March or at the World Championship in May.
                </li>
              </ul>
              <p>This structured approach ensures that all students, whether new or returning, have a clear pathway from preparation to competition, with opportunities to extend their involvement based on performance and commitment.</p>
            </div>
          )
        },
        {
          question: "What is the refund policy for team fee?",
          answer: (
            <div className="space-y-2">
              <p>We understand that plans can change, and we've structured our refund policy for teams to be as fair as possible:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Full Refund:</strong> Requests made within two weeks of joining the team are eligible for a full refund, provided the regular season has not yet started.
                </li>
                <li>
                  <strong>Partial Refund:</strong> Cancellations made after the initial two-week period but before the start of the regular season may qualify for a 50% refund, considering early administrative and preparatory expenses.
                </li>
                <li>
                  <strong>No Refund:</strong> Once the regular season begins, refunds are not available as the team fee will have been allocated towards registration for competitions, travel, parts, tools, and other essential team-related expenses.
                </li>
              </ul>
              <p>Our policy aims to balance the academy's commitment to providing high-quality competitive experiences with the financial realities of organizing and equipping successful teams. For any refund requests or questions, please contact our administration team directly.</p>
            </div>
          )
        },
        {
          question: "How do teams get formed?",
          answer: "Teams are formed based on age, experience level, and friend requests. We typically have 3-4 students per VEX IQ team and 4-6 students per V5 team."
        },
        {
          question: "What is the time commitment for competitive teams?",
          answer: "Teams meet once a week for 2 hours during the regular season, plus approximately 4-6 tournament Saturdays between November and February."
        },
        {
          question: "What is the difference between Baker and Rainier leagues?",
          answer: "The Rainier League is our developmental division for newer teams, while the Baker League is our premier division for advanced students seeking state and world qualifications."
        }
      ]
    }
  }

  const currentFaqs = faqData[activeTab].items

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <div className="pb-24 bg-white">
          {/* Hero Section */}
          <section className="bg-[#0f172a] py-24 text-white relative overflow-hidden text-center">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            </div>
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <span className="text-blue-400 font-bold uppercase tracking-widest text-xs">Our Mission</span>
              <h1 className="text-5xl md:text-7xl font-black mt-2 mb-6">Forging Future <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-[#2563eb]">Innovators.</span></h1>
              <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed">
                Blaze Robotics Academy is more than a school; it's a launchpad for the next generation of engineers, thinkers, and leaders.
              </p>
            </div>
          </section>

          {/* Coaches Section */}
          <section className="py-24 max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
              <div className="max-w-xl">
                <h2 className="text-4xl font-bold text-slate-900 mb-4 flex items-center">
                  <Users className="w-8 h-8 mr-3 text-blue-600" />
                  Meet the Coaches
                </h2>
                <p className="text-slate-500 text-lg">Our instructors are competitive robotics veterans and passionate STEM educators committed to your child's success.</p>
              </div>
              <button className="bg-slate-50 text-slate-900 px-6 py-3 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
                Our Teaching Philosophy
              </button>
            </div>

            {isLoadingCoaches ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : coaches.length === 0 ? (
              <div className="text-center py-24 text-slate-500">
                <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg">No coaches available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {coaches.map((coach) => {
                  const description = coach.description || ''
                  const bio = coach.bio || description
                  const isLongText = bio.length > 120
                  const displayText = isLongText ? bio.substring(0, 120).trim() + '...' : bio
                  const initials = coach.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)

                  return (
                    <div key={coach.id} className="group bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                      <div className="h-72 overflow-hidden relative bg-gradient-to-br from-blue-50 to-blue-100">
                        {coach.image_url && coach.image_url.trim() ? (
                          <Image 
                            src={coach.image_url} 
                            alt={coach.name} 
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700" 
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            onError={(e) => {
                              // 如果图片加载失败，隐藏图片元素，显示占位符
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : null}
                        {(!coach.image_url || !coach.image_url.trim()) && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                              {initials}
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      <div className="p-8">
                        <h3 className="text-2xl font-bold text-slate-900 mb-1">{coach.name}</h3>
                        <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">{coach.position}</p>
                        {isLongText ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-1 -m-1">
                                <p className="text-slate-500 text-sm leading-relaxed cursor-pointer hover:text-slate-700 transition-colors">
                                  {displayText}
                                </p>
                                <span className="text-blue-600 text-xs font-semibold mt-2 inline-block hover:underline">
                                  Read more →
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 max-w-[90vw] p-6" align="start" side="top">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                                  <Avatar className="h-12 w-12 shrink-0">
                                    {coach.image_url && coach.image_url.trim() ? (
                                      <>
                                        <AvatarImage src={coach.image_url} alt={coach.name} />
                                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                                          {initials}
                                        </AvatarFallback>
                                      </>
                                    ) : (
                                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold">
                                        {initials}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 truncate">{coach.name}</h4>
                                    <p className="text-xs text-blue-600 font-semibold uppercase truncate">{coach.position}</p>
                                  </div>
                                </div>
                                <div className="text-slate-600 text-sm leading-relaxed max-h-64 overflow-y-auto">
                                  {bio.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                                    <p key={idx} className="mb-3 last:mb-0">
                                      {paragraph.trim()}
                                    </p>
                                  ))}
                                </div>
                                {/* Social Networks and Actions in Popover */}
                                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                                  {/* Social Networks - Left */}
                                  {coach.social_networks && coach.social_networks.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                      {coach.social_networks
                                        .sort((a, b) => a.display_order - b.display_order)
                                        .map((social) => (
                                          <a
                                            key={social.id}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 hover:text-blue-600 transition-colors"
                                            aria-label={social.name}
                                          >
                                            {getSocialIcon(social.name)}
                                          </a>
                                        ))}
                                    </div>
                                  ) : (
                                    <div></div>
                                  )}
                                  {/* Thumbup and Mark Actions - Right */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleThumbUp(coach.id)}
                                      className={`relative p-2 rounded-lg transition-all ${
                                        thumbedUpCoaches.has(coach.id)
                                          ? 'bg-blue-50 text-blue-600'
                                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                      }`}
                                      aria-label="Thumbs up"
                                    >
                                      <ThumbsUp className={`w-5 h-5 ${thumbedUpCoaches.has(coach.id) ? 'fill-blue-600' : ''}`} />
                                      {coachThumbUpCounts[coach.id] && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                                          {coachThumbUpCounts[coach.id] > 99 ? '99+' : coachThumbUpCounts[coach.id]}
                                        </span>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleMark(coach.id)}
                                      className={`p-2 rounded-lg transition-all ${
                                        markedCoaches.has(coach.id)
                                          ? 'bg-blue-50 text-blue-600'
                                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                      }`}
                                      aria-label="Bookmark"
                                    >
                                      <Bookmark className={`w-5 h-5 ${markedCoaches.has(coach.id) ? 'fill-blue-600' : ''}`} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <p className="text-slate-500 text-sm leading-relaxed">
                            {bio}
                          </p>
                        )}
                        {/* Social Networks and Actions */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            {/* Social Networks - Left */}
                            {coach.social_networks && coach.social_networks.length > 0 ? (
                              <div className="flex items-center gap-3">
                                {coach.social_networks
                                  .sort((a, b) => a.display_order - b.display_order)
                                  .map((social) => (
                                    <a
                                      key={social.id}
                                      href={social.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 hover:text-blue-600 transition-colors"
                                      aria-label={social.name}
                                    >
                                      {getSocialIcon(social.name)}
                                    </a>
                                  ))}
                              </div>
                            ) : (
                              <div></div>
                            )}
                            {/* Thumbup and Mark Actions - Right */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleThumbUp(coach.id)}
                                className={`relative p-2 rounded-lg transition-all ${
                                  thumbedUpCoaches.has(coach.id)
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                }`}
                                aria-label="Thumbs up"
                              >
                                <ThumbsUp className={`w-5 h-5 ${thumbedUpCoaches.has(coach.id) ? 'fill-blue-600' : ''}`} />
                                {coachThumbUpCounts[coach.id] && (
                                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                                    {coachThumbUpCounts[coach.id] > 99 ? '99+' : coachThumbUpCounts[coach.id]}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => handleMark(coach.id)}
                                className={`p-2 rounded-lg transition-all ${
                                  markedCoaches.has(coach.id)
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                }`}
                                aria-label="Bookmark"
                              >
                                <Bookmark className={`w-5 h-5 ${markedCoaches.has(coach.id) ? 'fill-blue-600' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Careers Section */}
          <section id="careers" className="py-24 bg-slate-50">
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
                      Don't see a fit? Send us your resume &rarr;
                    </a>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-24 px-4 bg-white" id="faq">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
                <p className="text-slate-500 text-lg">Find answers to common questions about our programs, camps, and competitions.</p>
              </div>

              {/* Tab Navigation */}
              <div className="bg-slate-100 rounded-3xl p-2 flex mb-12 overflow-x-auto scrollbar-hide">
                {Object.entries(faqData).map(([key, data]) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key as any); setOpenIndex(0); }}
                    className={`flex items-center space-x-2 px-6 py-4 rounded-2xl text-sm font-bold transition-all whitespace-nowrap grow justify-center ${
                      activeTab === key
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {data.icon}
                    <span>{data.label}</span>
                  </button>
                ))}
              </div>

              {/* Accordion List */}
              <div className="space-y-4">
                {currentFaqs.map((faq, index) => (
                  <div 
                    key={`${activeTab}-${index}`} 
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <button
                      onClick={() => setOpenIndex(openIndex === index ? null : index)}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg transition-colors ${openIndex === index ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                          <HelpCircle className="w-5 h-5" />
                        </div>
                        <span className={`text-lg font-bold transition-colors ${openIndex === index ? 'text-blue-600' : 'text-slate-800'}`}>
                          {faq.question}
                        </span>
                      </div>
                      {openIndex === index ? (
                        <Minus className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Plus className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="p-6 pt-0 text-slate-600 leading-relaxed border-t border-slate-50 mt-2">
                        <div className="pl-12">
                          {typeof faq.answer === 'string' ? (
                            <p>{faq.answer}</p>
                          ) : (
                            faq.answer
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      <AIChatButton
        franchiseCode="general"
        franchiseName="Blaze Robotics Academy"
      />
    </>
  )
}
