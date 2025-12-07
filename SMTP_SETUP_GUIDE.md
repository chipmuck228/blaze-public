# SMTP_PASSWORD 设置指南

## 设置位置

`SMTP_PASSWORD` 需要在项目根目录的 **`.env.local`** 文件中设置。

文件路径：`/Users/zhen/Library/CloudStorage/OneDrive-个人/life-3.ai/Code/next/blaze/.env.local`

## 设置步骤

### 方法 1：使用 Gmail（推荐用于开发）

#### 步骤 1：获取 Gmail 应用专用密码

1. 访问 [Google 账户设置](https://myaccount.google.com/)
2. 点击左侧菜单的 **"安全性"** (Security)
3. 如果尚未启用，先启用 **"两步验证"** (2-Step Verification)
4. 在"两步验证"下方，找到 **"应用专用密码"** (App passwords)
5. 点击 **"应用专用密码"**
6. 选择应用：选择 **"邮件"** (Mail)
7. 选择设备：选择 **"其他"** (Other)，输入 "Blaze App"
8. 点击 **"生成"** (Generate)
9. **复制生成的 16 位密码**（格式类似：`xxxx xxxx xxxx xxxx`）

#### 步骤 2：在 .env.local 文件中设置

打开项目根目录的 `.env.local` 文件，添加或修改以下内容：

```env
# 邮件服务配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # 粘贴刚才复制的应用专用密码（去掉空格或保留空格都可以）
SMTP_FROM=your-email@gmail.com
```

**示例：**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=john.doe@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=john.doe@gmail.com
```

### 方法 2：使用其他邮件服务

#### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-outlook-password
SMTP_FROM=your-email@outlook.com
```

#### SendGrid

1. 注册 [SendGrid](https://sendgrid.com/) 账户
2. 创建 API Key
3. 在 `.env.local` 中设置：

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key-here
SMTP_FROM=your-email@yourdomain.com
```

#### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM=your-email@yourdomain.com
```

## 验证设置

### 方法 1：检查环境变量

运行以下命令检查环境变量是否已设置：

```bash
node -e "require('dotenv').config({ path: '.env.local' }); console.log('SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Not set'); console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '✅ Set' : '❌ Not set');"
```

### 方法 2：测试邮件发送

创建测试脚本 `test-smtp.js`：

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

console.log('SMTP Configuration:');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('User:', process.env.SMTP_USER);
console.log('Password:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'Not set');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function test() {
  try {
    console.log('\nTesting SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    
    console.log('\nSending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'Test Email from Blaze',
      text: 'This is a test email. If you receive this, your SMTP configuration is working!',
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP test failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  }
}

test();
```

运行测试：
```bash
node test-smtp.js
```

## 重要提示

1. **`.env.local` 文件不要提交到 Git**
   - 该文件已在 `.gitignore` 中
   - 包含敏感信息，不要分享给他人

2. **Gmail 必须使用应用专用密码**
   - 不能使用普通 Gmail 密码
   - 必须启用两步验证才能生成应用专用密码

3. **重启开发服务器**
   - 修改 `.env.local` 后，需要重启 Next.js 开发服务器
   - 按 `Ctrl+C` 停止服务器，然后运行 `npm run dev`

4. **密码格式**
   - Gmail 应用专用密码通常是 16 位，可以带空格或不带空格
   - 其他服务的密码按各自要求设置

## 常见问题

### Q: 我找不到"应用专用密码"选项
A: 确保已启用两步验证。如果没有，先启用两步验证，然后才能看到"应用专用密码"选项。

### Q: 应用专用密码在哪里查看？
A: 生成后只显示一次，请立即复制。如果丢失，需要删除旧密码并生成新的。

### Q: 可以使用普通 Gmail 密码吗？
A: 不可以。Gmail 已禁用"不够安全的应用"访问，必须使用应用专用密码。

### Q: 如何知道密码是否正确？
A: 运行测试脚本或尝试注册新用户，如果邮件发送成功，说明配置正确。

