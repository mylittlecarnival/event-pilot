import { createClient } from '@/lib/supabase/server'
import type { RequestItem } from '@/types/requests'

export async function deleteRequest(id: string): Promise<void> {
  if (!id) {
    throw new Error('Request ID is required')
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  // First, soft delete all request_items associated with this request
  const { error: itemsError } = await supabase
    .from('request_items')
    .update({ deleted_at: now })
    .eq('request_id', id)

  if (itemsError) {
    console.error('Error deleting request items:', {
      error: itemsError.message || 'Unknown error',
      code: itemsError.code,
      details: itemsError.details
    })
    throw new Error(`Failed to delete request items: ${itemsError.message}`)
  }

  // Then, soft delete the request itself
  const { error } = await supabase
    .from('requests')
    .update({ deleted_at: now })
    .eq('id', id)

  if (error) {
    console.error('Error deleting request:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to delete request: ${error.message}`)
  }
}

export async function findContactByEmail(email: string) {
  if (!email) {
    return null
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', email)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error finding contact by email:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to find contact: ${error.message}`)
  }

  return data
}

export async function createOrganization(name: string) {
  if (!name) {
    throw new Error('Organization name is required')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: name,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating organization:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to create organization: ${error.message}`)
  }

  return data
}

export async function createContact(contactData: {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  organization_id?: string | null
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .insert(contactData)
    .select()
    .single()

  if (error) {
    console.error('Error creating contact:', {
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details
    })
    throw new Error(`Failed to create contact: ${error.message}`)
  }

  return data
}

export async function convertRequestToEstimate(requestId: string): Promise<string> {
  if (!requestId) {
    throw new Error('Request ID is required')
  }

  const supabase = await createClient()

  // 1. Get the request with its items
  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select(`
      *,
      request_items(
        *,
        products(
          id,
          name,
          description,
          unit_price,
          sku,
          featured_image
        )
      )
    `)
    .eq('id', requestId)
    .is('deleted_at', null)
    .single()

  if (requestError) {
    console.error('Error fetching request:', requestError)
    throw new Error(`Failed to fetch request: ${requestError.message}`)
  }

  if (!request) {
    throw new Error('Request not found')
  }

  // 2. Check if contact exists by email
  let contact = null
  if (request.contact_email) {
    contact = await findContactByEmail(request.contact_email)
  }

  // 3. Create organization if needed (only if organization='yes' AND organization_name exists)
  let organizationId = null
  if (request.organization === 'yes' && request.organization_name) {
    const org = await createOrganization(request.organization_name)
    organizationId = org.id
  }

  // 4. Create contact if it doesn't exist
  if (!contact) {
    contact = await createContact({
      first_name: request.first_name,
      last_name: request.last_name,
      email: request.contact_email,
      phone: request.phone,
      organization_id: organizationId,
    })
  } else if (organizationId && !contact.organization_id) {
    // Update existing contact with organization if they don't have one
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ organization_id: organizationId })
      .eq('id', contact.id)

    if (updateError) {
      console.error('Error updating contact organization:', updateError)
    }
  }

  // 5. Create the estimate
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .insert({
      contact_id: contact.id,
      organization_id: organizationId,
      organization: request.organization || 'no',
      guests: request.guests,
      event_type: request.event_type,
      event_address_street: request.event_address_street,
      event_address_unit: request.event_address_unit,
      event_city: request.event_city,
      event_state: request.event_state,
      event_zipcode: request.event_zipcode,
      event_county: request.event_county,
      event_date: request.event_date,
      event_start_time: request.event_start_time,
      event_end_time: request.event_end_time,
      comment: request.notes, // Map notes to comment
      referred_by: request.referred_by,
      status: 'draft',
    })
    .select()
    .single()

  if (estimateError) {
    console.error('Error creating estimate:', estimateError)
    throw new Error(`Failed to create estimate: ${estimateError.message}`)
  }

  // 6. Create estimate items from request items
  if (request.request_items && request.request_items.length > 0) {
    const estimateItems = request.request_items.map((item: RequestItem, index: number) => ({
      estimate_id: estimate.id,
      product_id: item.product_id,
      qty: item.qty,
      unit_price: item.products?.unit_price || null,
      item_name: item.products?.name || null,
      item_description: item.products?.description || null,
      item_sku: item.products?.sku || null,
      item_featured_image: item.products?.featured_image || null,
      is_custom: false,
      sort_order: index,
    }))

    const { error: itemsError } = await supabase
      .from('estimate_items')
      .insert(estimateItems)

    if (itemsError) {
      console.error('Error creating estimate items:', itemsError)
      throw new Error(`Failed to create estimate items: ${itemsError.message}`)
    }
  }

  // 7. Update request status to 'accepted' and set accepted_estimate_id
  const { error: updateRequestError } = await supabase
    .from('requests')
    .update({
      status: 'accepted',
      accepted_estimate_id: estimate.id
    })
    .eq('id', requestId)

  if (updateRequestError) {
    console.error('Error updating request status:', updateRequestError)
    // Don't throw here, estimate was created successfully
  }

  return estimate.id
}
