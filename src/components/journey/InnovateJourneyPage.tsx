"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Barlow, Barlow_Condensed } from "next/font/google"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { StageSeriesCatalog } from "@/components/journey/StageSeriesCatalog"
import { appendCampusToNavLink } from "@/lib/stage-journey-links"
import styles from "@/app/journey/stage-journey.module.css"

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
})

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-barlow-condensed",
})

const CONDENSED = "var(--font-barlow-condensed), sans-serif"
const CONTACT = "https://www.blazeroboticsacademy.org/contact-us"
const PHONE = "tel:4256108618"

const WHY_CARDS = [
  { ico: "🌍", title: "Real Impact", desc: "Projects address genuine community challenges — not simulated ones." },
  { ico: "🎤", title: "Pitch & Present", desc: "Students learn to communicate solutions to real audiences." },
  { ico: "🤝", title: "Collaboration", desc: "Cross-disciplinary teamwork — engineering, design, storytelling." },
  { ico: "📄", title: "Portfolio Ready", desc: "A documented capstone project that stands out on college apps." },
] as const

const STATIC_PROGRAMS = [
  {
    head: styles.progHeadTeal,
    ico: "🤖",
    badge: "Flagship Program",
    title: "Robot for Good",
    sub: "Community Challenge Initiative",
    desc: "Students identify a real problem in their community and design a robotic or tech-driven solution. From concept to prototype to community presentation — end-to-end engineering with purpose.",
    items: [
      "Problem identification & research",
      "Engineering design process",
      "Prototype build and iteration",
      "Community presentation & impact report",
      "Optional external showcase events",
    ],
    btnClass: styles.btnTeal,
  },
  {
    head: styles.progHeadBlue,
    ico: "🎓",
    badge: "Advanced Course",
    title: "Capstone Engineering",
    sub: "Independent Senior Project",
    desc: "A structured independent project course where students define, design, build, test, and document their own engineering challenge from start to finish. The deepest technical track we offer.",
    items: [
      "Self-directed project proposal & scope",
      "Weekly coach check-ins & design reviews",
      "Full engineering notebook documentation",
      "Final build demo and presentation",
      "College application portfolio support",
    ],
    btnClass: styles.btnBlue,
  },
  {
    head: styles.progHeadGold,
    ico: "🏅",
    badge: "Challenge Track",
    title: "Innovation Showcase",
    sub: "Present to Real Judges",
    desc: "Students develop and present their innovation project to a panel of real engineers, educators, and community members. Pitch skills, design thinking, and public speaking — all in one track.",
    items: [
      "Structured design thinking curriculum",
      "Pitch deck and demo preparation",
      "Mock judging and feedback sessions",
      "Live showcase event with external judges",
      "Recognition and awards for top projects",
    ],
    btnClass: styles.btnGold,
  },
] as const

const IMPACT_IDEAS = [
  {
    ico: "♿",
    title: "Accessibility Aid",
    desc: "A robotic arm attachment or navigation assistant designed to help people with limited mobility complete everyday tasks independently.",
    tag: "Community Impact",
  },
  {
    ico: "🌱",
    title: "Environmental Monitor",
    desc: "Sensor-equipped robots that collect local environmental data — air quality, soil health, water levels — to support community awareness.",
    tag: "Environmental",
  },
  {
    ico: "📚",
    title: "STEM Educator Robot",
    desc: "A teaching robot designed to introduce younger students to coding and engineering through interactive demonstrations.",
    tag: "Education",
  },
  {
    ico: "🏥",
    title: "Healthcare Helper",
    desc: "Robots designed to assist in low-resource healthcare settings — supply transport, patient communication aids.",
    tag: "Healthcare",
  },
  {
    ico: "🛕",
    title: "Cultural Preservation",
    desc: "Using robotics and 3D scanning to document and preserve artifacts, monuments, or cultural sites that are at risk of deterioration.",
    tag: "Heritage",
  },
  {
    ico: "🍱",
    title: "Food Access Solution",
    desc: "Automated systems to help local food banks or community fridges track inventory, reduce waste, and serve more people.",
    tag: "Social Good",
  },
] as const

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Identify a Problem Worth Solving",
    desc: "Students explore community challenges, talk to potential users, and research existing solutions. The best projects start with genuine empathy.",
  },
  {
    num: "02",
    title: "Design Your Solution",
    desc: "Using the engineering design process: define requirements, brainstorm approaches, sketch and plan. Coaches challenge assumptions before building begins.",
  },
  {
    num: "03",
    title: "Build & Prototype",
    desc: "Students build their first version — and then iterate. Real engineering isn't about getting it right the first time. It's about getting better every time.",
  },
  {
    num: "04",
    title: "Test with Real Users",
    desc: "Wherever possible, students test their solution with the people it's designed for. Real feedback changes everything.",
  },
  {
    num: "05",
    title: "Showcase & Present",
    desc: "Students present their project to coaches, families, and external judges. Communication is an engineering skill too.",
  },
] as const

function withCampus(path: string, campusCode: string | null): string {
  if (!campusCode) return path
  if (path.startsWith("/journey/")) return appendCampusToNavLink(path, campusCode)
  const [base, hash = ""] = path.split("#")
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}location=${encodeURIComponent(campusCode)}${hash ? `#${hash}` : ""}`
}

function InnovateJourneyInner() {
  const searchParams = useSearchParams()
  const campusCode = searchParams.get("location")?.trim().toLowerCase() || null

  const buildHref = withCampus("/journey/buildmastery", campusCode)
  const competeHref = withCampus("/journey/compete", campusCode)
  const programsHref = withCampus("/programs", campusCode)

  return (
    <>
      <section className={`${styles.hero} ${styles.heroInnovate}`}>
        <div className={styles.heroInner}>
          <div className={`${styles.stepBadge} ${styles.heroInnovateBadge}`}>💡 Track B · After Build Mastery</div>
          <h1 className={styles.heroTitle} style={{ fontFamily: CONDENSED }}>
            Innovate.
            <br />
            <span className={styles.heroTitleLined}>Robot for Good.</span>
          </h1>
          <p className={styles.heroSub}>
            For students who want to use what they&apos;ve learned to solve real problems. Capstone engineering projects,
            community challenges, and initiatives that show the world what robotics can do beyond the game field.
          </p>
          <div className={styles.heroActs}>
            <a href={CONTACT} className={`${styles.btn} ${styles.btnGold} ${styles.btnLg}`} target="_blank" rel="noopener noreferrer">
              Express Interest
            </a>
            <Link href={buildHref} className={`${styles.btn} ${styles.btnOutW} ${styles.btnLg}`}>
              ← Build Mastery First
            </Link>
          </div>
          <blockquote className={styles.heroQuote} style={{ fontFamily: CONDENSED }}>
            &ldquo;The best engineers don&apos;t just win tournaments — they build things that matter.&rdquo;
          </blockquote>
        </div>
      </section>

      <div className={`${styles.ticker} ${styles.tickerTeal}`} style={{ fontFamily: CONDENSED }}>
        <span className={styles.tickerHi}>💡 Capstone Engineering Projects</span>
        <span className={styles.tickerSep}>|</span>
        <span>🌍 Robot for Good · Community Impact</span>
        <span className={styles.tickerSep}>|</span>
        <span>🎤 Showcase · Pitch · Present</span>
        <span className={styles.tickerSep}>|</span>
        <span>🔗 Track B · Open After Build Mastery</span>
      </div>

      <section className={`${styles.sec} ${styles.bgOff}`}>
        <div className={styles.whyGrid}>
          <div>
            <div className={`${styles.lbl} ${styles.lblTeal}`} style={{ fontFamily: CONDENSED }}>
              Why Innovate Exists
            </div>
            <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
              Not Every Great
              <br />
              Engineer Competes.
            </h2>
            <p className={styles.lead}>
              The tournament floor is one measure of excellence. But some of the most powerful things our students will ever
              build won&apos;t happen in an arena — they&apos;ll happen in a community, a school, or a hospital. The Innovate
              track is where that ambition lives.
            </p>
            <p className={`${styles.lead} mt-4`}>
              Robotics skills — engineering, coding, systems thinking, communication — are exactly the tools needed to tackle
              real-world problems. This track teaches students to apply them with purpose.
            </p>
          </div>
          <div className={styles.whyCards}>
            {WHY_CARDS.map((card) => (
              <article key={card.title} className={styles.whyCard}>
                <div className={styles.whyCardIco} aria-hidden>
                  {card.ico}
                </div>
                <div className={styles.whyCardTitle} style={{ fontFamily: CONDENSED }}>
                  {card.title}
                </div>
                <p className={styles.whyCardDesc}>{card.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.sec} ${styles.bgWhite}`} id="programs">
        <div className={`${styles.lbl} ${styles.lblTeal}`} style={{ fontFamily: CONDENSED }}>
          Programs
        </div>
        <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
          Three Ways
          <br />
          to Innovate.
        </h2>
        <p className={styles.lead}>
          {campusCode
            ? "Innovate seasons and activities at your campus — enroll when registration opens."
            : "From structured capstone courses to community challenge competitions — there's a format for every student who wants to build something that matters."}
        </p>
        {campusCode ? (
          <StageSeriesCatalog
            campusCode={campusCode}
            stageName="innovate"
            stageDisplayName="INNOVATE"
            className={styles.seriesGrid}
          />
        ) : (
          <>
            <p className={styles.campusHint}>
              Select a campus from the menu above to see local INNOVATE programs, seasons, and schedules near you.
            </p>
            <div className={styles.progGrid}>
              {STATIC_PROGRAMS.map((prog) => (
                <article key={prog.title} className={styles.progCard}>
                  <div className={`${styles.progHead} ${prog.head}`}>
                    <div className={styles.progIco} aria-hidden>
                      {prog.ico}
                    </div>
                    <span className={styles.progBadge} style={{ fontFamily: CONDENSED }}>
                      {prog.badge}
                    </span>
                    <div className={styles.progTitle} style={{ fontFamily: CONDENSED }}>
                      {prog.title}
                    </div>
                    <div className={styles.progSub} style={{ fontFamily: CONDENSED }}>
                      {prog.sub}
                    </div>
                  </div>
                  <div className={styles.progBody}>
                    <p className={styles.progDesc}>{prog.desc}</p>
                    <ul className={styles.progList}>
                      {prog.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.progFoot}>
                    <a href={CONTACT} className={`${styles.btn} ${prog.btnClass}`} target="_blank" rel="noopener noreferrer">
                      Express Interest
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className={`${styles.sec} ${styles.bgOff}`}>
        <div className={`${styles.lbl} ${styles.lblTeal}`} style={{ fontFamily: CONDENSED }}>
          Project Ideas
        </div>
        <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
          What Might a
          <br />
          Robot for Good Look Like?
        </h2>
        <p className={styles.lead}>
          These are examples of the kinds of challenges Innovate students tackle. Every project starts with a
          student&apos;s own curiosity about a problem worth solving.
        </p>
        <div className={styles.impactGrid}>
          {IMPACT_IDEAS.map((idea) => (
            <article key={idea.title} className={styles.impactCard}>
              <div className={styles.impactIco} aria-hidden>
                {idea.ico}
              </div>
              <div className={styles.impactTitle} style={{ fontFamily: CONDENSED }}>
                {idea.title}
              </div>
              <p className={styles.impactDesc}>{idea.desc}</p>
              <span className={styles.impactTag} style={{ fontFamily: CONDENSED }}>
                {idea.tag}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.sec} ${styles.bgWhite}`}>
        <div className={`${styles.lbl} ${styles.lblTeal}`} style={{ fontFamily: CONDENSED }}>
          How It Works
        </div>
        <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
          The Innovate Process.
        </h2>
        <p className={styles.lead}>
          Every Innovate project follows a structured engineering design process — adapted so students at every level can
          succeed.
        </p>
        <div className={styles.process}>
          {PROCESS_STEPS.map((step) => (
            <div key={step.num} className={styles.processStep}>
              <div className={styles.processNum} style={{ fontFamily: CONDENSED }}>
                {step.num}
              </div>
              <div>
                <div className={styles.processTitle} style={{ fontFamily: CONDENSED }}>
                  {step.title}
                </div>
                <p className={styles.processDesc}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.sec} ${styles.bgOff}`}>
        <div className={styles.interestBox}>
          <div>
            <div className={styles.interestEyebrow} style={{ fontFamily: CONDENSED }}>
              ⚡ Enrollment Opening Soon
            </div>
            <h2 className={styles.interestTitle} style={{ fontFamily: CONDENSED }}>
              Interested in
              <br />
              Innovate?
            </h2>
            <p className={styles.interestDesc}>
              The Innovate track is launching with select cohorts. Express your interest now and we&apos;ll reach out with
              details, eligibility, and enrollment timing.
            </p>
          </div>
          <div className={styles.interestActs}>
            <a href={CONTACT} className={`${styles.btn} ${styles.btnGold} ${styles.btnLg}`} target="_blank" rel="noopener noreferrer">
              Express Interest →
            </a>
            <a href={PHONE} className={`${styles.btn} ${styles.btnOutW} ${styles.btnLg}`}>
              Call 425-610-8618
            </a>
          </div>
        </div>

        <div className={styles.alsoCompete}>
          <div className={styles.alsoInnoInner}>
            <div className={styles.alsoInnoIco} aria-hidden>
              🏆
            </div>
            <div>
              <div className={styles.alsoInnoTitle} style={{ fontFamily: CONDENSED }}>
                Also Considering Track A — Compete?
              </div>
              <p className={styles.alsoInnoDesc}>
                Some students run a capstone project <em>and</em> compete on a team. Both tracks are open after Build
                Mastery — you don&apos;t have to choose just one.
              </p>
            </div>
          </div>
          <Link href={competeHref} className={`${styles.btn} ${styles.btnBlue} ${styles.btnLg}`}>
            Explore Compete →
          </Link>
        </div>

        {campusCode ? (
          <p className={`${styles.lead} mt-8`}>
            <Link href={programsHref} className="text-[#0d7377] font-semibold underline-offset-2 hover:underline">
              Browse all programs at this campus →
            </Link>
          </p>
        ) : null}
      </section>
    </>
  )
}

export function InnovateJourneyPage() {
  return (
    <>
      <Navbar />
      <div
        className={`${styles.page} ${barlow.variable} ${barlowCondensed.variable} pb-24 pt-14`}
        style={{ fontFamily: "var(--font-barlow), sans-serif" }}
      >
        <Suspense fallback={<div className={styles.seriesLoading}>Loading…</div>}>
          <InnovateJourneyInner />
        </Suspense>
      </div>
      <Footer />
    </>
  )
}
