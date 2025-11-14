'use client'

export interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  address_full: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_postal_code: string | null
  address_country: string | null
  organization_id: string | null
  organization?: {
    id: string
    name: string
  } | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export async function getContacts(): Promise<Contact[]> {
  try {
    const response = await fetch('/api/contacts')
    if (!response.ok) {
      throw new Error('Failed to fetch contacts')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return []
  }
}

export async function getContact(id: string): Promise<Contact | null> {
  try {
    const response = await fetch(`/api/contacts/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch contact')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching contact:', error)
    return null
  }
}

export async function createContact(contactData: Partial<Contact>): Promise<Contact | null> {
  try {
    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create contact')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating contact:', error)
    return null
  }
}

export async function updateContact(id: string, contactData: Partial<Contact>): Promise<Contact | null> {
  try {
    const response = await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update contact')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error updating contact:', error)
    return null
  }
}

export async function deleteContact(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/contacts/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete contact')
    }
    
    return true
  } catch (error) {
    console.error('Error deleting contact:', error)
    return false
  }
}
