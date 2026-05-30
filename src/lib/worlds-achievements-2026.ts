/**
 * 2026 VEX Worlds achievements — home page celebration block.
 *
 * Background: public/marketing/worlds-2026/awards-background.jpeg (or .jpg)
 * Gallery: champion.webp, awards-1.webp, awards-2.webp
 */

export type WorldsAchievementEntry = {
  /** Team number(s), e.g. "10B" or ["10K", "10P", "10W"] */
  teams: string | readonly string[]
  title: string
  detail?: string
  variant: "champion" | "finals" | "playoff" | "award" | "elimination"
}

export type WorldsAchievementImage = {
  src: string
  alt: string
  featured?: boolean
}

export const WORLDS_ACHIEVEMENTS_BACKGROUND =
  "/marketing/worlds-2026/awards-background.jpeg"

/** Fallback if only .jpg is present in public folder */
export const WORLDS_ACHIEVEMENTS_BACKGROUND_JPG =
  "/marketing/worlds-2026/awards-background.jpg"

export const WORLDS_ACHIEVEMENTS_2026 = {
  badge: "Congratulations to Our High School Team 10B",
  headline: "WE ARE THE 2026 VEX WORLD CHAMPION",
  subheadline:
    "Congratulations to All Our Worlds Teams for Their Outstanding Performance",
  highSchool: {
    label: "High School Division",
    subtitle: "Six teams · VEX Robotics World Championship",
    teamNumbers: ["10B", "10C", "10K", "10P", "10W", "917X"] as const,
    entries: [
      {
        teams: "10B",
        title: "VEX Robotics World Champion",
        detail: "2026 VEX Worlds — High School",
        variant: "champion",
      },
      {
        teams: "10C",
        title: "Division Finals",
        detail: "Elite bracket run at Worlds",
        variant: "finals",
      },
      {
        teams: ["10K", "10P", "10W"],
        title: "Quarterfinals",
        detail: "Alliance playoff bracket",
        variant: "playoff",
      },
      {
        teams: "917X",
        title: "Top 16 — Alliance Eliminations",
        variant: "elimination",
      },
    ] satisfies WorldsAchievementEntry[],
  },
  middleSchool: {
    label: "Middle School Division",
    subtitle: "Five teams · VEX Robotics World Championship",
    teamNumbers: ["938A", "938G", "938M", "938N", "938R"] as const,
    entries: [
      {
        teams: "938A",
        title: "Innovate Award",
        variant: "award",
      },
      {
        teams: "938M",
        title: "Innovate Award",
        variant: "award",
      },
      {
        teams: ["938A", "938G", "938M"],
        title: "Top 16 — Alliance Eliminations",
        variant: "elimination",
      },
    ] satisfies WorldsAchievementEntry[],
  },
  cta: {
    label: "Explore Competition Teams",
    href: "/competition",
  },
  images: [
    {
      src: "/marketing/worlds-2026/champion.webp",
      alt: "Blaze Robotics Academy 2026 VEX World Championship celebration",
      featured: true,
    },
    {
      src: "/marketing/worlds-2026/awards-1.webp",
      alt: "VEX Worlds awards and team recognition",
    },
    {
      src: "/marketing/worlds-2026/awards-2.webp",
      alt: "Blaze teams at VEX Worlds",
    },
  ] satisfies WorldsAchievementImage[],
} as const
