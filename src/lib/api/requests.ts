'use client'

import { createClient } from '@/lib/supabase/client'
import type { Request } from '@/types/requests'

export async function getRequests(): Promise<Request[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      request_items(
        *,
        products(id, name, description)
      ),
      estimates!requests_accepted_estimate_id_fkey(id, estimate_number)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching requests:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch requests: ${error.message}`)
  }

  return data || []
}

export async function getRequest(id: string): Promise<Request | null> {
  if (!id) {
    console.warn('getRequest called without id')
    return null
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      request_items(
        *,
        products(id, name, description)
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching request:', {
      id,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch request: ${error.message}`)
  }

  return data
}
