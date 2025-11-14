export interface Disclosure {
  id: string
  title: string
  content: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  created_by_email: string | null
  updated_by_email: string | null
}

export interface CreateDisclosureData {
  title: string
  content: string
  is_active?: boolean
  sort_order?: number
}

export interface UpdateDisclosureData {
  title?: string
  content?: string
  is_active?: boolean
  sort_order?: number
}

export interface EstimateDisclosure {
  id: string
  estimate_id: string | null
  invoice_id: string | null
  disclosure_id: string | null
  contact_id: string
  disclosure_title: string
  disclosure_content: string
  is_approved: boolean
  approved_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // Related data
  contacts?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

export interface CreateEstimateDisclosureData {
  estimate_id?: string | null
  invoice_id?: string | null
  disclosure_id?: string | null
  contact_id: string
  disclosure_title: string
  disclosure_content: string
  sort_order?: number
}

export interface UpdateEstimateDisclosureData {
  is_approved?: boolean
  approved_at?: string | null
}

export interface InvoiceApprovalDisclosure {
  id: string
  invoice_id: string
  disclosure_id: string | null
  contact_id: string | null
  disclosure_title: string
  disclosure_content: string
  is_approved: boolean
  approved_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // Related data
  contacts?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

export interface DisclosureSelection {
  id: string
  title: string
  content: string
  selected: boolean
}