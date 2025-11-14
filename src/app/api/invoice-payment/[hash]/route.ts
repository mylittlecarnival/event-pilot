import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params
    console.log('🔍 Looking for payment with hash:', hash)

    // Use service role for payment API access (public payment pages)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase environment variables' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    // Fetch payment record first
    console.log('📡 Querying invoice_payments table...')
    const { data: payment, error: paymentError } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('payment_hash', hash)
      .eq('status', 'pending') // Only allow pending payments to be accessed
      .single()

    console.log('📊 Payment query result:', { payment, paymentError })

    if (paymentError || !payment) {
      console.log('❌ Payment not found. Error:', paymentError)
      return NextResponse.json(
        { error: 'Payment link not found or already processed' },
        { status: 404 }
      )
    }

    console.log('✅ Payment found successfully:', payment.id)

    // Now fetch invoice details separately
    console.log('📋 Fetching invoice details...')
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_cost,
        contacts!invoices_contact_id_fkey (
          first_name,
          last_name,
          email
        ),
        organizations (
          name
        )
      `)
      .eq('id', payment.invoice_id)
      .single()

    if (invoiceError || !invoice) {
      console.log('❌ Invoice not found. Error:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Fetch invoice items separately
    console.log('📦 Fetching invoice items...')
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('id, item_name, item_description, unit_price, qty')
      .eq('invoice_id', payment.invoice_id)

    if (itemsError) {
      console.log('❌ Items not found. Error:', itemsError)
      // Don't fail the entire request if items can't be loaded
    }

    // Construct the response
    const responsePayment = {
      ...payment,
      invoice: {
        ...invoice,
        items: items || []
      }
    }

    console.log('✅ Full payment data constructed successfully')

    return NextResponse.json({ data: responsePayment })
  } catch (error) {
    console.error('Error fetching payment details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    )
  }
}