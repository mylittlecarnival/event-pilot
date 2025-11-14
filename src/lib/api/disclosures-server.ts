import { createClient } from '@/lib/supabase/server'
import type {
  Disclosure,
  CreateDisclosureData,
  UpdateDisclosureData,
  EstimateDisclosure,
  UpdateEstimateDisclosureData
} from '@/types/disclosures'

// Master disclosure management (server-side)
export async function getDisclosuresServer(): Promise<Disclosure[]> {
  const supabase = await createClient()

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

export async function createDisclosureServer(data: CreateDisclosureData): Promise<Disclosure> {
  const supabase = await createClient()

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

export async function updateDisclosureServer(id: string, data: UpdateDisclosureData): Promise<Disclosure> {
  const supabase = await createClient()

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

// Estimate disclosure management (server-side)
export async function getEstimateDisclosuresServer(estimateId: string): Promise<EstimateDisclosure[]> {
  const supabase = await createClient()

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

export async function updateEstimateDisclosureServer(id: string, data: UpdateEstimateDisclosureData): Promise<EstimateDisclosure> {
  const supabase = await createClient()

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

export async function getEstimateDisclosuresByApprovalHashServer(hash: string): Promise<EstimateDisclosure[]> {
  const supabase = await createClient()

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
  return getEstimateDisclosuresServer(approval.estimate_id)
}

export async function approveEstimateDisclosureServer(id: string): Promise<EstimateDisclosure> {
  return updateEstimateDisclosureServer(id, {
    is_approved: true,
    approved_at: new Date().toISOString()
  })
}

export async function addDisclosuresToEstimateServer(
  estimateId: string,
  contactId: string,
  disclosureIds: string[]
): Promise<EstimateDisclosure[]> {
  const supabase = await createClient()

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