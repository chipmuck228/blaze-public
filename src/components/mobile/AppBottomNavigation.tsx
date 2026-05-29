'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Home, 
  BookOpen, 
  User, 
  MapPin,
  ShoppingCart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlatform } from '@/hooks/usePlatform'
import { PUBLIC_USER_AUTH_ENABLED } from '@/lib/public-user-auth'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: number
  requireAuth?: boolean
}

export function AppBottomNavigation() {
  const { isNative, isReady } = usePlatform()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [cartCount, setCartCount] = useState(0)

  // 获取购物车数量
  useEffect(() => {
    if (!PUBLIC_USER_AUTH_ENABLED) {
      setCartCount(0)
      return
    }
    if (status === 'authenticated' && session?.user) {
      const fetchCartCount = async () => {
        try {
          const response = await fetch('/api/enrollments/cart')
          if (response.ok) {
            const data = await response.json()
            setCartCount(data.total || 0)
          }
        } catch (error) {
          console.error('Error fetching cart count:', error)
        }
      }
      fetchCartCount()
      const interval = setInterval(fetchCartCount, 30000)
      return () => clearInterval(interval)
    } else {
      setCartCount(0)
    }
  }, [status, session])

  // 等待平台检测完成，避免 SSR hydration mismatch
  if (!isReady || !isNative) {
    return null
  }

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/',
    },
    {
      id: 'courses',
      label: 'Courses',
      icon: BookOpen,
      href: '/course-catalog',
    },
    ...(PUBLIC_USER_AUTH_ENABLED
      ? ([
          {
            id: 'my-courses',
            label: 'My Courses',
            icon: ShoppingCart,
            href: '/profile',
            badge: cartCount > 0 ? cartCount : undefined,
            requireAuth: true,
          },
        ] as NavItem[])
      : []),
    {
      id: 'locations',
      label: 'Campuses',
      icon: MapPin,
      href: '/locations',
    },
    ...(PUBLIC_USER_AUTH_ENABLED
      ? ([
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            href: '/profile',
            requireAuth: false,
          },
        ] as NavItem[])
      : []),
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(href)
  }

  const handleClick = (item: NavItem, e: React.MouseEvent) => {
    if (!PUBLIC_USER_AUTH_ENABLED) return
    if (item.requireAuth && status !== 'authenticated') {
      e.preventDefault()
      router.push('/login')
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const showBadge = item.badge && item.badge > 0

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => handleClick(item, e)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 py-1 transition-colors",
                "active:bg-muted/50", // 触摸反馈
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-6 w-6 mb-1",
                  active && "text-primary"
                )} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-destructive rounded-full">
                    {item.badge! > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium truncate w-full text-center",
                active && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

