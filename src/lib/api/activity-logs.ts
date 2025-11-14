'use client'

import { createClient } from '@/lib/supabase/client'
import type { ActivityLog, ActivityLogWithDetails } from '@/types/activity-logs'

export async function logEstimateAction(
  estimateId: string,
  actionName: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('log_estimate_action', {
    p_estimate_id: estimateId,
    p_action_name: actionName,
    p_metadata: metadata
  })

  if (error) {
    console.error('Error logging estimate action:', error)
    throw new Error(`Failed to log estimate action: ${error.message}`)
  }

  return data
}

export async function logInvoiceAction(
  invoiceId: string,
  actionName: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('log_invoice_action', {
    p_invoice_id: invoiceId,
    p_action_name: actionName,
    p_metadata: metadata
  })

  if (error) {
    console.error('Error logging invoice action:', error)
    throw new Error(`Failed to log invoice action: ${error.message}`)
  }

  return data
}

export async function logEstimateToInvoiceConversion(
  estimateId: string,
  invoiceId: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('log_estimate_to_invoice_conversion', {
    p_estimate_id: estimateId,
    p_invoice_id: invoiceId,
    p_metadata: metadata
  })

  if (error) {
    console.error('Error logging conversion:', error)
    throw new Error(`Failed to log conversion: ${error.message}`)
  }

  return data
}

export async function getEntityActivityLogs(
  entityType: 'estimate' | 'invoice',
  entityId: string
): Promise<ActivityLog[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('get_entity_activity_logs', {
    p_entity_type: entityType,
    p_entity_id: entityId
  })

  if (error) {
    console.error('Error fetching activity logs:', error)
    throw new Error(`Failed to fetch activity logs: ${error.message}`)
  }

  return data || []
}

export async function getActivityLogsWithDetails(): Promise<ActivityLogWithDetails[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('activity_logs_with_details')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching activity logs with details:', error)
    throw new Error(`Failed to fetch activity logs: ${error.message}`)
  }

  return data || []
}
