/**
 * Stage journey landing pages — slug, v3_stage.name, static entry cards, and admin link hints.
 * @see v3/README.md — v3_stage.link drives Navbar destinations.
 */

export type StageJourneySlug = "ignite" | "buildmastery" | "competestage" | "innovate"

export type EntryCardTone = "blue" | "gold" | "green"

export interface StaticEntryCard {
  href: string
  external?: boolean
  tone: EntryCardTone
  icon: string
  title: string
  subtitle: string
  bullets: string[]
  linkLabel: string
}

export interface StageJourneyConfig {
  slug: StageJourneySlug
  /** v3_stage.name */
  stageName: string
  /** C-end Program label */
  stageDisplayName: string
  journeyPath: string
  stepNumber: number
  stepBadge: string
  hero: {
    /** Each block renders on its own line; optional emphasis or gold underline */
    titleBlocks: Array<{ text: string; em?: boolean; lined?: boolean }>
    subtitle: string
    primaryCta: { label: string; href: string; external?: boolean }
    secondaryCta?: { label: string; href: string }
    note: string
  }
  staticEntryLead: string
  staticEntryHint?: string
  staticEntryCards: StaticEntryCard[]
}

const AMILIA = "https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs"

export const STAGE_JOURNEY_CONFIGS: Record<StageJourneySlug, StageJourneyConfig> = {
  ignite: {
    slug: "ignite",
    stageName: "ignitecuriosity",
    stageDisplayName: "Ignite Curiosity",
    journeyPath: "/journey/ignite",
    stepNumber: 1,
    stepBadge: "Step 01 · Your Robot Journey",
    hero: {
      titleBlocks: [
        { text: "Every" },
        { text: "Engineer", em: true },
        { text: "Starts With" },
        { text: "Curiosity.", lined: true },
      ],
      subtitle:
        "No experience needed. No prior knowledge required. Just curiosity and a willingness to try — that's all it takes to start building the engineering mindset that carries students further than they imagine.",
      primaryCta: { label: "Book a Free Trial", href: AMILIA, external: true },
      secondaryCta: { label: "Step 02: Build Mastery →", href: "/journey/buildmastery" },
      note: "Great engineers come from curious beginners. A free trial class is where the design thinking begins — 45 minutes, all equipment provided, zero pressure.",
    },
    staticEntryLead:
      "Every path starts somewhere. Explore how Blaze helps students build curiosity, skills, and confidence — then choose a campus to see local schedules.",
    staticEntryHint: "Looking for dates and pricing near you? Select a campus from the menu above.",
    staticEntryCards: [
      {
        href: AMILIA,
        external: true,
        tone: "blue",
        icon: "🎟️",
        title: "Free Trial",
        subtitle: "One Session · Zero Commitment",
        bullets: [
          "Hands-on with a Blaze coach",
          "All ages and skill levels welcome",
          "All equipment provided",
          "45 minutes — just come and see",
        ],
        linkLabel: "Book Now →",
      },
      {
        href: "#membership",
        tone: "gold",
        icon: "🔑",
        title: "Club Membership",
        subtitle: "Afterschool · Mon–Fri · Flexible",
        bullets: [
          "Open robot building & practice",
          "Structured curriculum every session",
          "Coach supervision + 3D printing",
          "Come as often or as rarely as you like",
        ],
        linkLabel: "See Plans →",
      },
      {
        href: "/programs",
        tone: "green",
        icon: "🏕️",
        title: "Day & Summer Camps",
        subtitle: "Intensive · Fun · All Levels",
        bullets: [
          "Full-day robotics & 3D design",
          "Summer sessions now open",
          "Day camps throughout the year",
          "All experience levels welcome",
        ],
        linkLabel: "View Camps →",
      },
    ],
  },
  buildmastery: {
    slug: "buildmastery",
    stageName: "buildmastery",
    stageDisplayName: "Build Mastery",
    journeyPath: "/journey/buildmastery",
    stepNumber: 2,
    stepBadge: "Step 02 · Your Robot Journey",
    hero: {
      titleBlocks: [
        { text: "Turn Curiosity" },
        { text: "Into" },
        { text: "Mastery.", lined: true },
      ],
      subtitle:
        "Structured courses for motivated learners. Build programming, engineering, and design thinking skills through weekly sessions — the foundation for competition or deeper innovation.",
      primaryCta: { label: "Browse Courses", href: "/programs" },
      secondaryCta: { label: "Step 03: Compete →", href: "/journey/compete" },
      note: "Courses meet students where they are — with clear progression, coach feedback, and hands-on projects every week.",
    },
    staticEntryLead:
      "Structured learning paths help students go from curious builders to confident engineers. Choose a campus to see course seasons and schedules near you.",
    staticEntryHint: "Select a campus from the menu above to view local Build Mastery programs.",
    staticEntryCards: [
      {
        href: "/programs",
        tone: "blue",
        icon: "📘",
        title: "Weekly Courses",
        subtitle: "Structured · Progressive",
        bullets: [
          "RoboQuests, LaunchPad, RoboChamps tracks",
          "Programming, sensors, and automation",
          "Small groups with coach feedback",
          "Prepare for teams or innovation labs",
        ],
        linkLabel: "Browse Courses →",
      },
      {
        href: "#membership",
        tone: "gold",
        icon: "🔑",
        title: "Membership + Course",
        subtitle: "Practice · Every Week",
        bullets: [
          "Combine membership with a weekly course",
          "Extra open build time after class",
          "Fastest skill development path",
          "Flexible campus access",
        ],
        linkLabel: "See Membership →",
      },
      {
        href: "/journey/ignite",
        tone: "green",
        icon: "⚡",
        title: "New to Robotics?",
        subtitle: "Start with Curiosity",
        bullets: [
          "Free trial or beginner camps",
          "No prior experience required",
          "Perfect before structured courses",
          "Ages 8+ welcome",
        ],
        linkLabel: "Ignite Curiosity →",
      },
    ],
  },
  competestage: {
    slug: "competestage",
    stageName: "compete",
    stageDisplayName: "COMPETE",
    journeyPath: "/journey/compete",
    stepNumber: 3,
    stepBadge: "Step 03 · Your Robot Journey",
    hero: {
      titleBlocks: [
        { text: "Build." },
        { text: "Compete." },
        { text: "Win." },
        { text: "Together.", lined: true },
      ],
      subtitle:
        "Join a competition team, prepare for VEX events, and experience the thrill of engineering under real tournament pressure — from local meets to world-class stages.",
      primaryCta: { label: "Learn About Teams", href: "/programs" },
      secondaryCta: { label: "Step 04: Innovate →", href: "/journey/innovate" },
      note: "Competition Prep is the gateway to Blaze teams. Coaches guide strategy, build, and code — students own the robot.",
    },
    staticEntryLead:
      "Competition tracks demand teamwork, grit, and technical depth. Select a campus to see team programs and prep seasons in your area.",
    staticEntryHint: "Select a campus from the menu above to view local Compete programs.",
    staticEntryCards: [
      {
        href: "/programs",
        tone: "blue",
        icon: "🏆",
        title: "Competition Prep",
        subtitle: "Gateway to Teams",
        bullets: [
          "Required path to elementary teams",
          "Game strategy and robot design",
          "Autonomous and driver skills",
          "Tournament-ready workflows",
        ],
        linkLabel: "View Prep Courses →",
      },
      {
        href: AMILIA,
        external: true,
        tone: "gold",
        icon: "🤝",
        title: "Join a Team",
        subtitle: "Season · Commitment",
        bullets: [
          "Collaborate with peers and coaches",
          "Local and regional events",
          "Path to Signature Events",
          "Grades 4–12 depending on program",
        ],
        linkLabel: "Explore Teams →",
      },
      {
        href: "/journey/buildmastery",
        tone: "green",
        icon: "📘",
        title: "Need More Skills?",
        subtitle: "Build Mastery First",
        bullets: [
          "Structured courses before teams",
          "Strengthen programming fundamentals",
          "Engineering notebook practice",
          "Recommended for many new competitors",
        ],
        linkLabel: "Build Mastery →",
      },
    ],
  },
  innovate: {
    slug: "innovate",
    stageName: "innovate",
    stageDisplayName: "INNOVATE",
    journeyPath: "/journey/innovate",
    stepNumber: 4,
    stepBadge: "Step 04 · Your Robot Journey",
    hero: {
      titleBlocks: [
        { text: "Engineer" },
        { text: "What's" },
        { text: "Next." },
        { text: "Innovate.", lined: true },
      ],
      subtitle:
        "Explore AI, IoT, automation, and real-world engineering projects. Innovation Lab experiences turn advanced skills into prototypes, portfolios, and community impact.",
      primaryCta: { label: "Explore Innovation Programs", href: "/programs" },
      secondaryCta: { label: "← Back to Compete", href: "/journey/compete" },
      note: "For students ready to go beyond the game — designing systems that solve real problems with modern tools.",
    },
    staticEntryLead:
      "Innovation paths combine advanced robotics with creative problem-solving. Choose a campus to see lab programs and project seasons near you.",
    staticEntryHint: "Select a campus from the menu above to view local Innovate programs.",
    staticEntryCards: [
      {
        href: "/programs",
        tone: "blue",
        icon: "💡",
        title: "Innovation Lab",
        subtitle: "Projects · Portfolio",
        bullets: [
          "AI, IoT, and automation themes",
          "Mentor-guided capstone projects",
          "Portfolio-ready deliverables",
          "Advanced builders welcome",
        ],
        linkLabel: "View Lab Programs →",
      },
      {
        href: AMILIA,
        external: true,
        tone: "gold",
        icon: "🔬",
        title: "Workshops",
        subtitle: "Focused · Intensive",
        bullets: [
          "Short deep-dive sessions",
          "Special topics and guest mentors",
          "Try before a full lab season",
          "Flexible scheduling",
        ],
        linkLabel: "Browse Workshops →",
      },
      {
        href: "/journey/compete",
        tone: "green",
        icon: "🏆",
        title: "From Competition",
        subtitle: "Skills Transfer",
        bullets: [
          "Many innovators start on teams",
          "Apply tournament skills to real problems",
          "Leadership and documentation",
          "Natural next step after Compete",
        ],
        linkLabel: "Compete Stage →",
      },
    ],
  },
}

/** Admin UI: recommended v3_stage.link values per stage name */
export const STAGE_JOURNEY_ADMIN_LINK_HINTS: Record<string, string> = {
  ignitecuriosity: "/journey/ignite",
  buildmastery: "/journey/buildmastery",
  compete: "/journey/compete",
  competestage: "/journey/compete",
  innovate: "/journey/innovate",
}

const byStageName = new Map(
  Object.values(STAGE_JOURNEY_CONFIGS).map((c) => [c.stageName.toLowerCase(), c])
)

export function getStageJourneyConfig(slug: StageJourneySlug): StageJourneyConfig {
  return STAGE_JOURNEY_CONFIGS[slug]
}

export function getStageJourneyByStageName(stageName: string): StageJourneyConfig | undefined {
  return byStageName.get(stageName.toLowerCase())
}
