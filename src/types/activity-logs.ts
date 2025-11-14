export interface ActivityLog {
  id: string
  user_id: string
  user_first_name: string | null
  user_last_name: string | null
  action_name: string
  entity_type: 'estimate' | 'invoice'
  entity_id: string
  organization_id: string | null
  contact_id: string | null
  event_date: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ActivityLogWithDetails extends ActivityLog {
  organization_name?: string
  contact_first_name?: string
  contact_last_name?: string
  contact_email?: string
  entity_number?: string
}
