'use client'

import { createClient } from '@/lib/supabase/client'
import type {
  Invoice,
  InvoiceItem,
  CreateInvoiceData,
  CreateInvoiceItemData,
  SearchResultItem
} from '@/types/invoices'

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = createClient()

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

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      organizations!invoices_organization_id_fkey(name, address_street, address_city, address_state, address_postal_code, phone),
      contacts!invoices_contact_id_fkey(first_name, last_name, email, address_street, address_city, address_state, address_postal_code, phone),
      estimates(estimate_number),
      invoice_approvals(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false, referencedTable: 'invoice_approvals' })
    .single()

  if (error) {
    console.error('Error fetching invoice:', error)
    throw new Error(`Failed to fetch invoice: ${error.message}`)
  }

  return data
}

export async function createInvoice(invoiceData: CreateInvoiceData): Promise<Invoice | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoices')
    .insert(invoiceData)
    .select(`
      *,
      organizations!invoices_organization_id_fkey(name),
      contacts!invoices_contact_id_fkey(first_name, last_name, email)
    `)
    .single()

  if (error) {
    console.error('Error creating invoice:', {
      invoiceData,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to create invoice: ${error.message}`)
  }

  // Log the creation
  try {
    const { logInvoiceAction } = await import('./activity-logs')
    await logInvoiceAction(
      data.id,
      'Created',
      {
        invoice_number: data.invoice_number,
        status: data.status,
        organization_id: data.organization_id,
        contact_id: data.contact_id,
        estimate_id: data.estimate_id
      }
    )
  } catch (logError) {
    console.error('Failed to log invoice creation:', logError)
    // Don't fail the entire operation if logging fails
  }

  return data
}

export async function updateInvoice(id: string, invoiceData: Partial<CreateInvoiceData>): Promise<Invoice | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoices')
    .update(invoiceData)
    .eq('id', id)
    .select(`
      *,
      organizations!invoices_organization_id_fkey(name),
      contacts!invoices_contact_id_fkey(first_name, last_name, email)
    `)
    .single()

  if (error) {
    console.error('Error updating invoice:', {
      id,
      invoiceData,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to update invoice: ${error.message}`)
  }

  // Log the update
  try {
    const { logInvoiceAction } = await import('./activity-logs')
    await logInvoiceAction(
      id,
      'Updated',
      {
        invoice_number: data.invoice_number,
        status: data.status,
        updated_fields: Object.keys(invoiceData)
      }
    )
  } catch (logError) {
    console.error('Failed to log invoice update:', logError)
    // Don't fail the entire operation if logging fails
  }

  return data
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = createClient()

  // Soft delete the invoice
  const { error } = await supabase
    .from('invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting invoice:', error)
    throw new Error(`Failed to delete invoice: ${error.message}`)
  }

  // Log the deletion
  try {
    const { logInvoiceAction } = await import('./activity-logs')
    await logInvoiceAction(
      id,
      'Deleted',
      {
        deleted_at: new Date().toISOString()
      }
    )
  } catch (logError) {
    console.error('Failed to log invoice deletion:', logError)
    // Don't fail the entire operation if logging fails
  }
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching invoice items:', error)
    throw new Error(`Failed to fetch invoice items: ${error.message}`)
  }

  return data || []
}

export async function createInvoiceItem(itemData: CreateInvoiceItemData): Promise<InvoiceItem | null> {
  const supabase = createClient()

  console.log('Creating invoice item with data:', itemData)

  const { data, error } = await supabase
    .from('invoice_items')
    .insert(itemData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating invoice item:', {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw new Error(`Failed to create invoice item: ${error.message || JSON.stringify(error)}`)
  }

  return data
}

export async function updateInvoiceItem(id: string, itemData: Partial<InvoiceItem>): Promise<InvoiceItem | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoice_items')
    .update(itemData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating invoice item:', error)
    const errorMessage = error.message || error.details || error.hint || JSON.stringify(error) || 'Unknown error'
    throw new Error(`Failed to update invoice item: ${errorMessage}`)
  }

  return data
}

export async function deleteInvoiceItem(id: string): Promise<boolean> {
  const supabase = createClient()

  console.log('API: Attempting to delete invoice item with ID:', id)

  const { error } = await supabase
    .from('invoice_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('API Error deleting invoice item:', {
      error,
      id,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw new Error(`Failed to delete invoice item: ${error.message}`)
  }

  console.log('API: Successfully deleted invoice item:', id)
  return true
}

export async function searchProductsAndInvoiceItems(query: string): Promise<SearchResultItem[]> {
  const supabase = createClient()

  try {
    // Search products (include internal products for admin interface)
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, name, description, sku, unit_price, featured_image, active, is_internal')
      .eq('active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(10)

    if (productError) {
      console.error('Error searching products:', productError)
    }

    // Search invoice items
    const { data: invoiceItemData, error: invoiceItemError } = await supabase
      .from('invoice_items')
      .select('id, product_id, item_name, item_description, item_sku, unit_price, item_featured_image, is_custom')
      .or(`item_name.ilike.%${query}%,item_description.ilike.%${query}%,item_sku.ilike.%${query}%`)
      .limit(10)

    if (invoiceItemError) {
      console.error('Error searching invoice items:', invoiceItemError)
    }

    // Transform results
    const results: SearchResultItem[] = []

    // Add products
    if (productData) {
      productData.forEach(product => {
        results.push({
          id: product.id,
          source: 'product',
          product_id: product.id,
          name: product.name,
          description: product.description,
          sku: product.sku,
          unit_price: product.unit_price,
          featured_image: product.featured_image,
          is_custom: false
        })
      })
    }

    // Add invoice items
    if (invoiceItemData) {
      invoiceItemData.forEach(item => {
        results.push({
          id: item.id,
          source: 'invoice_item',
          product_id: item.product_id,
          name: item.item_name || 'Unnamed Item',
          description: item.item_description,
          sku: item.item_sku,
          unit_price: item.unit_price,
          featured_image: item.item_featured_image,
          is_custom: item.is_custom
        })
      })
    }

    return results
  } catch (error) {
    console.error('Error in search:', error)
    throw new Error('Failed to search products and invoice items')
  }
}

export async function getInvoicesByEstimateId(estimateId: string): Promise<{id: string, invoice_number: string, status: string}[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status')
    .eq('estimate_id', estimateId)
    .is('deleted_at', null)

  if (error) {
    console.error('Error fetching invoices by estimate ID:', error)
    throw new Error(`Failed to fetch invoices by estimate ID: ${error.message}`)
  }

  return data || []
}

export async function generateInvoiceNumberForEstimate(estimateId: string | null, baseInvoiceNumber: string): Promise<string> {
  if (!estimateId) {
    // If no estimate, return the base number without suffix
    return baseInvoiceNumber
  }

  try {
    // Get all invoices for this estimate
    const existingInvoices = await getInvoicesByEstimateId(estimateId)

    if (existingInvoices.length === 0) {
      // First invoice for this estimate - add -1 suffix
      return `${baseInvoiceNumber}-1`
    }

    // Find the highest suffix number
    const suffixes = existingInvoices
      .map(invoice => {
        const match = invoice.invoice_number.match(/-(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(num => num > 0)

    const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 0
    const nextSuffix = maxSuffix + 1

    return `${baseInvoiceNumber}-${nextSuffix}`
  } catch (error) {
    console.error('Error generating invoice number:', error)
    // Fallback to base number if there's an error
    return baseInvoiceNumber
  }
}

export async function removeEstimateSuffixFromInvoiceNumber(invoiceNumber: string): Promise<string> {
  // Remove the -X suffix if it exists
  return invoiceNumber.replace(/-\d+$/, '')
}