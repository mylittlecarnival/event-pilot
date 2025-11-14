import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoice_id } = body

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get invoice details with total_cost field
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total_cost, payment_status')
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if invoice is already paid
    if (invoice.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      )
    }

    // Check if there's already a pending payment
    const { data: existingPayment } = await supabase
      .from('invoice_payments')
      .select('payment_hash')
      .eq('invoice_id', invoice_id)
      .eq('status', 'pending')
      .single()

    if (existingPayment) {
      // Return existing payment hash
      return NextResponse.json({
        payment_hash: existingPayment.payment_hash,
        payment_url: `${process.env.NEXT_PUBLIC_SITE_URL}/invoice-payment/${existingPayment.payment_hash}`
      })
    }

    // Generate unique payment hash
    const payment_hash = crypto.randomUUID()

    // Create new payment record
    const { data: payment, error: paymentError } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id,
        payment_hash,
        amount: invoice.total_cost,
        currency: 'USD',
        status: 'pending'
      })
      .select()
      .single()

    if (paymentError || !payment) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json(
        { error: 'Failed to create payment link' },
        { status: 500 }
      )
    }

    const payment_url = `${process.env.NEXT_PUBLIC_SITE_URL}/invoice-payment/${payment_hash}`

    return NextResponse.json({
      payment_hash,
      payment_url
    })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}