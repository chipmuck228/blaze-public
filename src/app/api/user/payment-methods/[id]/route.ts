import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { stripe } from "@/lib/stripe"
import { getUserStripeCustomerId } from "@/lib/stripe-customer"

// DELETE: 删除支付方式
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: paymentMethodId } = await params

    // 获取用户的 Stripe Customer ID
    const customerId = await getUserStripeCustomerId(session.user.id)
    
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // 验证支付方式属于该用户
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    
    if (paymentMethod.customer !== customerId) {
      return NextResponse.json(
        { error: "Payment method does not belong to user" },
        { status: 403 }
      )
    }

    // 如果是默认支付方式，先取消默认设置
    const customer = await stripe.customers.retrieve(customerId)
    if (
      typeof customer !== 'deleted' &&
      customer.invoice_settings?.default_payment_method === paymentMethodId
    ) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: null,
        },
      })
    }

    // 删除支付方式
    await stripe.paymentMethods.detach(paymentMethodId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting payment method:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete payment method" },
      { status: 500 }
    )
  }
}

// PATCH: 设置默认支付方式
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: paymentMethodId } = await params

    // 获取用户的 Stripe Customer ID
    const customerId = await getUserStripeCustomerId(session.user.id)
    
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // 验证支付方式属于该用户
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    
    if (paymentMethod.customer !== customerId) {
      return NextResponse.json(
        { error: "Payment method does not belong to user" },
        { status: 403 }
      )
    }

    // 设置默认支付方式
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error setting default payment method:", error)
    return NextResponse.json(
      { error: error.message || "Failed to set default payment method" },
      { status: 500 }
    )
  }
}

