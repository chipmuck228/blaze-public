import { NextRequest, NextResponse } from 'next/server'
import { stripe, verifyWebhookSignature } from '@/lib/stripe'
import { 
  getEnrollmentByStripeSessionId,
  getEnrollmentByStripePaymentIntentId,
  getEnrollmentById,
  confirmEnrollment,
  markEnrollmentPaymentFailed,
  // New instance_enrollments functions
  getInstanceEnrollmentByStripeSessionId,
  getInstanceEnrollmentByStripePaymentIntentId,
  getInstanceEnrollmentById,
  confirmInstanceEnrollment
} from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

// 使用 Node.js runtime（Webhook 需要处理原始 body）
export const runtime = 'nodejs'

// 禁用 body 解析，我们需要原始 body 来验证签名
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    // 验证 Webhook 签名
    event = verifyWebhookSignature(body, signature, webhookSecret)
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${error.message}` },
      { status: 400 }
    )
  }

  try {
    // 处理不同的事件类型
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // 获取所有相关的注册（通过 session ID）
        const enrollmentIds = session.metadata?.enrollment_ids
          ? JSON.parse(session.metadata.enrollment_ids as string)
          : []

        if (enrollmentIds.length === 0) {
          // 如果没有 metadata，尝试通过 session ID 查找单个注册（优先使用 instance_enrollments）
          let enrollment = await getInstanceEnrollmentByStripeSessionId(session.id)
          if (enrollment) {
            enrollmentIds.push(enrollment.id)
          } else {
            // 回退到旧的 course_enrollments 表
            const oldEnrollment = await getEnrollmentByStripeSessionId(session.id)
            if (oldEnrollment) {
              enrollmentIds.push(oldEnrollment.id)
            }
          }
        }

        if (enrollmentIds.length === 0) {
          console.error(`No enrollments found for session: ${session.id}`)
          break
        }

        // 获取 Payment Intent
        const paymentIntentId = session.payment_intent as string
        if (!paymentIntentId) {
          console.error(`No payment intent found for session: ${session.id}`)
          break
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        
        if (paymentIntent.status === 'succeeded') {
          // 计算每个注册的金额（平均分配或按比例）
          const totalAmount = paymentIntent.amount / 100
          const amountPerEnrollment = totalAmount / enrollmentIds.length

          // 确认所有注册（优先使用 instance_enrollments）
          for (const enrollmentId of enrollmentIds) {
            try {
              // 先尝试使用 instance_enrollments
              const instanceEnrollment = await getInstanceEnrollmentById(enrollmentId)
              if (instanceEnrollment && instanceEnrollment.payment_status !== 'paid') {
                await confirmInstanceEnrollment(
                  instanceEnrollment.id,
                  instanceEnrollment.payer_user_id,
                  paymentIntentId,
                  amountPerEnrollment,
                  paymentIntentId
                )
                console.log(`Instance enrollment ${instanceEnrollment.id} confirmed via checkout.session.completed`)
                continue
              }

              // 回退到旧的 course_enrollments 表
              const enrollment = await getEnrollmentById(enrollmentId)
              if (enrollment && enrollment.payment_status !== 'paid') {
                await confirmEnrollment(
                  enrollment.id,
                  enrollment.user_id,
                  paymentIntentId,
                  amountPerEnrollment,
                  paymentIntentId
                )
                console.log(`Enrollment ${enrollment.id} confirmed via checkout.session.completed`)
              }
            } catch (error: any) {
              console.error(`Failed to confirm enrollment ${enrollmentId}:`, error)
            }
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // 优先使用 instance_enrollments
        let enrollment = await getInstanceEnrollmentByStripePaymentIntentId(paymentIntent.id)
        
        if (!enrollment) {
          // 回退到旧的 course_enrollments 表
          enrollment = await getEnrollmentByStripePaymentIntentId(paymentIntent.id)
        }
        
        if (!enrollment) {
          // 尝试通过 metadata 查找
          const enrollmentIds = paymentIntent.metadata?.enrollment_ids
          if (enrollmentIds) {
            try {
              const ids = JSON.parse(enrollmentIds as string) as string[]
              // 处理多个注册（如果支持批量支付）
              for (const id of ids) {
                // 先尝试 instance_enrollments
                const instanceEnrollment = await getInstanceEnrollmentById(id)
                if (instanceEnrollment && instanceEnrollment.status === 'reserved' && instanceEnrollment.payment_status !== 'paid') {
                  await confirmInstanceEnrollment(
                    instanceEnrollment.id,
                    instanceEnrollment.payer_user_id,
                    paymentIntent.id,
                    paymentIntent.amount / 100 / ids.length,
                    paymentIntent.id
                  )
                  continue
                }

                // 回退到旧的 course_enrollments
                const e = await getEnrollmentById(id)
                if (e && e.status === 'reserved' && e.payment_status !== 'paid') {
                  await confirmEnrollment(
                    e.id,
                    e.user_id,
                    paymentIntent.id,
                    paymentIntent.amount / 100 / ids.length,
                    paymentIntent.id
                  )
                }
              }
            } catch (parseError) {
              console.error('Failed to parse enrollment_ids from metadata:', parseError)
            }
          }
          break
        }

        // 如果支付状态已经是 paid，跳过
        if (enrollment.payment_status === 'paid') {
          console.log(`Enrollment ${enrollment.id} already paid, skipping`)
          break
        }

        // 确认注册（判断是 instance_enrollments 还是 course_enrollments）
        const isInstanceEnrollment = 'payer_user_id' in enrollment
        
        if (isInstanceEnrollment) {
          await confirmInstanceEnrollment(
            enrollment.id,
            enrollment.payer_user_id,
            paymentIntent.id,
            paymentIntent.amount / 100,
            paymentIntent.id
          )
        } else {
          await confirmEnrollment(
            enrollment.id,
            enrollment.user_id,
            paymentIntent.id,
            paymentIntent.amount / 100,
            paymentIntent.id
          )
        }
        console.log(`Enrollment ${enrollment.id} confirmed via payment_intent.succeeded`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // 获取注册记录
        const enrollment = await getEnrollmentByStripePaymentIntentId(paymentIntent.id)
        
        if (enrollment && enrollment.payment_status !== 'failed') {
          await markEnrollmentPaymentFailed(
            enrollment.id,
            paymentIntent.last_payment_error?.message || 'Payment failed'
          )
          console.log(`Enrollment ${enrollment.id} marked as payment failed`)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        
        // 通过 Payment Intent 查找注册（优先使用 instance_enrollments）
        const paymentIntentId = charge.payment_intent as string
        if (paymentIntentId) {
          // 优先使用 instance_enrollments
          let enrollment = await getInstanceEnrollmentByStripePaymentIntentId(paymentIntentId)
          let isInstanceEnrollment = true
          
          if (!enrollment) {
            // 回退到旧的 course_enrollments 表
            enrollment = await getEnrollmentByStripePaymentIntentId(paymentIntentId)
            isInstanceEnrollment = false
          }
          
          if (enrollment) {
            const refund = charge.refunds?.data?.[0]
            if (refund) {
              if (isInstanceEnrollment) {
                // 更新 instance_enrollments
                await supabaseAdmin
                  .from('instance_enrollments')
                  .update({
                    payment_status: 'refunded',
                    status: 'cancelled',
                    refund_transaction_id: refund.id,
                    amount_refunded: refund.amount / 100,
                    refund_processed_at: new Date().toISOString(),
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: 'Refunded via Stripe',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', enrollment.id)
                
                console.log(`Instance enrollment ${enrollment.id} refunded via Stripe`)
              } else {
                // 更新 course_enrollments
                await supabaseAdmin
                  .from('course_enrollments')
                  .update({
                    payment_status: 'refunded',
                    status: 'cancelled',
                    stripe_refund_id: refund.id,
                    refund_amount: refund.amount / 100,
                    refunded_at: new Date().toISOString(),
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: 'Refunded via Stripe',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', enrollment.id)
                
                console.log(`Enrollment ${enrollment.id} refunded via Stripe`)
              }
            }
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // 可选：记录事件到数据库（用于审计）
    if (process.env.STRIPE_LOG_EVENTS === 'true') {
      try {
        const { error } = await supabaseAdmin
          .from('stripe_payment_events')
          .insert({
            stripe_event_id: event.id,
            event_type: event.type,
            stripe_object_id: (event.data.object as any).id,
            payload: event.data.object as any,
            processed: true,
            processed_at: new Date().toISOString(),
          })
        if (error) {
          console.error('Failed to log event:', error)
        }
      } catch (err) {
        console.error('Failed to log event:', err)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: `Webhook processing failed: ${error.message}` },
      { status: 500 }
    )
  }
}

