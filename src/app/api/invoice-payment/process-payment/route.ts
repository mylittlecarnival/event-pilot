import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { payment_hash, payment_intent_id } = body

    if (!payment_hash || !payment_intent_id) {
      return NextResponse.json(
        { error: 'Payment hash and payment intent ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Update payment record
    const { data: payment, error: updateError } = await supabase
      .from('invoice_payments')
      .update({
        status: 'paid',
        stripe_payment_intent_id: payment_intent_id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('payment_hash', payment_hash)
      .eq('status', 'pending') // Only update if still pending
      .select()
      .single()

    if (updateError || !payment) {
      console.error('Error updating payment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      )
    }

    // The database trigger will automatically update invoice.payment_status to 'paid'

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}