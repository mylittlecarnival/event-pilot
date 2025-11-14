import { createClient } from '@/lib/supabase/server'
import type { EstimateApproval, CreateEstimateApprovalData, SignatureData } from '@/types/estimate-approvals'
import { randomUUID } from 'crypto'
import { logEstimateActionServer } from '@/lib/api/activity-logs-server'

async function getEstimateItemsForApproval(estimateId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching estimate items:', error)
    return []
  }

  return data || []
}

export async function createEstimateApproval(data: CreateEstimateApprovalData): Promise<EstimateApproval> {
  const supabase = await createClient()

  const approvalData = {
    ...data,
    approval_hash: data.approval_hash || randomUUID(),
    status: data.status || 'sent' as const,
    sent_at: new Date().toISOString()
  }

  const { data: approval, error } = await supabase
    .from('estimate_approvals')
    .insert(approvalData)
    .select(`
      *,
      estimates!estimate_approvals_estimate_id_fkey(
        *,
        organizations!estimates_organization_id_fkey(name, phone, address_street, address_city, address_state, address_postal_code)
      ),
      contacts!estimate_approvals_contact_id_fkey(first_name, last_name, email, phone, address_street, address_city, address_state, address_postal_code)
    `)
    .single()

  if (error) {
    console.error('Error creating estimate approval:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to create estimate approval: ${error.message}`)
  }

  return approval
}

export async function getEstimateApprovalByHash(hash: string): Promise<EstimateApproval | null> {
  if (!hash) {
    throw new Error('Approval hash is required')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimate_approvals')
    .select(`
      *,
      estimates!estimate_approvals_estimate_id_fkey(
        *,
        organizations!estimates_organization_id_fkey(name, phone, address_street, address_city, address_state, address_postal_code)
      ),
      contacts!estimate_approvals_contact_id_fkey(first_name, last_name, email, phone, address_street, address_city, address_state, address_postal_code)
    `)
    .eq('approval_hash', hash)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No matching record found
    }
    console.error('Error fetching estimate approval:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch estimate approval: ${error.message}`)
  }

  // Fetch estimate items separately and attach them
  if (data && data.estimates) {
    const estimateItems = await getEstimateItemsForApproval(data.estimates.id)
    data.estimates.estimate_items = estimateItems
  }

  return data
}

export async function getEstimateApprovals(estimateId: string): Promise<EstimateApproval[]> {
  if (!estimateId) {
    throw new Error('Estimate ID is required')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimate_approvals')
    .select(`
      *,
      estimates!estimate_approvals_estimate_id_fkey(
        *,
        organizations!estimates_organization_id_fkey(name, phone, address_street, address_city, address_state, address_postal_code)
      ),
      contacts!estimate_approvals_contact_id_fkey(first_name, last_name, email, phone, address_street, address_city, address_state, address_postal_code)
    `)
    .eq('estimate_id', estimateId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching estimate approvals:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch estimate approvals: ${error.message}`)
  }

  return data || []
}

export async function updateEstimateApprovalStatus(
  hash: string,
  status: 'approved' | 'rejected',
  contactResponse?: string,
  signature?: SignatureData
): Promise<EstimateApproval> {
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
    .from('estimate_approvals')
    .update(updateData)
    .eq('approval_hash', hash)
    .select(`
      *,
      estimates!estimate_approvals_estimate_id_fkey(
        *,
        organizations!estimates_organization_id_fkey(name, phone, address_street, address_city, address_state, address_postal_code)
      ),
      contacts!estimate_approvals_contact_id_fkey(first_name, last_name, email, phone, address_street, address_city, address_state, address_postal_code)
    `)
    .single()

  if (error) {
    console.error('Error updating estimate approval:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to update estimate approval: ${error.message}`)
  }

  return data
}

export async function sendEstimateForApproval(estimateId: string, contactId: string, customMessage?: string, dueDate?: string): Promise<EstimateApproval> {
  if (!estimateId || !contactId) {
    throw new Error('Estimate ID and Contact ID are required')
  }

  // Generate unique approval hash
  const approvalHash = randomUUID()

  // Create the approval record
  const approvalData: CreateEstimateApprovalData = {
    estimate_id: estimateId,
    contact_id: contactId,
    approval_hash: approvalHash,
    status: 'sent',
    custom_message: customMessage || null
  }

  if (dueDate) {
    approvalData.due_date = dueDate
  }

  const approval = await createEstimateApproval(approvalData)

  // Update estimate status to sent for approval
  const supabase = await createClient()
  try {
    await supabase
      .from('estimates')
      .update({ status: 'sent for approval' })
      .eq('id', estimateId)
  } catch (error) {
    console.error('Failed to update estimate status:', error)
    // Don't throw here - approval is created, status update failure shouldn't break the flow
  }

  // Send email with Mailgun
  if (approval.contacts?.email && approval.estimates) {
    try {
      const { sendEstimateApprovalEmail } = await import('@/lib/email/mailgun')

      const approvalLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/approve/${approvalHash}`

      await sendEstimateApprovalEmail({
        to: approval.contacts.email,
        contactName: `${approval.contacts.first_name || ''} ${approval.contacts.last_name || ''}`.trim() || 'Valued Customer',
        estimateNumber: approval.estimates.estimate_number,
        approvalLink,
        eventDate: approval.estimates.event_date || undefined,
        eventType: approval.estimates.event_type || undefined,
        customMessage: customMessage || undefined
      })
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't throw here - approval record is created, email failure shouldn't break the flow
    }
  }

  // Note: Estimate status is automatically updated by database trigger when approval record is created

  // Create activity log entry
  try {
    await logEstimateActionServer(
      estimateId,
      'Sent for Approval',
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