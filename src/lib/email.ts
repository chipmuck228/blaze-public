import nodemailer from 'nodemailer'

// 创建 transporter 的函数，确保使用最新的环境变量
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD

  if (!user || !password) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in .env.local')
  }

  console.log('📧 Creating SMTP transporter:', {
    host,
    port,
    user,
    passwordLength: password.length,
  })

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass: password,
    },
    // 添加连接超时设置
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 30000,
    // 添加 TLS 选项
    tls: {
      rejectUnauthorized: false, // 允许自签名证书（仅用于开发）
    },
  })
}

export async function sendVerificationEmail(email: string, token: string, name: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email?token=${token}`

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Verify Your Email',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Blaze!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hello ${name},</p>
            <p>Thank you for registering with Blaze! Please click the button below to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email
              </a>
            </div>
            <p>Or copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't create this account, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  }

  try {
    const transporter = createTransporter()
    
    // 先验证连接
    await transporter.verify()
    console.log('✅ SMTP connection verified')
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions)
    console.log(`✅ Verification email sent to ${email}`, { messageId: info.messageId })
    return true
  } catch (error: any) {
    console.error('❌ Failed to send verification email:', {
      error: error.message,
      code: error.code,
      command: error.command,
      address: error.address || process.env.SMTP_HOST,
      port: error.port || process.env.SMTP_PORT,
      host: process.env.SMTP_HOST,
    })
    
    // 提供更详细的错误信息
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      throw new Error(`SMTP connection failed. Host: ${process.env.SMTP_HOST || 'not set'}, Port: ${process.env.SMTP_PORT || 'not set'}. Please check your SMTP settings in .env.local and network connection.`)
    } else if (error.code === 'EAUTH') {
      throw new Error(`SMTP authentication failed. Please check your SMTP_USER and SMTP_PASSWORD in .env.local. Make sure you're using an app-specific password for Gmail.`)
    } else if (error.message.includes('not configured')) {
      throw error
    } else {
      throw new Error(`Failed to send verification email: ${error.message}`)
    }
  }
}

export async function sendPasswordResetEmail(email: string, token: string, name: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Reset Password</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hello ${name},</p>
            <p>We received a request to reset your password. Please click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  }

  try {
    const transporter = createTransporter()
    
    // 先验证连接
    await transporter.verify()
    console.log('✅ SMTP connection verified')
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions)
    console.log(`✅ Password reset email sent to ${email}`, { messageId: info.messageId })
    return true
  } catch (error: any) {
    console.error('❌ Failed to send password reset email:', {
      error: error.message,
      code: error.code,
      command: error.command,
      address: error.address || process.env.SMTP_HOST,
      port: error.port || process.env.SMTP_PORT,
      host: process.env.SMTP_HOST,
    })
    
    // 提供更详细的错误信息
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      throw new Error(`SMTP connection failed. Host: ${process.env.SMTP_HOST || 'not set'}, Port: ${process.env.SMTP_PORT || 'not set'}. Please check your SMTP settings in .env.local and network connection.`)
    } else if (error.code === 'EAUTH') {
      throw new Error(`SMTP authentication failed. Please check your SMTP_USER and SMTP_PASSWORD in .env.local. Make sure you're using an app-specific password for Gmail.`)
    } else if (error.message.includes('not configured')) {
      throw error
    } else {
      throw new Error(`Failed to send password reset email: ${error.message}`)
    }
  }
}

