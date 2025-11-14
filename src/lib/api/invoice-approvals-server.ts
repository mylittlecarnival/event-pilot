import { createClient } from '@/lib/supabase/server'
import type { InvoiceApproval, CreateInvoiceApprovalData, SignatureData } from '@/types/invoice-approvals'
import { randomUUID } from 'crypto'
import { logInvoiceActionServer } from '@/lib/api/activity-logs-server'

async function getInvoiceItemsForApproval(invoiceId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching invoice items:', error)
    return []
  }

  return data || []
}

export async function createInvoiceApproval(data: CreateInvoiceApprovalData): Promise<InvoiceApproval> {
  const supabase = await createClient()

  const approvalData = {
    ...data,
    approval_hash: data.approval_hash || randomUUID(),
    status: data.status || 'sent' as const,
    sent_at: new Date().toISOString()
  }

  const { data: approval, error } = await supabase
    .from('invoice_approvals')
    .insert(approvalData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating invoice approval:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to create invoice approval: ${error.message}`)
  }

  // Fetch related data separately to avoid complex join issues
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      organizations!invoices_organization_id_fkey(name, phone, address_street, address_city, address_state, address_postal_code)
    `)
    .eq('id', approval.invoice_id)
    .single()

  const { data: contact } = await supabase
    .from('contacts')
    .select('first_name, last_name, email, phone, address_street, address_city, address_state, address_postal_code')
    .eq('id', approval.contact_id)
    .single()

  // Attach the related data to the approval
  approval.invoices = invoice
  approval.contacts = contact

  return approval
}

export async function getInvoiceApprovalByHash(hash: string): Promise<InvoiceApproval | null> {
  if (!hash) {
    throw new Error('Approval hash is required')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoice_approvals')
    .select(`
      *,
      invoices!invoice_approvals_invoice_id_fkey(
        *,
        organizations!invoices_organization_id_fkey(name, phone, address_street, address_city, address_state, address_postal_code)
      ),
      contacts!invoice_approvals_contact_id_fkey(first_name, last_name, email, phone, address_street, address_city, address_state, address_postal_code)
    `)
    .eq('approval_hash', hash)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No matching record found
    }
    console.error('Error fetching invoice approval:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch invoice approval: ${error.message}`)
  }

  // Fetch invoice items separately and attach them
  if (data && data.invoices) {
    const invoiceItems = await getInvoiceItemsForApproval(data.invoices.id)
    data.invoices.invoice_items = invoiceItems
  }

  return data
}

export async function getInvoiceApprovals(invoiceId: string): Promise<InvoiceApproval[]> {
  if (!invoiceId) {
    throw new Error('Invoice ID is required')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoice_approvals')
    .select(`
      *,
      invoices!invoice_approvals_invoice_id_fkey(
        *,
        organizations!invoices_organization_id_fkey(name, phone, address_street, address_city, address_state, address_postal_code)
      ),
      contacts!invoice_approvals_contact_id_fkey(first_name, last_name, email, phone, address_street, address_city, address_state, address_postal_code)
    `)
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invoice approvals:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch invoice approvals: ${error.message}`)
  }

  return data || []
}

export async function updateInvoiceApprovalStatus(
  hash: string,
  status: 'approved' | 'rejected',
  contactResponse?: string,
  signature?: SignatureData
): Promise<InvoiceApproval> {
  if (!hash) {
    throw new Error('Approval hash is required')
  }

  const supabase = await createClient()

  const updateData = {
    status,
    responded_at: new Date().toISOString(),
    ...(contactResponse && { contact_response: contactResponse }),
    ...(signature && { signature })
  }

  const { data, error } = await supabase
    .from('invoice_approvals')
    .update(updateData)
    .eq('approval_hash', hash)
    .select(`
      *,
      invoices!invoice_approvals_invoice_id_fkey(
        *,
        organizations!invoices_organization_id_fkey(name, phone, address_street, address_city, address_state, address_postal_code)
      ),
      contacts!invoice_approvals_contact_id_fkey(first_name, last_name, email, phone, address_street, address_city, address_state, address_postal_code)
    `)
    .single()

  if (error) {
    console.error('Error updating invoice approval:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to update invoice approval: ${error.message}`)
  }

  return data
}

export async function sendInvoiceForApproval(invoiceId: string, contactId: string, customMessage?: string, dueDate?: string): Promise<InvoiceApproval> {
  if (!invoiceId || !contactId) {
    throw new Error('Invoice ID and Contact ID are required')
  }

  // Generate unique approval hash
  const approvalHash = randomUUID()

  // Create the approval record
  const approvalData: CreateInvoiceApprovalData = {
    invoice_id: invoiceId,
    contact_id: contactId,
    approval_hash: approvalHash,
    status: 'sent',
    custom_message: customMessage || null
  }

  if (dueDate) {
    approvalData.due_date = dueDate
  }

  const approval = await createInvoiceApproval(approvalData)

  // Update invoice status to payment requested
  const supabase = await createClient()
  try {
    await supabase
      .from('invoices')
      .update({ status: 'payment requested' })
      .eq('id', invoiceId)
  } catch (error) {
    console.error('Failed to update invoice status:', error)
    // Don't throw here - approval is created, status update failure shouldn't break the flow
  }

  // Send email with Mailgun
  if (approval.contacts?.email && approval.invoices) {
    try {
      const { sendInvoiceApprovalEmail } = await import('@/lib/email/mailgun')

      const approvalLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/approve-invoice/${approvalHash}`

      await sendInvoiceApprovalEmail({
        to: approval.contacts.email,
        contactName: `${approval.contacts.first_name || ''} ${approval.contacts.last_name || ''}`.trim() || 'Valued Customer',
        invoiceNumber: approval.invoices.invoice_number,
        approvalLink,
        eventDate: approval.invoices.event_date || undefined,
        eventType: approval.invoices.event_type || undefined,
        customMessage: customMessage || undefined
      })
      console.log('Invoice approval email sent successfully')
    } catch (emailError) {
      console.error('Failed to send invoice approval email:', emailError)
      console.log('Continuing without email - approval record was created successfully')
      // Don't throw here - approval record is created, email failure shouldn't break the flow
    }
  } else {
    console.log('Skipping email - missing contact email or invoice data')
  }

  // Note: Invoice status is automatically updated by database trigger when approval record is created

  // Create activity log entry
  try {
    await logInvoiceActionServer(
      invoiceId,
      'Payment Requested',
      {
        approval_hash: approvalHash,
        contact_email: approval.contacts?.email,
        contact_name: `${approval.contacts?.first_name || ''} ${approval.contacts?.last_name || ''}`.trim()
      }
    )
  } catch (error) {
    console.error('Failed to log approval activity:', error)
  }

  return approval
}
