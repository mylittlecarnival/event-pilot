'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Switch, SwitchField } from '@/components/switch'
import { Field, Label } from '@/components/fieldset'
import { createEstimate, createEstimateItem } from '@/lib/api/estimates'
import { getOrganizations, type Organization } from '@/lib/api/organizations'
import { getContacts, type Contact } from '@/lib/api/contacts'
import { getDefaultProducts } from '@/lib/api/products'
import type { CreateEstimateData, CreateEstimateItemData } from '@/types/estimates'

interface NewEstimateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (estimateId: string) => void
}

export function NewEstimateModal({ isOpen, onClose, onSuccess }: NewEstimateModalProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isOrganization, setIsOrganization] = useState(false)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [eventDate, setEventDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load organizations and contacts when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const [orgsData, contactsData] = await Promise.all([
            getOrganizations(),
            getContacts()
          ])
          setOrganizations(orgsData)
          setContacts(contactsData)
        } catch (error) {
          console.error('Error loading data:', error)
          setError('Failed to load organizations and contacts')
        }
      }
      loadData()
    }
  }, [isOpen])

  // Filter contacts by selected organization
  const filteredContacts = isOrganization && selectedOrganizationId
    ? contacts.filter(contact => contact.organization_id === selectedOrganizationId)
    : contacts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedContactId) {
      setError('Please select a contact')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const estimateData: CreateEstimateData = {
        organization_id: isOrganization ? selectedOrganizationId || null : null,
        contact_id: selectedContactId,
        status: 'draft',
        organization: isOrganization ? 'yes' : 'no',
        event_date: eventDate || null,
        event_type: null,
        guests: null
      }

      const newEstimate = await createEstimate(estimateData)
      if (newEstimate) {
        // Add default products to the new estimate
        try {
          const defaultProducts = await getDefaultProducts()
          console.log('Adding default products to new estimate:', defaultProducts.length)

          if (defaultProducts.length > 0) {
            const defaultItemPromises = defaultProducts.map((product, index) => {
              const estimateItemData: CreateEstimateItemData = {
                estimate_id: newEstimate.id,
                product_id: product.id,
                qty: 1,
                unit_price: product.unit_price || 0,
                item_name: product.name,
                item_description: product.description,
                item_sku: product.sku,
                item_featured_image: product.featured_image,
                is_custom: false,
                sort_order: index + 1,
              }
              return createEstimateItem(estimateItemData)
            })

            await Promise.all(defaultItemPromises)
            console.log('Successfully added default products to new estimate')
          }
        } catch (error) {
          console.error('Error adding default products:', error)
          // Don't fail the whole process if default products fail
        }

        // Reset form
        setIsOrganization(false)
        setSelectedOrganizationId('')
        setSelectedContactId('')
        setEventDate('')
        setError(null)

        // Close modal and redirect (without the ?new=true since products are already added)
        onClose()
        onSuccess(newEstimate.id)
      }
    } catch (error) {
      console.error('Error creating estimate:', error)
      setError(error instanceof Error ? error.message : 'Failed to create estimate')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      // Reset form on close
      setIsOrganization(false)
      setSelectedOrganizationId('')
      setSelectedContactId('')
      setEventDate('')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogTitle>Create New Estimate</DialogTitle>
      <DialogDescription>
        Create a new estimate by selecting a contact and providing basic event details.
      </DialogDescription>

      <form onSubmit={handleSubmit}>
        <DialogBody>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Bill To Type */}
            <SwitchField>
              <Label>Bill to Organization</Label>
              <Switch
                checked={isOrganization}
                onChange={setIsOrganization}
              />
            </SwitchField>

            {/* Organization Selection */}
            {isOrganization && (
              <Field>
                <Label>Organization *</Label>
                <Select
                  value={selectedOrganizationId}
                  onChange={(e) => {
                    setSelectedOrganizationId(e.target.value)
                    setSelectedContactId('') // Reset contact when org changes
                  }}
                  required
                >
                  <option value="">Select organization...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {/* Contact Selection */}
            <Field>
              <Label>Contact *</Label>
              <Select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                required
              >
                <option value="">Select contact...</option>
                {filteredContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                    {contact.email && ` (${contact.email})`}
                  </option>
                ))}
              </Select>
              {isOrganization && selectedOrganizationId && filteredContacts.length === 0 && (
                <p className="mt-1 text-sm text-zinc-500">
                  No contacts found for this organization
                </p>
              )}
            </Field>

            {/* Event Date */}
            <Field>
              <Label>Event Date</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </Field>

          </div>
        </DialogBody>

        <DialogActions>
          <Button
            type="button"
            plain
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedContactId}
          >
            {loading ? 'Creating...' : 'Create Estimate'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}