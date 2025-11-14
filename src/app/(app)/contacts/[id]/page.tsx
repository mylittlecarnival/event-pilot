'use client'

import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Heading, Subheading } from '@/components/heading'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Text } from '@/components/text'
import { getContact, updateContact, type Contact } from '@/lib/api/contacts'
import { getOrganizations, type Organization } from '@/lib/api/organizations'
import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeftIcon } from '@heroicons/react/16/solid'

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

type Props = {
  params: Promise<{ id: string }>
}

export default function ContactEdit({ params }: Props) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(true)
  const router = useRouter()
  const [id, setId] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resolvedParams = await params
        setId(resolvedParams.id)
        
        // Fetch contact and organizations in parallel
        const [contactData, organizationsData] = await Promise.all([
          getContact(resolvedParams.id),
          getOrganizations()
        ])
        
        if (!contactData) {
          router.push('/contacts')
          return
        }
        
        setContact(contactData)
        setPhone(contactData.phone || '')
        setOrganizations(organizationsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/contacts')
      } finally {
        setLoading(false)
        setLoadingOrganizations(false)
      }
    }
    fetchData()
  }, [params, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!contact) return

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

      const contactData = {
        first_name: formData.get('first_name') as string,
        last_name: formData.get('last_name') as string,
        email: formData.get('email') as string,
        phone: phone || null,
        address_full: address_full || null,
        address_street: street || null,
        address_city: city || null,
        address_state: state || null,
        address_postal_code: postalCode || null,
        address_country: 'United States', // Always set to United States
        organization_id: formData.get('organization_id') as string || null,
      }

      console.log('Updating contact with data:', contactData)

      const updatedContact = await updateContact(id, contactData)
      if (updatedContact) {
        console.log('Contact updated successfully:', updatedContact)
        router.push(`/contacts/${id}`)
      }
    } catch (error) {
      console.error('Error updating contact:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center gap-4">
          <Link href="/contacts" className="text-zinc-600 hover:text-zinc-900 transition-colors">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <Heading>Loading...</Heading>
        </div>
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">
            Loading contact...
          </div>
        </div>
      </>
    )
  }

  if (!contact) {
    return (
      <>
        <div className="flex items-center gap-4">
          <Link href="/contacts" className="text-zinc-600 hover:text-zinc-900 transition-colors">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <Heading>Contact not found</Heading>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-lg:hidden">
        <Link href="/contacts" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500">
          <ChevronLeftIcon className="size-4 fill-zinc-400" />
          Contacts
        </Link>
      </div>

      <div className="mt-4 lg:mt-8">
        <Heading>{contact.first_name} {contact.last_name}</Heading>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl">
        <Divider className="my-10 mt-6" />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>First Name</Subheading>
            <Text>The contact&apos;s first name.</Text>
          </div>
          <div>
            <Input aria-label="First Name" name="first_name" defaultValue={contact.first_name} required />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Last Name</Subheading>
            <Text>The contact&apos;s last name.</Text>
          </div>
          <div>
            <Input aria-label="Last Name" name="last_name" defaultValue={contact.last_name} required />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Email Address</Subheading>
            <Text>The contact&apos;s primary email address.</Text>
          </div>
          <div>
            <Input aria-label="Email Address" name="email" type="email" defaultValue={contact.email} required />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Phone Number</Subheading>
            <Text>The contact&apos;s primary phone number.</Text>
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
            <Subheading>Organization</Subheading>
            <Text>Select the organization this contact belongs to.</Text>
          </div>
          <div>
            <Select name="organization_id" defaultValue={contact.organization_id || ''} disabled={loadingOrganizations}>
              <option value="">No organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <Divider className="my-10" soft />


        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Street Address</Subheading>
            <Text>The contact&apos;s street address.</Text>
          </div>
          <div>
            <Input aria-label="Street Address" name="address_street" defaultValue={contact.address_street || ''} />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>City</Subheading>
            <Text>The city where the contact is located.</Text>
          </div>
          <div>
            <Input aria-label="City" name="address_city" defaultValue={contact.address_city || ''} />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>State</Subheading>
            <Text>The state where the contact is located.</Text>
          </div>
          <div>
            <Select name="address_state" defaultValue={contact.address_state || 'CA'}>
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
            <Text>The postal or ZIP code of the contact.</Text>
          </div>
          <div>
            <Input aria-label="Postal Code" name="address_postal_code" defaultValue={contact.address_postal_code || ''} />
          </div>
        </section>

        <Divider className="my-10" soft />


        <div className="flex justify-end gap-4">
          <Link href="/contacts">
            <Button type="button" plain>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </>
  )
}
