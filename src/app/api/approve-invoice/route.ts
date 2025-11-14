import { NextRequest, NextResponse } from 'next/server'
import { updateInvoiceApprovalStatus } from '@/lib/api/invoice-approvals-server'
import { logInvoiceActionServer } from '@/lib/api/activity-logs-server'
import { sendInvoicePaymentEmail } from '@/lib/email/mailgun'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceApprovalResponse } from '@/types/invoice-approvals'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body: InvoiceApprovalResponse = await request.json()
    const { approval_hash, status, contact_response, signature } = body

    console.log('Received invoice approval response:', { approval_hash, status })

    if (!approval_hash || !status) {
      return NextResponse.json(
        { error: 'Approval hash and status are required' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Update the approval status
    const updatedApproval = await updateInvoiceApprovalStatus(
      approval_hash,
      status,
      contact_response,
      signature
    )

    // Log the activity
    try {
      await logInvoiceActionServer(
        updatedApproval.invoice_id,
        status === 'approved' ? 'Approved by Customer' : 'Rejected by Customer',
        {
          invoice_number: updatedApproval.invoices?.invoice_number,
          contact_name: updatedApproval.contacts 
            ? `${updatedApproval.contacts.first_name || ''} ${updatedApproval.contacts.last_name || ''}`.trim()
            : undefined,
          contact_response: contact_response || undefined,
          approval_hash,
          signature_provided: !!signature
        }
      )
    } catch (logError) {
      console.error('Failed to log invoice approval activity:', logError)
      // Don't fail the entire operation if logging fails
    }

    // If approved, create payment link
    let paymentUrl = null
    if (status === 'approved') {
      console.log('✅ Status is approved, creating payment link for invoice:', updatedApproval.invoice_id)
      try {
        const supabase = await createClient()

        // Get invoice details with total_cost field
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, total_cost, payment_status')
          .eq('id', updatedApproval.invoice_id)
          .single()

        if (invoiceError || !invoice) {
          console.log('❌ Error fetching invoice:', invoiceError)
          throw new Error('Invoice not found')
        }

        console.log('💰 Invoice total_cost:', invoice.total_cost)

        console.log('📄 Invoice data:', { invoice, invoiceError })

        if (!invoiceError && invoice) {
          console.log('💰 Invoice payment status:', invoice.payment_status)
          if (invoice.payment_status !== 'paid') {
            console.log('✅ Invoice is not paid, proceeding with payment creation')
          } else {
            console.log('❌ Invoice is already paid, skipping payment creation')
          }
        } else {
          console.log('❌ Error fetching invoice or invoice not found:', invoiceError)
        }

        if (!invoiceError && invoice && invoice.payment_status !== 'paid') {
          // Check if there's already a pending payment
          console.log('🔍 Checking for existing payment records...')
          const { data: existingPayment, error: existingPaymentError } = await supabase
            .from('invoice_payments')
            .select('payment_hash')
            .eq('invoice_id', invoice.id)
            .eq('status', 'pending')
            .single()

          console.log('🔍 Existing payment check result:', { existingPayment, existingPaymentError })

          let payment_hash
          if (existingPayment) {
            payment_hash = existingPayment.payment_hash
            console.log('♻️ Using existing payment hash:', payment_hash)
          } else {
            // Generate unique payment hash
            payment_hash = crypto.randomUUID()
            console.log('🆕 Generated new payment hash:', payment_hash)

            // Create new payment record
            console.log('💾 Creating payment record with data:', {
              invoice_id: invoice.id,
              payment_hash,
              amount: invoice.total_cost,
              currency: 'USD',
              status: 'pending'
            })

            const { data: newPayment, error: paymentError } = await supabase
              .from('invoice_payments')
              .insert({
                invoice_id: invoice.id,
                payment_hash,
                amount: invoice.total_cost,
                currency: 'USD',
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()

            console.log('💾 Payment record creation result:', { newPayment, paymentError })

            if (paymentError) {
              console.error('❌ Error creating payment record:', paymentError)
              throw paymentError
            } else {
              console.log('✅ Payment record created successfully!')
            }
          }

          paymentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invoice-payment/${payment_hash}`
          console.log('🔗 Generated payment URL:', paymentUrl)

          // Send payment email
          try {
            // Get invoice and contact details for email
            const { data: invoiceWithDetails, error: invoiceDetailsError } = await supabase
              .from('invoices')
              .select(`
                invoice_number,
                event_date,
                event_type,
                contacts!invoices_contact_id_fkey(first_name, last_name, email),
                organizations(name)
              `)
              .eq('id', invoice.id)
              .single()

            if (!invoiceDetailsError && invoiceWithDetails && invoiceWithDetails.contacts) {
              const contact = Array.isArray(invoiceWithDetails.contacts) ? invoiceWithDetails.contacts[0] : invoiceWithDetails.contacts
              const organization = Array.isArray(invoiceWithDetails.organizations) ? invoiceWithDetails.organizations[0] : invoiceWithDetails.organizations
              const contactName = `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim()

              if (contact?.email) {
                await sendInvoicePaymentEmail({
                to: contact?.email || '',
                contactName: contactName || 'Valued Customer',
                invoiceNumber: invoiceWithDetails.invoice_number,
                paymentLink: paymentUrl,
                amount: invoice.total_cost,
                companyName: organization?.name || 'Event Pilot',
                eventDate: invoiceWithDetails.event_date || undefined,
                eventType: invoiceWithDetails.event_type || undefined,
              })
              }
            }
          } catch (emailError) {
            console.error('Error sending payment email:', emailError)
            // Don't fail the approval if email sending fails
          }
        }
      } catch (error) {
        console.error('❌ Error creating payment link:', error)
        // Don't fail the approval if payment link creation fails
      }
    } else {
      console.log('ℹ️ Status is not approved, skipping payment creation. Status:', status)
    }

    console.log('📤 Final response - Payment URL:', paymentUrl)

    return NextResponse.json({
      success: true,
      data: updatedApproval,
      payment_url: paymentUrl
    })

  } catch (error) {
    console.error('Error processing invoice approval response:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process approval response' },
      { status: 500 }
    )
  }
}
