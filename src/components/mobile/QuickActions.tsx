'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BookOpen, MapPin, User, MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { usePlatform } from '@/hooks/usePlatform'
import { AIChatButton } from '@/components/location/AIChatButton'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
  requireAuth?: boolean
}

export function QuickActions() {
  const { isNative } = usePlatform()
  const router = useRouter()
  const { data: session, status } = useSession()

  const actions: QuickAction[] = [
    {
      id: 'browse-courses',
      title: 'Browse Courses',
      description: 'Explore all available courses',
      icon: BookOpen,
      href: '/course-catalog',
    },
    {
      id: 'choose-location',
      title: 'Choose Location',
      description: 'Find programs near you',
      icon: MapPin,
      href: '/locations',
    },
    {
      id: 'my-courses',
      title: status === 'authenticated' ? 'My Courses' : 'Sign In',
      description: status === 'authenticated' 
        ? 'View your enrollments' 
        : 'Sign in to view your courses',
      icon: User,
      href: status === 'authenticated' ? '/profile' : '/login',
      requireAuth: false, // 未登录时显示 Sign In
    },
    {
      id: 'ai-assistant',
      title: 'Ask AI',
      description: 'Get instant help',
      icon: MessageCircle,
      onClick: () => {
        // 触发 AI 聊天对话框
        window.dispatchEvent(new CustomEvent('openAIChat'))
      },
    },
  ]

  const handleClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick()
    } else if (action.href) {
      router.push(action.href)
    }
  }

  return (
    <section className="px-4 py-6">
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Card
              key={action.id}
              className="cursor-pointer hover:shadow-md transition-shadow active:scale-95"
              onClick={() => handleClick(action)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{action.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {/* AI Chat Button (floating) */}
      {isNative && <AIChatButton />}
    </section>
  )
}

