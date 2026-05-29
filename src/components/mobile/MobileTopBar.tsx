'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, User, LogIn, LayoutDashboard, CreditCard, FileText } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BlazeLogoIcon } from '@/components/Icons'
import { usePlatform } from '@/hooks/usePlatform'
import { MobileBackButton } from '@/components/mobile/MobileBackButton'
import { PUBLIC_USER_AUTH_ENABLED } from '@/lib/public-user-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function MobileTopBar() {
  const { isNative, isReady } = usePlatform()
  const { data: session, status } = useSession()
  const router = useRouter()

  // 等待平台检测完成，避免 SSR hydration mismatch
  if (!isReady || !isNative) {
    return null
  }

  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* 左侧：返回按钮 + Logo */}
        <div className="flex items-center gap-1">
          <MobileBackButton />
          <Link href="/" className="flex items-center gap-2">
            <BlazeLogoIcon />
            <span className="font-bold text-lg">Blaze Robotics</span>
          </Link>
        </div>

        {/* 右侧：搜索、通知、用户 */}
        <div className="flex items-center gap-2">
          {/* 搜索 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/course-catalog')}
            className="h-9 w-9"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* 通知 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
          >
            <Bell className="h-5 w-5" />
            {/* TODO: 显示未读通知数量 */}
            {/* <Badge className="absolute top-0 right-0 h-4 w-4 p-0 flex items-center justify-center">
              3
            </Badge> */}
          </Button>

          {/* 用户菜单 */}
          {PUBLIC_USER_AUTH_ENABLED ? (
            status === 'authenticated' && session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image || undefined} />
                    <AvatarFallback>
                      {getUserInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/portal">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Portal
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/enrollments">
                    <FileText className="mr-2 h-4 w-4" />
                    Enrollments
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    const { signOut } = await import('next-auth/react')
                    await signOut({ redirect: false })
                    router.push('/')
                    router.refresh()
                  }}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/login')}
              className="h-9"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )
          ) : null}
        </div>
      </div>
    </header>
  )
}

