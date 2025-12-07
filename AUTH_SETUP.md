# 认证系统配置说明

本项目已集成 NextAuth.js (auth.js) v5 和 Supabase 数据库，支持完整的认证和授权功能。

## 功能特性

- ✅ 邮箱/密码注册（bcrypt 加密）
- ✅ 邮箱/密码登录
- ✅ Google OAuth 登录/注册
- ✅ 邮箱验证
- ✅ 密码重置
- ✅ Session 管理
- ✅ 路由保护
- ✅ Supabase 数据库集成

## 环境变量配置

在项目根目录创建 `.env.local` 文件，添加以下环境变量：

```env
# NextAuth.js 配置
# 生成密钥命令: openssl rand -base64 32
AUTH_SECRET=your-secret-key-here

# NextAuth.js URL（开发环境）
NEXTAUTH_URL=http://localhost:3000

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google OAuth 配置（可选）
# 在 https://console.cloud.google.com/ 创建 OAuth 2.0 客户端 ID
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 邮件服务配置（用于发送验证邮件和密码重置邮件）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

## Supabase 设置步骤

1. 访问 [Supabase](https://supabase.com/) 并创建账户
2. 创建新项目
3. 在项目设置中找到 API 密钥：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（保密！）
4. 在 Supabase SQL Editor 中运行 `supabase-schema.sql` 文件创建数据库表

## 数据库表结构

运行 `supabase-schema.sql` 文件将创建以下表：

- `users` - 用户表（包含邮箱验证信息）
- `password_reset_tokens` - 密码重置令牌表

## 邮件服务配置

### Gmail 配置

1. 启用 Gmail 的"应用专用密码"：
   - 访问 [Google 账户设置](https://myaccount.google.com/)
   - 安全 → 两步验证 → 应用专用密码
   - 生成新的应用专用密码
2. 使用应用专用密码作为 `SMTP_PASSWORD`

### 其他邮件服务

可以配置任何支持 SMTP 的邮件服务（SendGrid、Mailgun、AWS SES 等）

## Google OAuth 配置步骤（可选）

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端 ID：
   - 转到 "凭据" > "创建凭据" > "OAuth 客户端 ID"
   - 应用类型选择 "Web 应用"
   - 授权重定向 URI 添加：`http://localhost:3000/api/auth/callback/google`
5. 复制客户端 ID 和客户端密钥到 `.env.local`

## 生成 AUTH_SECRET

运行以下命令生成一个安全的密钥：

```bash
openssl rand -base64 32
```

## 使用示例

### 在组件中获取会话

```tsx
import { useSession } from "next-auth/react"

export default function Component() {
  const { data: session, status } = useSession()
  
  if (status === "loading") return <p>加载中...</p>
  if (status === "unauthenticated") return <p>未登录</p>
  
  return <p>欢迎, {session?.user?.name}!</p>
}
```

### 在服务器组件中获取会话

```tsx
import { auth } from "@/auth"

export default async function ServerComponent() {
  const session = await auth()
  
  if (!session) {
    return <p>未登录</p>
  }
  
  return <p>欢迎, {session.user?.name}!</p>
}
```

### 登出

```tsx
import { signOut } from "next-auth/react"

<button onClick={() => signOut()}>登出</button>
```

## API 路由

### 认证相关
- `POST /api/auth/register` - 用户注册（自动发送验证邮件）
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js 认证处理

### 邮箱验证
- `GET /api/auth/verify-email?token=xxx` - 验证邮箱
- `POST /api/auth/verify-email` - 验证邮箱（POST 方式）
- `POST /api/auth/resend-verification` - 重新发送验证邮件

### 密码重置
- `POST /api/auth/forgot-password` - 发送密码重置邮件
- `GET /api/auth/reset-password?token=xxx` - 验证重置令牌
- `POST /api/auth/reset-password` - 重置密码

## 页面路由

- `/login` - 登录页面
- `/register` - 注册页面
- `/verify-email?token=xxx` - 邮箱验证页面
- `/forgot-password` - 忘记密码页面
- `/reset-password?token=xxx` - 重置密码页面

## 安全特性

✅ **密码加密**：使用 bcrypt 加密存储密码（10 轮加密）
✅ **邮箱验证**：注册后必须验证邮箱才能登录
✅ **令牌过期**：验证令牌和重置令牌都有过期时间
✅ **一次性令牌**：密码重置令牌使用后即失效
✅ **Row Level Security**：Supabase RLS 保护数据安全

## 注意事项

⚠️ **重要**：
1. 确保 `SUPABASE_SERVICE_ROLE_KEY` 保密，不要提交到代码仓库
2. 生产环境必须配置真实的邮件服务
3. 建议使用 HTTPS
4. 定期清理过期的验证令牌和重置令牌

