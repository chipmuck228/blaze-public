import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ | Blaze Robotics Academy',
  description: 'Frequently asked questions about our programs, camps, courses, and competition teams. Find answers on class size, refunds, schedules, and more.',
}

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
