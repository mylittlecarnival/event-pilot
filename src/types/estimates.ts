export interface Estimate {
  id: string
  organization_id: string | null
  contact_id: string | null
  status: string
  approved_by: string | null
  rejected_by: string | null
  estimate_number: string
  created_at: string
  created_by_email: string | null
  updated_at: string
  updated_by_email: string | null
  deleted_at: string | null
  // Request fields
  contact_email: string | null
  organization: string | null
  guests: number | null
  event_type: string | null
  event_address_street: string | null
  event_address_unit: string | null
  event_city: string | null
  event_state: string | null
  event_zipcode: string | null
  event_county: string | null
  event_date: string | null
  event_start_time: string | null
  event_end_time: string | null
  comment: string | null
  referred_by: string | null
  // Related data
  organizations?: {
    name: string
  } | null
  contacts?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  estimate_approvals?: {
    id: string
    estimate_id: string
    contact_id: string
    approval_hash: string
    status: 'sent' | 'approved' | 'rejected'
    contact_response: string | null
    custom_message: string | null
    due_date: string | null
    signature: unknown | null
    sent_at: string
    responded_at: string | null
    created_at: string
    updated_at: string
  }[]
}

export interface EstimateItem {
  id: string
  estimate_id: string
  product_id: string | null
  qty: number
  unit_price: number | null
  item_name: string | null
  item_description: string | null
  item_sku: string | null
  item_featured_image: string | null
  is_custom: boolean
  is_service_fee?: boolean
  fee_type?: string | null
  fee_rate?: number | null
  service_fee_base_amount?: number | null
  sort_order?: number
  created_at: string
  created_by_email: string | null
  updated_at: string
  updated_by_email: string | null
}

export interface CreateEstimateData {
  organization_id?: string | null
  contact_id?: string | null
  status?: string
  approved_by?: string | null
  rejected_by?: string | null
  organization?: string | null
  guests?: number | null
  event_type?: string | null
  event_address_street?: string | null
  event_address_unit?: string | null
  event_city?: string | null
  event_state?: string | null
  event_zipcode?: string | null
  event_county?: string | null
  event_date?: string | null
  event_start_time?: string | null
  event_end_time?: string | null
  comment?: string | null
  referred_by?: string | null
}

export interface CreateEstimateItemData {
  estimate_id: string
  product_id?: string | null
  qty: number
  unit_price?: number | null
  item_name?: string | null
  item_description?: string | null
  item_sku?: string | null
  item_featured_image?: string | null
  is_custom?: boolean
  is_service_fee?: boolean
  fee_type?: string | null
  fee_rate?: number | null
  service_fee_base_amount?: number | null
  sort_order?: number
}

// Union type for search results that can be either products or estimate items
export interface SearchResultItem {
  id: string
  name: string
  description: string | null
  sku: string | null
  unit_price: number | null
  featured_image: string | null
  source: 'product' | 'estimate_item'
  // Additional fields for estimate items
  product_id?: string | null
  is_custom?: boolean
}