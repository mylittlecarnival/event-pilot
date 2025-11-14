'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input, InputGroup } from '@/components/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { getOrganizations, type Organization } from '@/lib/api/organizations'
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/20/solid'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const data = await getOrganizations()
        // Sort organizations alphabetically by name
        const sortedOrganizations = data.sort((a, b) => a.name.localeCompare(b.name))
        setAllOrganizations(sortedOrganizations)
        setOrganizations(sortedOrganizations)
      } catch (error) {
        console.error('Error fetching organizations:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrganizations()
  }, [])

  // Filter organizations based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setOrganizations(allOrganizations)
    } else {
      const filtered = allOrganizations.filter(organization =>
        organization.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (organization.address_city && organization.address_city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (organization.address_state && organization.address_state.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (organization.phone && organization.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (organization.website && organization.website.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setOrganizations(filtered)
    }
  }, [searchTerm, allOrganizations])

  if (loading) {
    return (
      <>
        <div className="flex items-end justify-between gap-4">
          <Heading>Organizations</Heading>
          <Link href="/organizations/new">
            <Button>
              <PlusIcon />
              Create organization
            </Button>
          </Link>
        </div>
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">
            Loading organizations...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heading>Organizations</Heading>
          <span className="text-sm text-zinc-500">
            ({organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'})
          </span>
        </div>
        <Link href="/organizations/new">
          <Button>
            <PlusIcon />
            Create organization
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        <div className="max-w-md">
          <InputGroup>
            <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search organizations..."
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
            <TableHeader>Location</TableHeader>
            <TableHeader>Phone</TableHeader>
            <TableHeader>Website</TableHeader>
            <TableHeader>Created</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {organizations.map((organization) => (
            <TableRow key={organization.id} href={`/organizations/${organization.id}`} title={organization.name}>
              <TableCell>
                <div className="min-w-0">
                  <div className="font-medium text-zinc-950 truncate">
                    {organization.name}
                  </div>
                  {organization.address_full && (
                    <div className="text-sm text-zinc-500 truncate max-w-xs">
                      {organization.address_full}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-zinc-500">
                {organization.address_city && organization.address_state ? 
                  `${organization.address_city}, ${organization.address_state}` : 
                  organization.address_city || organization.address_state || '—'
                }
              </TableCell>
              <TableCell className="text-zinc-500">
                {organization.phone || '—'}
              </TableCell>
              <TableCell className="text-zinc-500">
                {organization.website ? (
                  <a 
                    href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {organization.website}
                  </a>
                ) : '—'}
              </TableCell>
              <TableCell className="text-zinc-500">
                {new Date(organization.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/organizations/${organization.id}`} className="inline-flex items-center justify-center p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                  <PencilSquareIcon className="h-5 w-5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {organizations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-zinc-500">
            {searchTerm ? (
              `No organizations found matching "${searchTerm}". Try adjusting your search.`
            ) : (
              'No organizations found. Create your first organization to get started.'
            )}
          </div>
        </div>
      )}
    </>
  )
}
