import { createClient } from '@/lib/supabase/server'
import type { Estimate } from '@/types/estimates'

export async function getEstimates(): Promise<Estimate[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('estimates')
    .select(`
      *,
      organizations!estimates_organization_id_fkey(name),
      contacts!estimates_contact_id_fkey(first_name, last_name, email)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching estimates:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch estimates: ${error.message}`)
  }

  return data || []
}

export async function getEstimate(id: string): Promise<Estimate | null> {
  if (!id) {
    console.warn('getEstimate called without id')
    return null
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('estimates')
    .select(`
      *,
      organizations!estimates_organization_id_fkey(name),
      contacts!estimates_contact_id_fkey(first_name, last_name, email),
      estimate_approvals(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false, referencedTable: 'estimate_approvals' })
    .single()

  if (error) {
    console.error('Error fetching estimate:', {
      id,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch estimate: ${error.message}`)
  }

  return data
}
