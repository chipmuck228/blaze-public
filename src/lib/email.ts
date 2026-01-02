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
    // 增加连接超时设置（60秒）
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 60000, // 60 seconds
    socketTimeout: 60000, // 60 seconds
    // 添加 TLS 选项
    tls: {
      rejectUnauthorized: false, // 允许自签名证书（仅用于开发）
    },
    // 添加重试机制
    pool: true, // 使用连接池
    maxConnections: 1, // 最大连接数
    maxMessages: 3, // 每个连接最多发送3条消息
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
    
    // 可选：验证连接（如果网络不稳定，可以注释掉这行以减少超时风险）
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified')
    } catch (verifyError: any) {
      // 验证失败不影响发送，继续尝试发送
      console.warn('⚠️ SMTP verification failed, but continuing with send:', verifyError.message)
    }
    
    // 发送邮件（带超时保护）
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 60 seconds')), 60000)
      )
    ]) as any
    
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
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      throw new Error(`SMTP connection timeout. Please check your network connection and SMTP settings. Host: ${process.env.SMTP_HOST || 'not set'}, Port: ${process.env.SMTP_PORT || 'not set'}`)
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`SMTP connection refused. Please check your SMTP_HOST and SMTP_PORT settings.`)
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
    
    // 可选：验证连接（如果网络不稳定，可以注释掉这行以减少超时风险）
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified')
    } catch (verifyError: any) {
      // 验证失败不影响发送，继续尝试发送
      console.warn('⚠️ SMTP verification failed, but continuing with send:', verifyError.message)
    }
    
    // 发送邮件（带超时保护）
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 60 seconds')), 60000)
      )
    ]) as any
    
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
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      throw new Error(`SMTP connection timeout. Please check your network connection and SMTP settings. Host: ${process.env.SMTP_HOST || 'not set'}, Port: ${process.env.SMTP_PORT || 'not set'}`)
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`SMTP connection refused. Please check your SMTP_HOST and SMTP_PORT settings.`)
    } else if (error.code === 'EAUTH') {
      throw new Error(`SMTP authentication failed. Please check your SMTP_USER and SMTP_PASSWORD in .env.local. Make sure you're using an app-specific password for Gmail.`)
    } else if (error.message.includes('not configured')) {
      throw error
    } else {
      throw new Error(`Failed to send password reset email: ${error.message}`)
    }
  }
}

// 发送邀请邮件
export async function sendInvitationEmail(
  email: string,
  token: string,
  name: string,
  role: string
) {
  const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/accept?token=${token}`

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `You've been invited to join Blaze Robotics Academy`,
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
            <p>You've been invited to join Blaze Robotics Academy as a <strong>${role}</strong>.</p>
            <p>Please click the button below to set your password and activate your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Set Password
              </a>
            </div>
            <p>Or copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${inviteUrl}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This invitation link will expire in 7 days. If you didn't request this invitation, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  }

  try {
    const transporter = createTransporter()
    
    // 可选：验证连接（如果网络不稳定，可以注释掉这行以减少超时风险）
    // 注意：verify() 会增加连接时间，如果经常超时，可以移除这行
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified')
    } catch (verifyError: any) {
      // 验证失败不影响发送，继续尝试发送
      console.warn('⚠️ SMTP verification failed, but continuing with send:', verifyError.message)
    }
    
    // 发送邮件（带超时保护）
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 60 seconds')), 60000)
      )
    ]) as any
    
    console.log(`✅ Invitation email sent to ${email}`, { messageId: info.messageId })
    return true
  } catch (error: any) {
    console.error('❌ Failed to send invitation email:', {
      error: error.message,
      code: error.code,
      command: error.command,
      address: error.address || process.env.SMTP_HOST,
      port: error.port || process.env.SMTP_PORT,
    })
    
    // 提供更详细的错误信息
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      throw new Error(`SMTP connection timeout. Please check your network connection and SMTP settings. Host: ${process.env.SMTP_HOST || 'not set'}, Port: ${process.env.SMTP_PORT || 'not set'}`)
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`SMTP connection refused. Please check your SMTP_HOST and SMTP_PORT settings.`)
    } else if (error.code === 'EAUTH') {
      throw new Error(`SMTP authentication failed. Please check your SMTP_USER and SMTP_PASSWORD.`)
    } else {
      throw new Error(`Failed to send invitation email: ${error.message}`)
    }
  }
}

// 发送密码通知邮件
export async function sendPasswordNotificationEmail(
  email: string,
  password: string,
  name: string,
  requirePasswordChange: boolean = false
) {
  const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your Blaze Robotics Academy Account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Your Account is Ready</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hello ${name},</p>
            <p>Your account has been created. Here are your login credentials:</p>
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${password}</code></p>
            </div>
            ${requirePasswordChange ? `
              <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> You will be required to change your password on first login.</p>
              </div>
            ` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Log In
              </a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              For security reasons, please change your password after logging in.
            </p>
          </div>
        </body>
      </html>
    `,
  }

  try {
    const transporter = createTransporter()
    
    // 可选：验证连接（如果网络不稳定，可以注释掉这行以减少超时风险）
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified')
    } catch (verifyError: any) {
      // 验证失败不影响发送，继续尝试发送
      console.warn('⚠️ SMTP verification failed, but continuing with send:', verifyError.message)
    }
    
    // 发送邮件（带超时保护）
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 60 seconds')), 60000)
      )
    ]) as any
    
    console.log(`✅ Password notification email sent to ${email}`, { messageId: info.messageId })
    return true
  } catch (error: any) {
    console.error('❌ Failed to send password notification email:', {
      error: error.message,
      code: error.code,
      command: error.command,
      address: error.address || process.env.SMTP_HOST,
      port: error.port || process.env.SMTP_PORT,
    })
    
    // 提供更详细的错误信息
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      throw new Error(`SMTP connection timeout. Please check your network connection and SMTP settings. Host: ${process.env.SMTP_HOST || 'not set'}, Port: ${process.env.SMTP_PORT || 'not set'}`)
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`SMTP connection refused. Please check your SMTP_HOST and SMTP_PORT settings.`)
    } else if (error.code === 'EAUTH') {
      throw new Error(`SMTP authentication failed. Please check your SMTP_USER and SMTP_PASSWORD.`)
    } else {
      throw new Error(`Failed to send password notification email: ${error.message}`)
    }
  }
}

// 发送发票邮件
export async function sendInvoiceEmail(
  email: string,
  name: string,
  invoiceData: {
    invoice_number: string
    date: string
    payment_date?: string | null
    course?: { name: string; description?: string } | null
    category?: { name: string } | null
    series?: { name: string } | null
    location?: { name: string; address?: string } | null
    instance?: { start_date: string; start_time?: string; end_time?: string } | null
    items: Array<{ description: string; quantity: number; unit_price: number; total: number }>
    subtotal: number
    tax: number
    total: number
    currency: string
    payment_status: string
    payment_transaction_id?: string
    stripe_receipt_url?: string | null
  }
) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Invoice ${invoiceData.invoice_number} - ${invoiceData.course?.name || 'Course Enrollment'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Invoice</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">${invoiceData.invoice_number}</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hello ${name},</p>
            <p>Thank you for your payment. Please find your invoice details below:</p>
            
            <!-- Invoice Header -->
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div>
                  <h2 style="margin: 0 0 10px 0; color: #333;">Invoice Details</h2>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Invoice #:</strong> ${invoiceData.invoice_number}</p>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Date:</strong> ${invoiceData.date}</p>
                  ${invoiceData.payment_date ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Payment Date:</strong> ${invoiceData.payment_date}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Status:</strong> <span style="color: ${invoiceData.payment_status === 'paid' ? '#10b981' : '#6b7280'}; font-weight: bold;">${invoiceData.payment_status === 'paid' ? 'Paid' : 'Refunded'}</span></p>
                </div>
              </div>
            </div>

            <!-- Course Details -->
            ${invoiceData.course ? `
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e0e0e0;">
                <h3 style="margin: 0 0 15px 0; color: #333;">Course Information</h3>
                <p style="margin: 5px 0; font-size: 16px; font-weight: bold;">${invoiceData.course.name}</p>
                ${invoiceData.course.description ? `<p style="margin: 10px 0; color: #666; font-size: 14px;">${invoiceData.course.description}</p>` : ''}
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                  ${invoiceData.category ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Category:</strong> ${invoiceData.category.name}</p>` : ''}
                  ${invoiceData.series ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Series:</strong> ${invoiceData.series.name}</p>` : ''}
                  ${invoiceData.location ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Location:</strong> ${invoiceData.location.name}${invoiceData.location.address ? ` - ${invoiceData.location.address}` : ''}</p>` : ''}
                  ${invoiceData.instance?.start_date ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Start Date:</strong> ${new Date(invoiceData.instance.start_date).toLocaleDateString()}${invoiceData.instance.start_time ? ` at ${invoiceData.instance.start_time}` : ''}</p>` : ''}
                </div>
              </div>
            ` : ''}

            <!-- Items Table -->
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Items</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e0e0e0;">Description</th>
                    <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e0e0e0;">Quantity</th>
                    <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e0e0e0;">Unit Price</th>
                    <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e0e0e0;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.items.map((item: any) => `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.description}</td>
                      <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.quantity}</td>
                      <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e0e0e0;">${invoiceData.currency} $${item.unit_price.toFixed(2)}</td>
                      <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">${invoiceData.currency} $${item.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Totals -->
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <div style="display: flex; justify-content: flex-end;">
                <div style="width: 250px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666;">Subtotal:</span>
                    <span style="font-weight: bold;">${invoiceData.currency} $${invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  ${invoiceData.tax > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                      <span style="color: #666;">Tax:</span>
                      <span style="font-weight: bold;">${invoiceData.currency} $${invoiceData.tax.toFixed(2)}</span>
                    </div>
                  ` : ''}
                  <div style="border-top: 2px solid #667eea; padding-top: 10px; margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 18px; font-weight: bold; color: #333;">Total:</span>
                      <span style="font-size: 18px; font-weight: bold; color: #667eea;">${invoiceData.currency} $${invoiceData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            ${invoiceData.payment_transaction_id ? `
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #666; font-size: 12px;"><strong>Transaction ID:</strong> ${invoiceData.payment_transaction_id}</p>
              </div>
            ` : ''}

            ${invoiceData.stripe_receipt_url ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invoiceData.stripe_receipt_url}" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Stripe Receipt
                </a>
              </div>
            ` : ''}

            <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              If you have any questions about this invoice, please contact our support team.
            </p>
          </div>
        </body>
      </html>
    `,
  }

  try {
    const transporter = createTransporter()
    
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified')
    } catch (verifyError: any) {
      console.warn('⚠️ SMTP verification failed, but continuing with send:', verifyError.message)
    }
    
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 60 seconds')), 60000)
      )
    ]) as any
    
    console.log(`✅ Invoice email sent to ${email}`, { messageId: info.messageId })
    return true
  } catch (error: any) {
    console.error('❌ Failed to send invoice email:', {
      error: error.message,
      code: error.code,
      command: error.command,
      address: error.address || process.env.SMTP_HOST,
      port: error.port || process.env.SMTP_PORT,
    })
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      throw new Error(`SMTP connection timeout. Please check your network connection and SMTP settings.`)
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`SMTP connection refused. Please check your SMTP_HOST and SMTP_PORT settings.`)
    } else if (error.code === 'EAUTH') {
      throw new Error(`SMTP authentication failed. Please check your SMTP_USER and SMTP_PASSWORD.`)
    } else if (error.message.includes('not configured')) {
      throw error
    } else {
      throw new Error(`Failed to send invoice email: ${error.message}`)
    }
  }
}

