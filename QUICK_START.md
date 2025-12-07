# 快速开始指南

## 1. 安装依赖

```bash
npm install
```

## 2. 设置 Supabase

1. 访问 [Supabase](https://supabase.com/) 创建项目
2. 在 SQL Editor 中运行 `supabase-schema.sql`
3. 获取项目 URL 和 API 密钥

## 3. 配置环境变量

创建 `.env.local` 文件：

```env
# NextAuth
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 邮件服务（Gmail 示例）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com

# Google OAuth（可选）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 4. 运行项目

```bash
npm run dev
```

## 5. 测试功能

- 访问 `http://localhost:3000/register` 注册账号
- 检查邮箱并验证账号
- 访问 `http://localhost:3000/login` 登录
- 测试密码重置功能

## 注意事项

- 确保 Supabase 数据库表已创建
- 配置邮件服务以接收验证邮件
- 生产环境使用 HTTPS

详细配置请参考 `AUTH_SETUP.md`

