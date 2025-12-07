# SMTP 邮件发送故障排除

## 常见错误

### 1. `ETIMEDOUT` 或 `ECONNREFUSED` 错误

**错误信息：**
```
Error: connect ETIMEDOUT 74.125.199.109:587
```

**可能原因：**
- SMTP 服务器地址或端口不正确
- 网络防火墙阻止了连接
- SMTP 凭据未正确配置

**解决方案：**

#### Gmail 配置

1. **使用应用专用密码（推荐）**
   - 访问 [Google 账户设置](https://myaccount.google.com/)
   - 启用两步验证（如果尚未启用）
   - 转到"应用专用密码"
   - 生成新的应用专用密码
   - 使用此密码作为 `SMTP_PASSWORD`

2. **检查环境变量**
   确保 `.env.local` 文件包含：
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password-here  # 使用应用专用密码，不是普通密码
   SMTP_FROM=your-email@gmail.com
   ```

3. **尝试不同的端口**
   - 端口 587 (TLS) - 推荐
   - 端口 465 (SSL) - 需要设置 `secure: true`

#### 其他邮件服务配置

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=your-email@yourdomain.com
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM=your-email@yourdomain.com
```

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@outlook.com
```

### 2. `EAUTH` 认证失败

**错误信息：**
```
Error: Invalid login
```

**解决方案：**
- 确保使用应用专用密码（Gmail）
- 检查用户名和密码是否正确
- 确保账户未启用两步验证（或使用应用专用密码）

### 3. 邮件发送成功但用户未收到

**可能原因：**
- 邮件被标记为垃圾邮件
- 邮件被发送到错误的邮箱地址
- 邮件服务提供商的延迟

**解决方案：**
- 检查垃圾邮件文件夹
- 验证收件人邮箱地址
- 等待几分钟后重试

## 测试 SMTP 配置

### 方法 1：使用 Node.js 测试脚本

创建 `test-smtp.js`：

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

async function test() {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // 发送给自己
      subject: 'Test Email',
      text: 'This is a test email from Blaze',
    });
    
    console.log('✅ Test email sent:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP test failed:', error);
  }
}

test();
```

运行：
```bash
node test-smtp.js
```

### 方法 2：检查环境变量

```bash
# 检查环境变量是否设置
node -e "require('dotenv').config({ path: '.env.local' }); console.log('SMTP_HOST:', process.env.SMTP_HOST); console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');"
```

## 开发环境替代方案

如果无法配置 SMTP，可以考虑：

1. **使用邮件测试服务**
   - [Mailtrap](https://mailtrap.io/) - 用于开发测试
   - [Ethereal Email](https://ethereal.email/) - 生成测试账户

2. **暂时禁用邮件验证**
   - 在开发环境中，可以暂时跳过邮件发送
   - 用户注册后直接设置为已验证状态

3. **使用控制台输出**
   - 在开发环境中，将验证链接输出到控制台
   - 手动复制链接进行测试

## 生产环境建议

1. **使用专业的邮件服务**
   - SendGrid
   - Mailgun
   - AWS SES
   - Postmark

2. **配置 SPF 和 DKIM**
   - 提高邮件送达率
   - 减少被标记为垃圾邮件的风险

3. **监控邮件发送**
   - 记录邮件发送日志
   - 设置邮件发送失败警报

## 快速修复检查清单

- [ ] 检查 `.env.local` 文件是否存在
- [ ] 确认 `SMTP_USER` 和 `SMTP_PASSWORD` 已设置
- [ ] 对于 Gmail，使用应用专用密码
- [ ] 检查网络连接和防火墙设置
- [ ] 尝试不同的 SMTP 端口（587 或 465）
- [ ] 验证 SMTP 服务器地址是否正确
- [ ] 检查邮件服务提供商的限制和配额

