'use client'

import { useState } from "react"
import { HelpCircle, Plus, Minus } from "lucide-react"

interface FaqItem {
  question: string
  answer: string | React.ReactNode
}

const competitionTeamFaqs: FaqItem[] = [
  {
    question: "How do I join the Blaze Robotics competition team?",
    answer:
      "Joining our team starts with participating in our courses or camps to build foundational skills. We also recommend attending an informational session or reaching out directly to our team coordinator for specific joining criteria and the application process.",
  },
  {
    question: "Are there prerequisites for joining the team?",
    answer:
      "Yes, we typically look for students who have completed certain courses or camps that provide the necessary robotics and teamwork skills. A passion for robotics and a commitment to the team's schedule and goals are also important.",
  },
  {
    question: "What age groups can join the Blaze Robotics competition teams?",
    answer:
      "Blaze Robotics Academy welcomes students from 3rd grade through high school to join our competition teams. Our program is designed to cater to various age groups, ensuring a productive and enriching experience for all members, from elementary students to high schoolers.",
  },
  {
    question: "How often do teams meet and practice?",
    answer:
      "Our VEX IQ teams typically meet once a week, focusing on a consistent and intensive learning experience. As the competition season progresses, we may offer additional practice sessions to further refine our robots and strategies. Please refer to each team level's description on our website for the most accurate schedule. Regardless of the season, our workshop provides extended access for those team members keen on extra practice time, supporting their dedication and drive to excel.",
  },
  {
    question: "What competitions do Blaze teams participate in?",
    answer:
      "Blaze Robotics teams actively compete in local, out-of-state, and world VEX Robotics Competition (VRC) and VEX IQ Robotics Competition (VIQRC) events. Our commitment to challenging our teams and showcasing their talents takes us beyond local competitions; some of our teams travel out-of-state to participate in prestigious Signature Events. These varied competitive experiences, recognized by major robotics and STEM organizations, provide our students with a comprehensive platform to test their skills, innovate, and excel on a global stage.",
  },
  {
    question: "Is there a fee to join the competition team?",
    answer:
      "Yes, we charge an all-inclusive team membership fee that simplifies participation costs. This single fee covers everything the team needs for the season, including team registration, tournament fees, parts, tools, field access, and facility use. Our goal is to make participation as straightforward and accessible as possible, keeping costs manageable while providing everything needed for a successful competition season.",
  },
  {
    question: "What makes Blaze Robotics teams unique?",
    answer:
      "With over 20 years of combined experience, access to a dynamic workshop, and mentorship by world-winning coaches, our teams are well-equipped for success. Our students not only excel in competitions but also represent Blaze Robotics Academy's values of innovation and excellence in their academic and personal achievements.",
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
    ),
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
    ),
  },
]

const campsFaqs: FaqItem[] = [
  {
    question: "What age groups do you cater to?",
    answer:
      "Our camps are designed for students in elementary, middle, and high school, with age-appropriate activities for each group.",
  },
  {
    question: "Do I need any prior experience in robotics to join a camp?",
    answer:
      "No prior experience is necessary! Our camps are structured to welcome beginners and challenge those with previous experience.",
  },
  {
    question: "How are campers grouped in each camp?",
    answer:
      "Campers are grouped by age and skill level to ensure everyone is learning and engaging at a pace that suits them best.",
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
    ),
  },
  {
    question: "Who teaches the camps?",
    answer:
      "Our camps are taught by experienced instructors and competition team coaches who are passionate about STEM education and robotics.",
  },
  {
    question: "What is the camper to instructor ratio?",
    answer:
      "We maintain a low camper to instructor ratio to ensure personalized attention and a supportive learning environment.",
  },
  {
    question: "Can I sign up for more than one camp?",
    answer:
      "Absolutely! We encourage campers to explore different areas of interest by signing up for multiple camps throughout the summer.",
  },
  {
    question: "How can I progress after attending a camp?",
    answer:
      "Campers interested in furthering their robotics journey can enroll in our courses and even join our competitive teams to apply their skills in real-world scenarios.",
  },
  {
    question: "What should I bring to camp?",
    answer:
      "Campers should bring their lunch (unless opting for our provided options), a water bottle, and any snacks they might want throughout the day. All robotics equipment will be provided.",
  },
  {
    question: "Are there any lunch options available at camp?",
    answer:
      "Yes, we offer a variety of lunch options from popular local vendors, including pizza, sandwiches, and more. We also provide facilities for those who prefer to bring their own lunch.",
  },
  {
    question: "Is there a lot of screen time involved?",
    answer:
      "While our camp does involve some screen time for programming and design activities, we are mindful of balancing digital engagement with plenty of hands-on learning and physical team-building activities. Screen time is structured and purposeful, aimed at enhancing learning while ensuring that campers also enjoy ample time away from screens. Our daily schedule incorporates a variety of activities that encourage movement, collaboration, and creativity, minimizing the potential for screen fatigue.",
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
    ),
  },
]

const coursesFaqs: FaqItem[] = [
  {
    question: "What types of courses does Blaze Robotics Academy offer?",
    answer:
      "We offer a range of courses designed to enhance skills in robotics and STEM, including introductory sessions for beginners, advanced programming, robotics engineering, and competition preparation courses.",
  },
  {
    question: "Are there prerequisites for any of the courses?",
    answer:
      "Some advanced courses may have prerequisites, such as basic knowledge of programming or prior completion of specific introductory courses. Check the course description for details.",
  },
  {
    question: "How long do courses typically last?",
    answer:
      "Our standard courses run in a 10-week format, focusing on a broad range of robotics and STEM topics. For those interested in competition-specific training, we offer both a 10-week format during the school year and a 2-week intensive format in the summer, detailed in a separate FAQ.",
  },
  {
    question: "How are your competition courses structured throughout the year?",
    answer:
      "During the school year, our competition courses are offered in a 10-week format, with sessions lasting 3 hours per week, totaling 30 hours. This format is designed to integrate seamlessly with students' regular schedules, providing ongoing, in-depth preparation for competitions. In the summer, we condense the same comprehensive 30-hour curriculum into a 2-week intensive course, running full days from 9 AM to 3 PM. Despite the difference in delivery time frames, both courses cover identical content, ensuring all students receive the same level of preparation for joining the competition team.",
  },
  {
    question: "What is the class size for each course?",
    answer:
      "We maintain small class sizes to ensure personalized attention and an optimal learning environment, typically capping classes at 10-15 students.",
  },
  {
    question: "Can I enroll in multiple courses at once?",
    answer:
      "Yes, students are welcome to enroll in multiple courses as long as the schedule permits. We recommend considering workload and course intensity when planning.",
  },
  {
    question: "What materials will I need for the courses?",
    answer:
      "Most materials and equipment are provided. However, for certain courses, students may be advised to bring their laptop or subscribe to specific software. Check the course requirements for details.",
  },
  {
    question: "Who teaches the courses?",
    answer:
      "Our courses are taught by experienced instructors and competition team coaches with extensive backgrounds in robotics, engineering, and STEM education.",
  },
  {
    question: "What happens if I miss a class?",
    answer:
      "We understand that conflicts can arise. While we encourage full attendance to get the most out of each course, missed classes can often be made up through session recordings or additional materials, depending on the instructor's policy.",
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
    ),
  },
]

export const Faq = () => {
  // 将所有 FAQ 合并到一个数组中
  const allFaqs: FaqItem[] = [
    ...competitionTeamFaqs,
    ...campsFaqs,
    ...coursesFaqs,
  ]

  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="pb-24 bg-slate-50 min-h-screen">
      <section className="bg-[#2563eb] py-20 text-white text-center">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-extrabold mb-4">Frequently Asked Questions</h1>
          <p className="text-blue-100 text-xl">Answers to common questions about our academy.</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="space-y-4">
          {allFaqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <div className="flex items-center space-x-4">
                  <HelpCircle className={`w-6 h-6 ${openIndex === index ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                  <span className={`text-lg font-bold ${openIndex === index ? 'text-[#2563eb]' : 'text-slate-800'}`}>
                    {faq.question}
                  </span>
                </div>
                {openIndex === index ? (
                  <Minus className="w-5 h-5 text-slate-400" />
                ) : (
                  <Plus className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-6 pt-0 text-slate-600 leading-relaxed border-t border-slate-50 mt-2">
                  {typeof faq.answer === 'string' ? (
                    <p>{faq.answer}</p>
                  ) : (
                    faq.answer
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
