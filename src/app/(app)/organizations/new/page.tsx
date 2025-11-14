'use client'

import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Heading, Subheading } from '@/components/heading'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Text } from '@/components/text'
import { createOrganization } from '@/lib/api/organizations'
import { ChevronLeftIcon } from '@heroicons/react/16/solid'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// US States data
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

// Phone number formatting function
function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/)
  if (!match) return value

  let result = ''
  if (match[1]) result = `(${match[1]}`
  if (match[2]) result += match[2].length === 3 ? `) ${match[2]}` : match[2]
  if (match[3]) result += `-${match[3]}`
  return result
}

export default function CreateOrganization() {
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      // Get individual address components
      const street = formData.get('address_street') as string || ''
      const city = formData.get('address_city') as string || ''
      const state = formData.get('address_state') as string || ''
      const postalCode = formData.get('address_postal_code') as string || ''
      
      // Build full address in Google Maps format
      const addressParts = [street, city, state, postalCode, 'United States'].filter(Boolean)
      const address_full = addressParts.join(', ')

      const organizationData = {
        name: formData.get('name') as string,
        address_full: address_full || null,
        address_street: street || null,
        address_city: city || null,
        address_state: state || null,
        address_postal_code: postalCode || null,
        address_country: 'United States', // Always set to United States
        phone: phone || null,
        website: formData.get('website') as string || null,
      }

      console.log('Creating organization with data:', organizationData)

      const newOrganization = await createOrganization(organizationData)
      if (newOrganization) {
        console.log('Organization created successfully:', newOrganization)
        router.push(`/organizations/${newOrganization.id}`)
      }
    } catch (error) {
      console.error('Error creating organization:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="max-lg:hidden">
        <Link href="/organizations" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500">
          <ChevronLeftIcon className="size-4 fill-zinc-400" />
          Organizations
        </Link>
      </div>

      <div className="mt-4 lg:mt-8">
        <Heading>Create New Organization</Heading>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl">
        <Divider className="my-10 mt-6" />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Organization Name</Subheading>
            <Text>The name of the organization as it will appear in your system.</Text>
          </div>
          <div>
            <Input aria-label="Organization Name" name="name" required />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Street Address</Subheading>
            <Text>The street address of the organization.</Text>
          </div>
          <div>
            <Input aria-label="Street Address" name="address_street" />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>City</Subheading>
            <Text>The city where the organization is located.</Text>
          </div>
          <div>
            <Input aria-label="City" name="address_city" />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>State</Subheading>
            <Text>The state where the organization is located.</Text>
          </div>
          <div>
            <Select name="address_state" defaultValue="CA" required>
              <option value="">Select a state</option>
              {US_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Postal Code</Subheading>
            <Text>The postal or ZIP code of the organization.</Text>
          </div>
          <div>
            <Input aria-label="Postal Code" name="address_postal_code" />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Phone Number</Subheading>
            <Text>The primary phone number for the organization.</Text>
          </div>
          <div>
            <Input 
              aria-label="Phone Number" 
              name="phone" 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="(619) 980-9839"
              maxLength={14}
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Website</Subheading>
            <Text>The organization&apos;s website URL.</Text>
          </div>
          <div>
            <Input 
              aria-label="Website" 
              name="website" 
              type="url" 
              placeholder="https://example.com"
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <div className="flex justify-end gap-4">
          <Link href="/organizations">
            <Button type="button" plain>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Organization'}
          </Button>
        </div>
      </form>
    </>
  )
}
