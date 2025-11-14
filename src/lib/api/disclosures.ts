import { createClient } from '@/lib/supabase/client'
import type {
  Disclosure,
  CreateDisclosureData,
  UpdateDisclosureData,
  EstimateDisclosure,
  CreateEstimateDisclosureData,
  UpdateEstimateDisclosureData,
  InvoiceApprovalDisclosure
} from '@/types/disclosures'

// Master disclosure management
export async function getDisclosures(): Promise<Disclosure[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('disclosures')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching disclosures:', error)
    throw new Error(`Failed to fetch disclosures: ${error.message}`)
  }

  return data || []
}

export async function getAllDisclosures(): Promise<Disclosure[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('disclosures')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching all disclosures:', error)
    throw new Error(`Failed to fetch all disclosures: ${error.message}`)
  }

  return data || []
}

export async function createDisclosure(data: CreateDisclosureData): Promise<Disclosure> {
  const supabase = createClient()

  const { data: disclosure, error } = await supabase
    .from('disclosures')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating disclosure:', error)
    throw new Error(`Failed to create disclosure: ${error.message}`)
  }

  return disclosure
}

export async function updateDisclosure(id: string, data: UpdateDisclosureData): Promise<Disclosure> {
  const supabase = createClient()

  const { data: disclosure, error } = await supabase
    .from('disclosures')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating disclosure:', error)
    throw new Error(`Failed to update disclosure: ${error.message}`)
  }

  return disclosure
}

export async function deleteDisclosure(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('disclosures')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting disclosure:', error)
    throw new Error(`Failed to delete disclosure: ${error.message}`)
  }
}

// Estimate disclosure management
export async function getEstimateDisclosures(estimateId: string): Promise<EstimateDisclosure[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('estimate_disclosures')
    .select(`
      *,
      contacts!estimate_disclosures_contact_id_fkey(first_name, last_name, email)
    `)
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching estimate disclosures:', error)
    throw new Error(`Failed to fetch estimate disclosures: ${error.message}`)
  }

  return data || []
}

export async function getInvoiceDisclosures(invoiceId: string): Promise<InvoiceApprovalDisclosure[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoice_disclosures')
    .select(`
      *,
      contacts!invoice_disclosures_contact_id_fkey(first_name, last_name, email)
    `)
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching invoice disclosures:', error)
    throw new Error(`Failed to fetch invoice disclosures: ${error.message}`)
  }

  return data || []
}

export async function createEstimateDisclosure(data: CreateEstimateDisclosureData): Promise<EstimateDisclosure> {
  const supabase = createClient()

  const { data: estimateDisclosure, error } = await supabase
    .from('estimate_disclosures')
    .insert(data)
    .select(`
      *,
      contacts!estimate_disclosures_contact_id_fkey(first_name, last_name, email)
    `)
    .single()

  if (error) {
    console.error('Error creating estimate disclosure:', error)
    throw new Error(`Failed to create estimate disclosure: ${error.message}`)
  }

  return estimateDisclosure
}

export async function updateEstimateDisclosure(id: string, data: UpdateEstimateDisclosureData): Promise<EstimateDisclosure> {
  const supabase = createClient()

  const { data: estimateDisclosure, error } = await supabase
    .from('estimate_disclosures')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      contacts!estimate_disclosures_contact_id_fkey(first_name, last_name, email)
    `)
    .single()

  if (error) {
    console.error('Error updating estimate disclosure:', error)
    throw new Error(`Failed to update estimate disclosure: ${error.message}`)
  }

  return estimateDisclosure
}

export async function deleteEstimateDisclosure(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('estimate_disclosures')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting estimate disclosure:', error)
    throw new Error(`Failed to delete estimate disclosure: ${error.message}`)
  }
}

export async function addDisclosuresToEstimate(
  estimateId: string,
  contactId: string,
  disclosureIds: string[]
): Promise<EstimateDisclosure[]> {
  const supabase = createClient()

  // First, delete any existing estimate disclosures for this estimate
  const { error: deleteError } = await supabase
    .from('estimate_disclosures')
    .delete()
    .eq('estimate_id', estimateId)

  if (deleteError) {
    console.error('Error deleting existing estimate disclosures:', deleteError)
    throw new Error(`Failed to delete existing estimate disclosures: ${deleteError.message}`)
  }

  // Get the selected disclosures
  const { data: disclosures, error: fetchError } = await supabase
    .from('disclosures')
    .select('*')
    .in('id', disclosureIds)
    .eq('is_active', true)

  if (fetchError) {
    console.error('Error fetching disclosures:', fetchError)
    throw new Error(`Failed to fetch disclosures: ${fetchError.message}`)
  }

  // Create estimate disclosure records (snapshots)
  const estimateDisclosureData = disclosures.map((disclosure, index) => ({
    estimate_id: estimateId,
    disclosure_id: disclosure.id,
    contact_id: contactId,
    disclosure_title: disclosure.title,
    disclosure_content: disclosure.content,
    sort_order: index,
    is_approved: false
  }))

  const { data, error } = await supabase
    .from('estimate_disclosures')
    .insert(estimateDisclosureData)
    .select(`
      *,
      contacts!estimate_disclosures_contact_id_fkey(first_name, last_name, email)
    `)

  if (error) {
    console.error('Error creating estimate disclosures:', error)
    throw new Error(`Failed to create estimate disclosures: ${error.message}`)
  }

  return data || []
}

export async function addDisclosuresToInvoice(
  invoiceId: string,
  contactId: string,
  disclosureIds: string[]
): Promise<EstimateDisclosure[]> {
  const supabase = createClient()

  // First, delete any existing invoice disclosures for this invoice
  const { error: deleteError } = await supabase
    .from('invoice_disclosures')
    .delete()
    .eq('invoice_id', invoiceId)

  if (deleteError) {
    console.error('Error deleting existing invoice disclosures:', deleteError)
    throw new Error(`Failed to delete existing invoice disclosures: ${deleteError.message}`)
  }

  // Get the selected disclosures
  const { data: disclosures, error: fetchError } = await supabase
    .from('disclosures')
    .select('*')
    .in('id', disclosureIds)
    .eq('is_active', true)

  if (fetchError) {
    console.error('Error fetching disclosures:', fetchError)
    throw new Error(`Failed to fetch disclosures: ${fetchError.message}`)
  }

  // Create invoice disclosure records (snapshots)
  const invoiceDisclosureData = disclosures.map((disclosure, index) => ({
    invoice_id: invoiceId,
    disclosure_id: disclosure.id,
    contact_id: contactId,
    disclosure_title: disclosure.title,
    disclosure_content: disclosure.content,
    sort_order: index,
    is_approved: false
  }))

  const { data, error } = await supabase
    .from('invoice_disclosures')
    .insert(invoiceDisclosureData)
    .select(`
      *,
      contacts!invoice_disclosures_contact_id_fkey(first_name, last_name, email)
    `)

  if (error) {
    console.error('Error creating invoice disclosures:', error)
    throw new Error(`Failed to create invoice disclosures: ${error.message}`)
  }

  return data || []
}

export async function approveEstimateDisclosure(id: string): Promise<EstimateDisclosure> {
  return updateEstimateDisclosure(id, {
    is_approved: true,
    approved_at: new Date().toISOString()
  })
}

export async function getEstimateDisclosuresByApprovalHash(hash: string): Promise<EstimateDisclosure[]> {
  const supabase = createClient()

  // First get the estimate approval to find the estimate_id
  const { data: approval, error: approvalError } = await supabase
    .from('estimate_approvals')
    .select('estimate_id, contact_id')
    .eq('approval_hash', hash)
    .single()

  if (approvalError) {
    console.error('Error fetching approval:', approvalError)
    throw new Error(`Failed to fetch approval: ${approvalError.message}`)
  }

  // Then get the disclosures for that estimate
  return getEstimateDisclosures(approval.estimate_id)
}

export async function getInvoiceDisclosuresByApprovalHash(hash: string): Promise<InvoiceApprovalDisclosure[]> {
  const supabase = createClient()

  // First get the invoice approval to find the invoice_id
  const { data: approval, error: approvalError } = await supabase
    .from('invoice_approvals')
    .select('invoice_id, contact_id')
    .eq('approval_hash', hash)
    .single()

  if (approvalError) {
    console.error('Error fetching invoice approval:', approvalError)
    throw new Error(`Failed to fetch invoice approval: ${approvalError.message}`)
  }

  // Then get the disclosures for that invoice
  return getInvoiceDisclosures(approval.invoice_id)
}

export async function updateInvoiceDisclosure(id: string, data: Partial<InvoiceApprovalDisclosure>): Promise<InvoiceApprovalDisclosure> {
  const supabase = createClient()

  const { data: invoiceDisclosure, error } = await supabase
    .from('invoice_disclosures')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      contacts!invoice_disclosures_contact_id_fkey(first_name, last_name, email)
    `)
    .single()

  if (error) {
    console.error('Error updating invoice disclosure:', error)
    throw new Error(`Failed to update invoice disclosure: ${error.message}`)
  }

  return invoiceDisclosure
}

export async function approveInvoiceDisclosure(id: string, isApproved: boolean): Promise<InvoiceApprovalDisclosure> {
  return updateInvoiceDisclosure(id, {
    is_approved: isApproved,
    approved_at: isApproved ? new Date().toISOString() : null
  })
}