import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calendar | Blaze Robotics Academy',
  description: 'US federal holidays and Blaze program and class start and end dates. Plan your year and find sessions that fit your schedule.',
}

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
