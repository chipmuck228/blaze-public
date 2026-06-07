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
const PARENT_PORTAL = "https://www.blazeroboticsacademy.org/parent-portal-team-resources"

const STATIC_TEAMS = [
  { name: "Team A", level: "Elementary · VEX IQ", desc: "Our flagship team. Multiple regional placements and a culture of excellence built over multiple seasons." },
  { name: "Team B", level: "Elementary · VEX IQ", desc: "Engineering-focused squad known for innovative robot design and consistent scoring performance." },
  { name: "Team C", level: "Elementary · VEX IQ", desc: "Built on communication and collaboration. Exceptional at teamwork challenges and alliance strategies." },
  { name: "Team D", level: "Elementary · VEX IQ", desc: "Rising competitors with fresh design approaches. One of the fastest-improving squads in the program." },
  { name: "Team E", level: "Elementary · VEX IQ", desc: "Precision programmers. Autonomous routines consistently rank among the most reliable in regional fields." },
  { name: "More", level: "New Teams Each Season", desc: "New teams form from Comp Prep graduates each season. Complete prep and earn your spot.", featured: true, badge: "Forming" },
] as const

const COACHING_PACKAGES = [
  {
    tier: "Starter",
    name: "Foundation",
    desc: "For first-year teams getting tournament-ready",
    featured: false,
    items: [
      { text: "Weekly team practice sessions", dim: false },
      { text: "Coach-led robot design review", dim: false },
      { text: "Tournament registration support", dim: false },
      { text: "Engineering notebook guidance", dim: false },
      { text: "Dedicated competition coach", dim: true },
      { text: "Video analysis & scouting", dim: true },
    ],
  },
  {
    tier: "Most Popular",
    name: "Competitive",
    desc: "For teams targeting state qualification and awards",
    featured: true,
    items: [
      { text: "2× weekly practice sessions", dim: false },
      { text: "Dedicated competition coach", dim: false },
      { text: "Full autonomous programming support", dim: false },
      { text: "Engineering notebook reviews", dim: false },
      { text: "Pre-tournament scrimmages", dim: false },
      { text: "Video analysis & scouting", dim: true },
    ],
  },
  {
    tier: "Elite",
    name: "Championship",
    desc: "Full Ignite-pipeline preparation",
    featured: false,
    items: [
      { text: "3× weekly sessions + open lab", dim: false },
      { text: "Dedicated head coach", dim: false },
      { text: "Full autonomous + driver skills", dim: false },
      { text: "Video analysis & opponent scouting", dim: false },
      { text: "Alliance strategy workshops", dim: false },
      { text: "Ignite pathway referral", dim: false },
    ],
  },
] as const

function withCampus(path: string, campusCode: string | null): string {
  if (!campusCode) return path
  if (path.startsWith("/journey/")) return appendCampusToNavLink(path, campusCode)
  const [base, hash = ""] = path.split("#")
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}location=${encodeURIComponent(campusCode)}${hash ? `#${hash}` : ""}`
}

function CompeteJourneyInner() {
  const searchParams = useSearchParams()
  const campusCode = searchParams.get("location")?.trim().toLowerCase() || null

  const buildHref = withCampus("/journey/buildmastery", campusCode)
  const innovateHref = withCampus("/journey/innovate", campusCode)
  const programsHref = withCampus("/programs", campusCode)

  return (
    <>
      <section className={`${styles.hero} ${styles.heroCompete}`}>
        <div className={styles.heroInner}>
          <div className={styles.stepBadge}>🏆 Track A · After Build Mastery</div>
          <h1 className={styles.heroTitle} style={{ fontFamily: CONDENSED }}>
            Compete
            <br />
            at
            <br />
            <span className={styles.heroTitleLined}>the Highest Level.</span>
          </h1>
          <p className={styles.heroSub}>
            For students who want to test their engineering on the competition floor. Real tournaments. Real pressure. Real
            growth. The foundation you built in Build Mastery is about to be put to the test.
          </p>
          <div className={styles.heroActs}>
            <Link href={buildHref} className={`${styles.btn} ${styles.btnGold} ${styles.btnLg}`}>
              Start with Comp Prep
            </Link>
            <a href="#coaching" className={`${styles.btn} ${styles.btnOutW} ${styles.btnLg}`}>
              Coaching Packages
            </a>
          </div>
          <div className={styles.heroNote}>
            <div className={styles.heroNoteTxt}>
              🔗 Our students go on to compete with Ignite Robotics — 2026 VEX World Champions. That journey starts here at
              Blaze.
            </div>
          </div>
        </div>
      </section>

      <div className={styles.ticker} style={{ fontFamily: CONDENSED }}>
        <span className={styles.tickerHi}>🏅 Elementary VEX IQ Teams</span>
        <span className={styles.tickerSep}>|</span>
        <span>🔗 Pathway to Ignite Robotics</span>
        <span className={styles.tickerSep}>|</span>
        <span>📋 Comp Prep Required to Join</span>
        <span className={styles.tickerSep}>|</span>
        <span>🏆 State & Regional Tournaments</span>
      </div>

      <section className={`${styles.sec} ${styles.bgOff}`}>
        <div className={styles.lbl} style={{ fontFamily: CONDENSED }}>
          How Teams Work
        </div>
        <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
          Earn Your Spot
          <br />
          on the Floor.
        </h2>
        <p className={styles.lead}>
          Joining a Blaze team isn&apos;t just signing up — students complete Competition Prep first. That standard ensures
          every athlete understands the engineering behind their robot, not just how to drive it.
        </p>
        <div className={styles.gateway}>
          <div className={styles.gatewayIco} aria-hidden>
            ⚡
          </div>
          <div>
            <div className={styles.gatewayTitle} style={{ fontFamily: CONDENSED }}>
              Competition Prep is Required — Here&apos;s Why
            </div>
            <p className={styles.gatewayBody}>
              Every Blaze competition team member must first complete Competition Prep. Students arrive at their first
              tournament understanding the engineering decisions behind their robot, able to explain and defend them, and
              equipped to work as a high-functioning team under real pressure.
            </p>
            <div className={styles.gatewaySteps} style={{ fontFamily: CONDENSED }}>
              <span className={`${styles.gatewayStep} ${styles.gatewayStepActive}`}>1. Enroll in Comp Prep</span>
              <span className={styles.gatewayStep}>→ 2. Complete Course</span>
              <span className={styles.gatewayStep}>→ 3. Join Team</span>
              <span className={styles.gatewayStep}>→ 4. Compete & Win</span>
            </div>
            <Link href={buildHref} className={`${styles.btn} ${styles.btnBlue}`}>
              Enroll in Comp Prep →
            </Link>
          </div>
        </div>
      </section>

      <section className={`${styles.sec} ${styles.bgWhite}`} id="teams">
        <div className={styles.lbl} style={{ fontFamily: CONDENSED }}>
          Our Teams
        </div>
        <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
          Blaze Elementary
          <br />
          Competition Teams.
        </h2>
        <p className={styles.lead}>
          {campusCode
            ? "Programs and seasons at your campus — enroll in Competition Prep or join a team track when registration opens."
            : "Our teams compete in VEX IQ tournaments at regional and state level — building the habits, skills, and competitive fire that define Blaze athletes."}
        </p>
        {!campusCode ? (
          <>
            <p className={styles.campusHint}>
              Select a campus from the menu above to see local COMPETE programs, seasons, and schedules near you.
            </p>
            <div className={styles.tgrid}>
              {STATIC_TEAMS.map((team) => (
                <article
                  key={team.name}
                  className={`${styles.teamCard} ${"featured" in team && team.featured ? styles.teamCardFeatured : ""}`}
                >
                  <div className={styles.teamCardHead}>
                    <div className={styles.teamCardName} style={{ fontFamily: CONDENSED }}>
                      {team.name}
                    </div>
                    {"badge" in team && team.badge ? (
                      <span className={styles.teamCardBadge} style={{ fontFamily: CONDENSED }}>
                        {team.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.teamCardLevel} style={{ fontFamily: CONDENSED }}>
                    {team.level}
                  </div>
                  <p className={styles.teamCardDesc}>{team.desc}</p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <StageSeriesCatalog
            campusCode={campusCode}
            stageName="compete"
            stageDisplayName="COMPETE"
            className={styles.seriesGrid}
          />
        )}
      </section>

      <section className={`${styles.sec} ${styles.bgOff}`}>
        <div className={styles.igGrid}>
          <div>
            <div className={styles.lbl} style={{ fontFamily: CONDENSED }}>
              The Next Level
            </div>
            <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
              What the Right
              <br />
              Foundation Produces.
            </h2>
            <p className={`${styles.lead} mt-3.5`}>
              Blaze is the training academy. Ignite is where our students go on to compete at state, national, and
              world-championship levels. The 2026 VEX World Champions built their engineering foundation in programs like
              ours. That&apos;s not coincidence — it&apos;s what design thinking and engineering excellence produce.
            </p>
            <div className="mt-7">
              <Link href="/about" className={`${styles.btn} ${styles.btnBlue} ${styles.btnLg}`}>
                Our Ignite Partnership →
              </Link>
            </div>
          </div>
          <div className={styles.igCards}>
            <div className={`${styles.igCard} ${styles.igCardGold}`}>
              <div className={styles.igCardYear} style={{ fontFamily: CONDENSED }}>
                Ignite · VEX Worlds 2026 · High School
              </div>
              <div className={styles.igCardResult} style={{ fontFamily: CONDENSED }}>
                🏆 World Champions — Team 10B
              </div>
            </div>
            <div className={styles.igCard}>
              <div className={styles.igCardYear} style={{ fontFamily: CONDENSED }}>
                High School · Teams 10C, 10K, 10P, 10W, 917X
              </div>
              <div className={styles.igCardResult} style={{ fontFamily: CONDENSED }}>
                🔥 Division Finals · Top 16
              </div>
            </div>
            <div className={styles.igCard}>
              <div className={styles.igCardYear} style={{ fontFamily: CONDENSED }}>
                Middle School · Teams 938A–938R
              </div>
              <div className={styles.igCardResult} style={{ fontFamily: CONDENSED }}>
                🥇 Innovate Awards · Alliance Finals
              </div>
            </div>
            <p className={styles.igNote}>
              <strong>Note:</strong> These achievements belong to Ignite Robotics. Blaze is the training foundation that
              consistently produces results like these.
            </p>
          </div>
        </div>
      </section>

      <section className={`${styles.sec} ${styles.bgWhite}`} id="coaching">
        <div className={styles.lbl} style={{ fontFamily: CONDENSED }}>
          Coaching Packages
        </div>
        <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
          The Right Level
          <br />
          of Support.
        </h2>
        <p className={styles.lead}>Every competition team has access to expert coaching. Choose the package that fits your goals.</p>
        <div className={styles.pkgrid}>
          {COACHING_PACKAGES.map((pkg) => (
            <article key={pkg.name} className={`${styles.pkg} ${pkg.featured ? styles.pkgFeatured : ""}`}>
              <div className={`${styles.pkgHead} ${pkg.featured ? styles.pkgHeadFeatured : ""}`}>
                <div className={styles.pkgTier} style={{ fontFamily: CONDENSED }}>
                  {pkg.tier}
                </div>
                <div className={styles.pkgName} style={{ fontFamily: CONDENSED }}>
                  {pkg.name}
                </div>
                <p className={styles.pkgDesc}>{pkg.desc}</p>
              </div>
              <div className={styles.pkgBody}>
                <ul className={styles.pkgList}>
                  {pkg.items.map((item) => (
                    <li key={item.text} className={item.dim ? styles.pkgItemDim : undefined}>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.pkgFoot}>
                <a
                  href={CONTACT}
                  className={`${styles.btn} ${pkg.featured ? styles.btnBlue : styles.btnGhost}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Inquire →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.sec} ${styles.bgOff}`}>
        <div className={styles.alsoInno}>
          <div className={styles.alsoInnoInner}>
            <div className={styles.alsoInnoIco} aria-hidden>
              💡
            </div>
            <div>
              <div className={styles.alsoInnoTitle} style={{ fontFamily: CONDENSED }}>
                Also Considering Track B — Innovate?
              </div>
              <p className={styles.alsoInnoDesc}>
                Some students compete <em>and</em> run a capstone project. The Innovate track is open to anyone who&apos;s
                completed Build Mastery — you don&apos;t have to choose just one.
              </p>
            </div>
          </div>
          <Link href={innovateHref} className={`${styles.btn} ${styles.btnTeal} ${styles.btnLg}`}>
            Explore Innovate →
          </Link>
        </div>
        <div className={styles.parentPortal}>
          <div>
            <div className={styles.parentPortalEyebrow} style={{ fontFamily: CONDENSED }}>
              For Current Team Families
            </div>
            <div className={styles.parentPortalTitle} style={{ fontFamily: CONDENSED }}>
              Parent Portal & Team Resources
            </div>
            <p className={styles.parentPortalDesc}>Practice schedules, tournament dates, notebooks, and coach communications.</p>
          </div>
          <a href={PARENT_PORTAL} className={`${styles.btn} ${styles.btnBlue} ${styles.btnLg}`} target="_blank" rel="noopener noreferrer">
            Access Portal →
          </a>
        </div>
        {campusCode ? (
          <p className={`${styles.lead} mt-8`}>
            <Link href={programsHref} className="text-[#1a3fa8] font-semibold underline-offset-2 hover:underline">
              Browse all programs at this campus →
            </Link>
          </p>
        ) : null}
      </section>
    </>
  )
}

export function CompeteJourneyPage() {
  return (
    <>
      <Navbar />
      <div
        className={`${styles.page} ${barlow.variable} ${barlowCondensed.variable} pb-24 pt-14`}
        style={{ fontFamily: "var(--font-barlow), sans-serif" }}
      >
        <Suspense fallback={<div className={styles.seriesLoading}>Loading…</div>}>
          <CompeteJourneyInner />
        </Suspense>
      </div>
      <Footer />
    </>
  )
}
