export interface EstimateApproval {
  id: string
  estimate_id: string
  contact_id: string
  approval_hash: string
  status: 'sent' | 'approved' | 'rejected'
  contact_response: string | null
  custom_message: string | null
  due_date: string | null
  signature: SignatureData | null
  sent_at: string
  responded_at: string | null
  created_at: string
  updated_at: string
  // Related data
  estimates?: {
    id: string
    estimate_number: string
    organization_id: string | null
    contact_id: string | null
    status: string
    organization: string
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
    created_at: string
    updated_at: string
    created_by_email: string | null
    updated_by_email: string | null
    organizations?: {
      name: string
      phone: string | null
      address_street: string | null
      address_city: string | null
      address_state: string | null
      address_postal_code: string | null
    } | null
    estimate_items?: {
      id: string
      qty: number | null
      unit_price: number | null
      item_name: string | null
      item_description: string | null
      item_sku: string | null
      item_featured_image: string | null
      is_custom: boolean | null
      is_service_fee: boolean | null
      sort_order: number | null
    }[]
  } | null
  contacts?: {
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_postal_code: string | null
  } | null
}

export interface CreateEstimateApprovalData {
  estimate_id: string
  contact_id: string
  approval_hash: string
  status?: 'sent' | 'approved' | 'rejected'
  custom_message?: string | null
  due_date?: string | null
}

export interface SignatureData {
  typed_name: string
  signature_approved: boolean
  signature_image_data: string
  ip_address?: string
  user_agent?: string
  timestamp: string
  geolocation?: {
    latitude: number
    longitude: number
    accuracy: number
  }
}

export interface UpdateEstimateApprovalData {
  status: 'approved' | 'rejected'
  contact_response?: string | null
  signature?: SignatureData | null
  responded_at?: string
}

export interface EstimateApprovalResponse {
  approval_hash: string
  status: 'approved' | 'rejected'
  contact_response?: string
  signature?: SignatureData
}