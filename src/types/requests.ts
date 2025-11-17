export interface Request {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  organization_name: string | null
  event_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  accepted_estimate_id: string | null
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
  event_start_time: string | null
  event_end_time: string | null
  referred_by: string | null
  status: string | null
  request_items?: RequestItem[]
}

export interface RequestItem {
  id: string
  request_id: string
  product_id: string
  qty: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  products?: {
    id: string
    name: string
    description: string | null
  }
}
