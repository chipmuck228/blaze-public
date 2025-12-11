import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"
import { getUserByEmail, verifyPassword, createOrUpdateGoogleUser } from "@/lib/db"

// 开发环境调试
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 NextAuth 配置检查:')
  console.log('  AUTH_SECRET:', process.env.AUTH_SECRET ? '✅ Set' : '❌ Missing')
  console.log('  NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ Missing')
  console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing')
  console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing')
}

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true, // 允许 NextAuth 自动检测 host
  pages: {
    signIn: "/login",
    signOut: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // 处理 Google 登录
      if (account?.provider === "google") {
        try {
          if (!user.email || !user.name) {
            return false
          }

          // 创建或更新用户
          const dbUser = await createOrUpdateGoogleUser(
            user.email,
            user.name,
            user.image || null
          )

          // 更新 user 对象以包含数据库中的用户信息
          user.id = dbUser.id
          ;(user as any).role = dbUser.role || 'user'
          
          return true
        } catch (error) {
          console.error("Error creating/updating Google user:", error)
          return false
        }
      }

      // 其他 provider 允许登录
      return true
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const userRole = (auth?.user as any)?.role || 'user'
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      const isOnAdminLogin = nextUrl.pathname.startsWith("/admin/login")
      const isOnLogin = nextUrl.pathname.startsWith("/login")
      const isOnRegister = nextUrl.pathname.startsWith("/register")

      const isOnCoach = nextUrl.pathname.startsWith("/coach")
      const isOnCoachLogin = nextUrl.pathname.startsWith("/coach/login")

      // 管理员页面保护
      if (isOnAdmin && !isOnAdminLogin) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/admin/login", nextUrl))
        }
        if (userRole !== "admin") {
          return Response.redirect(new URL("/", nextUrl))
        }
        return true
      }

      // Coach 页面保护
      if (isOnCoach && !isOnCoachLogin) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/coach/login", nextUrl))
        }
        if (userRole !== "coach") {
          return Response.redirect(new URL("/", nextUrl))
        }
        return true
      }

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // 重定向未登录用户到登录页
      } else if (isOnLogin || isOnRegister) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl))
        return true
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.image = user.image
        token.role = (user as any).role || 'user'
      }
      if (account?.provider === "google") {
        // Google 登录时的处理
        token.provider = "google"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.image as string | null | undefined
        session.user.role = token.role as string || 'user'
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // 从数据库查找用户
        const user = await getUserByEmail(credentials.email as string)

        if (!user || !user.password_hash) {
          return null
        }

        // 检查邮箱是否已验证（管理员和教练可以跳过此检查）
        const isAdmin = user.role === 'admin'
        const isCoach = user.role === 'coach'
        if (!user.email_verified && !isAdmin && !isCoach) {
          throw new Error("Please verify your email first")
        }

        // 验证密码
        const isValidPassword = await verifyPassword(
          credentials.password as string,
          user.password_hash
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

