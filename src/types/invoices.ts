export interface Invoice {
  id: string
  organization_id: string | null
  contact_id: string | null
  status: string
  payment_status?: string | null
  approved_by: string | null
  rejected_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  invoice_number: string
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
  estimate_id: string | null
  // Relations
  organizations?: {
    name: string
    address_street?: string | null
    address_city?: string | null
    address_state?: string | null
    address_postal_code?: string | null
    phone?: string | null
  } | null
  contacts?: {
    first_name: string | null
    last_name: string | null
    email: string | null
    address_street?: string | null
    address_city?: string | null
    address_state?: string | null
    address_postal_code?: string | null
    phone?: string | null
  } | null
  estimates?: {
    estimate_number: string
  } | null
  invoice_approvals?: {
    id: string
    invoice_id: string
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

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id: string | null
  qty: number | null
  unit_price: number | null
  item_name: string | null
  item_description: string | null
  item_sku: string | null
  item_featured_image: string | null
  is_custom: boolean
  is_service_fee: boolean
  created_at: string
  updated_at: string
  sort_order: number
  created_by_email: string | null
  updated_by_email: string | null
}

export interface CreateInvoiceData {
  organization_id: string | null
  contact_id: string | null
  status: string
  approved_by?: string | null
  rejected_by?: string | null
  invoice_number?: string
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
  estimate_id?: string | null
}

export interface CreateInvoiceItemData {
  invoice_id: string
  product_id?: string | null
  qty: number | null
  unit_price: number | null
  item_name: string | null
  item_description: string | null
  item_sku: string | null
  item_featured_image: string | null
  is_custom: boolean
  is_service_fee?: boolean
  sort_order?: number
}


export interface SearchResultItem {
  id: string
  source: 'product' | 'invoice_item'
  product_id?: string | null
  name: string
  description: string | null
  sku: string | null
  unit_price: number | null
  featured_image: string | null
  is_custom?: boolean
}