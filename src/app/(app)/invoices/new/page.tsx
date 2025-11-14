'use client'

import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { Heading, Subheading } from '@/components/heading'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { createInvoice, createInvoiceItem } from '@/lib/api/invoices'
import { getDefaultProducts } from '@/lib/api/products'
import { getOrganizations, type Organization } from '@/lib/api/organizations'
import { getContacts, type Contact } from '@/lib/api/contacts'
import { logInvoiceAction } from '@/lib/api/activity-logs'
import type { CreateInvoiceData, CreateInvoiceItemData } from '@/types/invoices'
import { ChevronLeftIcon } from '@heroicons/react/16/solid'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CreateInvoice() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgsData, contactsData] = await Promise.all([
          getOrganizations(),
          getContacts()
        ])
        setOrganizations(orgsData)
        setContacts(contactsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load organizations and contacts')
      }
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const formData = new FormData(e.currentTarget)
      const invoiceData: CreateInvoiceData = {
        organization_id: selectedOrganizationId || null,
        contact_id: selectedContactId || null,
        status: 'draft',
        organization: formData.get('organization') as string || null,
        guests: formData.get('guests') ? parseInt(formData.get('guests') as string) : null,
        event_type: formData.get('event_type') as string || null,
        event_address_street: formData.get('event_address_street') as string || null,
        event_address_unit: formData.get('event_address_unit') as string || null,
        event_city: formData.get('event_city') as string || null,
        event_state: formData.get('event_state') as string || null,
        event_zipcode: formData.get('event_zipcode') as string || null,
        event_county: formData.get('event_county') as string || null,
        event_date: formData.get('event_date') as string || null,
        event_start_time: formData.get('event_start_time') as string || null,
        event_end_time: formData.get('event_end_time') as string || null,
        comment: formData.get('comment') as string || null,
        referred_by: formData.get('referred_by') as string || null,
      }

      console.log('Creating invoice with data:', invoiceData)

      const newInvoice = await createInvoice(invoiceData)
      if (newInvoice) {
        console.log('Invoice created successfully:', newInvoice)

        // Get default products and add them to the invoice
        const defaultProducts = await getDefaultProducts()
        const defaultItemPromises = defaultProducts.map((product, index) => {
          const invoiceItemData: CreateInvoiceItemData = {
            invoice_id: newInvoice.id,
            product_id: product.id,
            qty: 1, // Default quantity
            unit_price: product.unit_price || 0,
            item_name: product.name,
            item_description: product.description,
            item_sku: product.sku,
            item_featured_image: product.featured_image,
            is_custom: false,
            sort_order: index + 1,
          }
          return createInvoiceItem(invoiceItemData)
        })

        // Create default product items
        await Promise.all(defaultItemPromises)

        // Log the creation
        try {
          await logInvoiceAction(
            newInvoice.id,
            'Created',
            {
              invoice_number: newInvoice.invoice_number,
              organization_id: newInvoice.organization_id,
              contact_id: newInvoice.contact_id,
            }
          )
        } catch (logError) {
          console.error('Failed to log invoice creation:', logError)
          // Don't fail the entire operation if logging fails
        }

        setSaved(true)
        // Clear success message after 3 seconds
        setTimeout(() => setSaved(false), 3000)
        // Redirect after a short delay to show success message
        setTimeout(() => {
          router.push(`/invoices/${newInvoice.id}`)
        }, 1500)
      } else {
        setError('Failed to create invoice')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      setError(error instanceof Error ? error.message : 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="max-lg:hidden">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
          <ChevronLeftIcon className="size-4 text-zinc-400 dark:text-zinc-500" />
          Invoices
        </Link>
      </div>
      
      <div className="mt-4 lg:mt-8">
        <Heading>Create Invoice</Heading>
        <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Create a new invoice. Default products will be automatically added.
        </Text>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <Fieldset>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field>
              <Label>Organization</Label>
              <Select
                name="organization_select"
                value={selectedOrganizationId}
                onChange={(e) => setSelectedOrganizationId(e.target.value)}
              >
                <option value="">Select an organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label>Contact</Label>
              <Select
                name="contact_select"
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
              >
                <option value="">Select a contact</option>
                {contacts
                  .filter(contact => !selectedOrganizationId || contact.organization_id === selectedOrganizationId)
                  .map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
        </Fieldset>

        <Divider className="my-10" soft />

        <Fieldset>
          <Subheading>Event Details</Subheading>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field>
              <Label>Event Type</Label>
              <Input name="event_type" placeholder="e.g., Wedding, Corporate Event" />
            </Field>

            <Field>
              <Label>Number of Guests</Label>
              <Input name="guests" type="number" placeholder="e.g., 100" />
            </Field>

            <Field>
              <Label>Event Date</Label>
              <Input name="event_date" type="date" />
            </Field>

            <Field>
              <Label>Start Time</Label>
              <Input name="event_start_time" type="time" />
            </Field>

            <Field>
              <Label>End Time</Label>
              <Input name="event_end_time" type="time" />
            </Field>

            <Field>
              <Label>Referred By</Label>
              <Input name="referred_by" placeholder="e.g., John Doe, Google" />
            </Field>
          </div>
        </Fieldset>

        <Divider className="my-10" soft />

        <Fieldset>
          <Subheading>Event Address</Subheading>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label>Street Address</Label>
              <Input name="event_address_street" placeholder="123 Main Street" />
            </Field>

            <Field>
              <Label>Unit/Suite</Label>
              <Input name="event_address_unit" placeholder="Apt 4B" />
            </Field>

            <Field>
              <Label>City</Label>
              <Input name="event_city" placeholder="New York" />
            </Field>

            <Field>
              <Label>State</Label>
              <Input name="event_state" placeholder="NY" />
            </Field>

            <Field>
              <Label>ZIP Code</Label>
              <Input name="event_zipcode" placeholder="10001" />
            </Field>

            <Field>
              <Label>County</Label>
              <Input name="event_county" placeholder="New York County" />
            </Field>
          </div>
        </Fieldset>

        <Divider className="my-10" soft />

        <Fieldset>
          <Subheading>Additional Information</Subheading>
          <Field>
            <Label>Comments</Label>
            <Textarea name="comment" rows={4} placeholder="Any additional notes or special requirements..." />
          </Field>
        </Fieldset>

        <Divider className="my-10" soft />

        <div className="flex justify-end gap-4">
          {error && (
            <div className="flex items-center text-sm text-red-600 dark:text-red-400">
              <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Invoice Created Successfully
            </div>
          )}
          <Link href="/invoices">
            <Button type="button" plain>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </>
  )
}
