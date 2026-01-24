import { NextResponse } from 'next/server'

// Get password from environment variable
// IMPORTANT: Do NOT use NEXT_PUBLIC_ prefix for passwords - it exposes them to the client!
// In Vercel: Settings → Environment Variables → Add TEACHER_PORTAL_PASSWORD
// Make sure to redeploy after adding environment variables
const TEACHER_PORTAL_PASSWORD = process.env.TEACHER_PORTAL_PASSWORD

export async function POST(request: Request) {
  try {
    // Check if environment variable is set
    if (!TEACHER_PORTAL_PASSWORD) {
      console.error('[Teacher Portal Auth] TEACHER_PORTAL_PASSWORD environment variable is not set!')
      return NextResponse.json(
        { 
          error: 'Server configuration error: Password not configured. Please contact administrator.',
          // Only show detailed error in development
          ...(process.env.NODE_ENV === 'development' && {
            details: 'TEACHER_PORTAL_PASSWORD environment variable is missing. Set it in Vercel Environment Variables and redeploy.'
          })
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Debug logging (only in development or when explicitly enabled)
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TEACHER_PORTAL === 'true') {
      console.log('[Teacher Portal Auth]', {
        hasEnvVar: !!TEACHER_PORTAL_PASSWORD,
        envVarLength: TEACHER_PORTAL_PASSWORD?.length || 0,
        passwordLength: password.length,
        passwordsMatch: password === TEACHER_PORTAL_PASSWORD,
        nodeEnv: process.env.NODE_ENV,
      })
    }

    // Simple password check (in production, use secure password hashing)
    if (password === TEACHER_PORTAL_PASSWORD) {
      // Generate a simple token (in production, use JWT or similar)
      const token = Buffer.from(`teacher_portal_${Date.now()}`).toString('base64')
      
      return NextResponse.json(
        { 
          success: true,
          token,
          message: 'Authentication successful'
        },
        { status: 200 }
      )
    } else {
      // Log failed attempt (without revealing the password)
      console.warn('[Teacher Portal Auth] Invalid password attempt')
      
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Teacher portal auth error:', error)
    return NextResponse.json(
      { error: 'An error occurred during authentication' },
      { status: 500 }
    )
  }
}
