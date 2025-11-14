'use client'

export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  address_full: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_postal_code: string | null
  address_country: string | null
  phone: string | null
  website: string | null
}

export async function getOrganizations(): Promise<Organization[]> {
  try {
    const response = await fetch('/api/organizations')
    if (!response.ok) {
      throw new Error('Failed to fetch organizations')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return []
  }
}

export async function getOrganization(id: string): Promise<Organization | null> {
  try {
    const response = await fetch(`/api/organizations/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch organization')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching organization:', error)
    return null
  }
}

export async function createOrganization(organizationData: Partial<Organization>): Promise<Organization | null> {
  try {
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(organizationData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create organization')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating organization:', error)
    return null
  }
}

export async function updateOrganization(id: string, organizationData: Partial<Organization>): Promise<Organization | null> {
  try {
    const response = await fetch(`/api/organizations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(organizationData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update organization')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error updating organization:', error)
    return null
  }
}

export async function deleteOrganization(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/organizations/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete organization')
    }
    
    return true
  } catch (error) {
    console.error('Error deleting organization:', error)
    return false
  }
}
