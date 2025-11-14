import { createClient } from '@/lib/supabase/server'
import type { Invoice } from '@/types/invoices'

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      organizations!invoices_organization_id_fkey(name),
      contacts!invoices_contact_id_fkey(first_name, last_name, email),
      estimates(estimate_number)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invoices:', error)
    throw new Error(`Failed to fetch invoices: ${error.message}`)
  }

  return data || []
}