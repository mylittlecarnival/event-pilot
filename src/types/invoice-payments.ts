export interface InvoicePayment {
  id: string
  invoice_id: string
  payment_hash: string
  stripe_payment_intent_id: string | null
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'failed'
  paid_at: string | null
  created_at: string
  updated_at: string
  // Related data when fetching
  invoice?: {
    id: string
    invoice_number: string
    total: number
    due_date: string | null
    contact: {
      name: string
      email: string
    }
    organization: {
      name: string
    } | null
    items: Array<{
      id: string
      title: string
      description: string | null
      unit_price: number
      quantity: number
    }>
  }
}

export interface CreateInvoicePaymentRequest {
  invoice_id: string
  amount: number
  currency?: string
}

export interface ProcessPaymentRequest {
  payment_hash: string
  payment_method_id: string
}