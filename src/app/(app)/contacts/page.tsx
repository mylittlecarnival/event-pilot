'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input, InputGroup } from '@/components/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { getContacts, type Contact } from '@/lib/api/contacts'
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/20/solid'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await getContacts()
        // Sort contacts alphabetically by last name, then first name
        const sortedContacts = data.sort((a, b) => {
          const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
          const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
          return nameA.localeCompare(nameB)
        })
        setAllContacts(sortedContacts)
        setContacts(sortedContacts)
      } catch (error) {
        console.error('Error fetching contacts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchContacts()
  }, [])

  // Filter contacts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setContacts(allContacts)
    } else {
      const filtered = allContacts.filter(contact =>
        contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.organization && contact.organization.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.address_city && contact.address_city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.address_state && contact.address_state.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setContacts(filtered)
    }
  }, [searchTerm, allContacts])

  if (loading) {
    return (
      <>
        <div className="flex items-end justify-between gap-4">
          <Heading>Contacts</Heading>
          <Link href="/contacts/new">
            <Button>
              <PlusIcon />
              Create contact
            </Button>
          </Link>
        </div>
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">
            Loading contacts...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heading>Contacts</Heading>
          <span className="text-sm text-zinc-500">
            ({contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'})
          </span>
        </div>
        <Link href="/contacts/new">
          <Button>
            <PlusIcon />
            Create contact
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        <div className="max-w-md">
          <InputGroup>
            <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>
      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]" grid striped>
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Phone</TableHeader>
            <TableHeader>Organization</TableHeader>
            <TableHeader>Location</TableHeader>
            <TableHeader>Created</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} title={`${contact.first_name} ${contact.last_name}`}>
              <TableCell>
                <div className="min-w-0">
                  <Link 
                    href={`/contacts/${contact.id}`}
                    className="font-medium text-zinc-950 truncate hover:text-blue-600 hover:underline"
                  >
                    {contact.first_name} {contact.last_name}
                  </Link>
                </div>
              </TableCell>
              <TableCell className="text-zinc-500">
              {contact.email || '—'}
              </TableCell>
              <TableCell className="text-zinc-500">
                {contact.phone || '—'}
              </TableCell>
              <TableCell className="text-zinc-500">
                {contact.organization ? (
                  <Link 
                    href={`/organizations/${contact.organization.id}`}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {contact.organization.name}
                  </Link>
                ) : '—'}
              </TableCell>
              <TableCell className="text-zinc-500">
                {contact.address_city && contact.address_state ? 
                  `${contact.address_city}, ${contact.address_state}` : 
                  contact.address_city || contact.address_state || '—'
                }
              </TableCell>
              <TableCell className="text-zinc-500">
                {new Date(contact.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Link 
                  href={`/contacts/${contact.id}`} 
                  className="inline-flex items-center justify-center p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {contacts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-zinc-500">
            {searchTerm ? (
              `No contacts found matching "${searchTerm}". Try adjusting your search.`
            ) : (
              'No contacts found. Create your first contact to get started.'
            )}
          </div>
        </div>
      )}
    </>
  )
}
