'use client'

import { createClient } from '@/lib/supabase/client'
import type {
  Estimate,
  EstimateItem,
  CreateEstimateData,
  CreateEstimateItemData,
  SearchResultItem
} from '@/types/estimates'
import { searchProducts, type Product } from './products'

export async function getEstimates(): Promise<Estimate[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('estimates')
    .select(`
      *,
      organizations!estimates_organization_id_fkey(name),
      contacts!estimates_contact_id_fkey(first_name, last_name, email)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching estimates:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch estimates: ${error.message}`)
  }

  return data || []
}

export async function getEstimate(id: string): Promise<Estimate | null> {
  if (!id) {
    console.warn('getEstimate called without id')
    return null
  }

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('estimates')
    .select(`
      *,
      organizations!estimates_organization_id_fkey(name),
      contacts!estimates_contact_id_fkey(first_name, last_name, email),
      estimate_approvals(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false, referencedTable: 'estimate_approvals' })
    .single()

  if (error) {
    console.error('Error fetching estimate:', {
      id,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to fetch estimate: ${error.message}`)
  }

  return data
}


export async function createEstimate(estimateData: CreateEstimateData): Promise<Estimate | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('estimates')
    .insert(estimateData)
    .select(`
      *,
      organizations!estimates_organization_id_fkey(name),
      contacts!estimates_contact_id_fkey(first_name, last_name, email)
    `)
    .single()

  if (error) {
    console.error('Error creating estimate:', {
      estimateData,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to create estimate: ${error.message}`)
  }

  // Log the creation
  try {
    const { logEstimateAction } = await import('./activity-logs')
    await logEstimateAction(
      data.id,
      'Created',
      {
        estimate_number: data.estimate_number,
        status: data.status,
        organization_id: data.organization_id,
        contact_id: data.contact_id
      }
    )
  } catch (logError) {
    console.error('Failed to log estimate creation:', logError)
    // Don't fail the entire operation if logging fails
  }

  // Note: Service fee will be automatically calculated when items are added via database triggers

  return data
}

export async function updateEstimate(id: string, estimateData: Partial<CreateEstimateData>): Promise<Estimate | null> {
  const supabase = createClient()

  // Get the old values before updating
  let oldValues: Partial<Estimate> = {}
  try {
    const { data: oldData } = await supabase
      .from('estimates')
      .select('*')
      .eq('id', id)
      .single()

    if (oldData) {
      oldValues = oldData
    }
  } catch (error) {
    console.error('Failed to fetch old values for logging:', error)
  }

  const { data, error } = await supabase
    .from('estimates')
    .update(estimateData)
    .eq('id', id)
    .select(`
      *,
      organizations!estimates_organization_id_fkey(name),
      contacts!estimates_contact_id_fkey(first_name, last_name, email)
    `)
    .single()

  if (error) {
    console.error('Error updating estimate:', {
      id,
      estimateData,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to update estimate: ${error.message}`)
  }

  // Log the update with old and new values
  try {
    const { logEstimateAction } = await import('./activity-logs')

    // Build the changes object showing old vs new values
    const changes: Record<string, { old: unknown, new: unknown }> = {}
    Object.keys(estimateData).forEach(key => {
      const oldValue = oldValues[key as keyof Estimate]
      const newValue = data[key as keyof Estimate]
      if (oldValue !== newValue) {
        changes[key] = { old: oldValue, new: newValue }
      }
    })

    await logEstimateAction(
      id,
      'Updated',
      {
        estimate_number: data.estimate_number,
        status: data.status,
        changes: changes,
        updated_fields: Object.keys(estimateData)
      }
    )
  } catch (logError) {
    console.error('Failed to log estimate update:', logError)
    // Don't fail the entire operation if logging fails
  }

  return data
}

export async function deleteEstimate(id: string): Promise<void> {
  const supabase = createClient()
  
  // Get estimate details before deletion for logging
  const { data: estimate } = await supabase
    .from('estimates')
    .select('estimate_number, status')
    .eq('id', id)
    .single()

  // Soft delete the estimate
  const { error } = await supabase
    .from('estimates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting estimate:', {
      id,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to delete estimate: ${error.message}`)
  }

  // Log the deletion
  try {
    const { logEstimateAction } = await import('./activity-logs')
    await logEstimateAction(
      id,
      'Deleted',
      {
        estimate_number: estimate?.estimate_number,
        previous_status: estimate?.status
      }
    )
  } catch (logError) {
    console.error('Failed to log estimate deletion:', logError)
    // Don't fail the entire operation if logging fails
  }
}

export async function getEstimateItems(estimateId: string): Promise<EstimateItem[]> {
  if (!estimateId) {
    console.warn('getEstimateItems called without estimateId')
    return []
  }

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching estimate items:', {
      estimateId,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw new Error(`Failed to fetch estimate items: ${error.message}`)
  }

  return data || []
}

export async function createEstimateItem(itemData: CreateEstimateItemData): Promise<EstimateItem | null> {
  const supabase = createClient()
  
  // Clean the data to remove any potentially problematic fields
  const cleanData = { ...itemData }
  
  // Remove sort_order if it's undefined or if the database doesn't support it
  if (cleanData.sort_order === undefined) {
    delete cleanData.sort_order
  }
  
  // For custom items, don't send product_id to satisfy the check constraint
  // The constraint likely ensures either product_id exists OR is_custom=true, but not both
  if (cleanData.is_custom && cleanData.product_id === null) {
    delete cleanData.product_id
  }
  
  // Log what we're trying to insert
  console.log('Creating estimate item with data:', cleanData)
  
  const { data, error } = await supabase
    .from('estimate_items')
    .insert(cleanData)
    .select()
    .single()

  if (error) {
    console.error('Error creating estimate item:', {
      originalData: itemData,
      cleanedData: cleanData,
      error: error.message || 'Unknown error',
      code: error.code || 'No code',
      details: error.details || 'No details',
      hint: error.hint || 'No hint',
      fullError: JSON.stringify(error, null, 2)
    })
    throw new Error(`Failed to create estimate item: ${error.message || 'Database error'}`)
  }

  console.log('Successfully created estimate item:', data)
  return data
}

export async function updateEstimateItem(id: string, itemData: Partial<CreateEstimateItemData>): Promise<EstimateItem | null> {
  const supabase = createClient()
  
  // Log what we're trying to update
  console.log('Updating estimate item:', { id, itemData })
  
  const { data, error } = await supabase
    .from('estimate_items')
    .update(itemData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating estimate item:', {
      id,
      itemData,
      error: error.message || 'Unknown error',
      code: error.code || 'No code',
      details: error.details || 'No details',
      hint: error.hint || 'No hint',
      fullError: error
    })
    throw new Error(`Failed to update estimate item: ${error.message || 'Database error'}`)
  }

  return data
}

export async function deleteEstimateItem(id: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('estimate_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting estimate item:', {
      id,
      error: error.message || 'Unknown error',
      code: error.code
    })
    throw new Error(`Failed to delete estimate item: ${error.message}`)
  }

  return true
}

export async function searchEstimateItems(query: string): Promise<EstimateItem[]> {
  if (!query || query.length < 2) {
    return []
  }

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('is_custom', false)
    .not('product_id', 'is', null)
    .or(`item_name.ilike.%${query}%,item_description.ilike.%${query}%,item_sku.ilike.%${query}%`)
    .order('item_name', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error searching estimate items:', {
      query,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to search estimate items: ${error.message}`)
  }

  return data || []
}

export async function searchProductsAndEstimateItems(query: string): Promise<SearchResultItem[]> {
  if (!query || query.length < 2) {
    return []
  }

  try {
    const [products, estimateItems] = await Promise.all([
      searchProducts(query, true), // Include internal products for admin interface
      searchEstimateItems(query)
    ])

    // Convert products to SearchResultItem format
    const productResults: SearchResultItem[] = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      unit_price: product.unit_price,
      featured_image: product.featured_image,
      source: 'product' as const
    }))

    // Convert estimate items to SearchResultItem format
    const estimateItemResults: SearchResultItem[] = estimateItems.map(item => ({
      id: item.id,
      name: item.item_name || 'Unnamed Item',
      description: item.item_description,
      sku: item.item_sku,
      unit_price: item.unit_price,
      featured_image: item.item_featured_image,
      source: 'estimate_item' as const,
      product_id: item.product_id,
      is_custom: item.is_custom
    }))

    // Combine and sort results (products first, then estimate items)
    return [...productResults, ...estimateItemResults]
  } catch (error) {
    console.error('Error in combined search:', error)
    throw error
  }
}
