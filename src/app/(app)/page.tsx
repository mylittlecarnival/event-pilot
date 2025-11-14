'use client'

import { useState, useEffect } from 'react'
import { Stat } from '@/app/stat'
import { Heading, Subheading } from '@/components/heading'
import { Select } from '@/components/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { Link } from '@/components/link'
import { createClient } from '@/lib/supabase/client'
import { getEstimates } from '@/lib/api/estimates'
import { getInvoices } from '@/lib/api/invoices'
import type { Estimate } from '@/types/estimates'
import type { Invoice } from '@/types/invoices'

// Helper functions for estimates
function getEstimateStatusBadgeClass(status: string): string {
  const statusClasses: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10',
    'sent for approval': 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
    sent: 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
    approved: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
    rejected: 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10',
    expired: 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20',
  }
  return statusClasses[status] || 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
}

function getEstimateStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    'sent for approval': 'Sent for Approval',
    sent: 'Sent',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
  }
  return statusMap[status] || status
}

// Helper functions for invoices
function getInvoiceStatusBadgeClass(status: string): string {
  const statusClasses: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10',
    sent: 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
    approved: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
    rejected: 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10',
    expired: 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20',
    paid: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
    canceled: 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10',
  }
  return statusClasses[status] || 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
}

function getInvoiceStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
    paid: 'Paid',
    canceled: 'Canceled',
  }
  return statusMap[status] || status
}

function getPaymentStatusBadgeClass(status: string): string {
  const statusClasses: Record<string, string> = {
    unpaid: 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10',
    paid: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
    pending: 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20',
    partial: 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
  }
  return statusClasses[status] || 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
}

function getPaymentStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    unpaid: 'Unpaid',
    paid: 'Paid',
    pending: 'Pending',
    partial: 'Partial',
  }
  return statusMap[status] || status
}

// Shared helper functions
function getClientName(item: Estimate | Invoice): string {
  if (item.organizations?.name) {
    return item.organizations.name
  }
  
  if (item.contacts?.first_name || item.contacts?.last_name) {
    const parts = []
    if (item.contacts.first_name) parts.push(item.contacts.first_name)
    if (item.contacts.last_name) parts.push(item.contacts.last_name)
    return parts.join(' ')
  }
  
  return 'No client assigned'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(timeString: string | null): string {
  if (!timeString) return ''
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function Home() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('User')

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        // Load estimates and invoices data
        const [estimatesData, invoicesData] = await Promise.all([
          getEstimates(),
          getInvoices()
        ])
        
        if (user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', user.id)
            .single()
          
          const name = profile?.first_name || (user?.email ? user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'User')
          setFirstName(name)
        }
        
        setEstimates(estimatesData.slice(0, 5)) // Show only first 5
        setInvoices(invoicesData.slice(0, 5)) // Show only first 5
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <>
      <Heading>Good afternoon, {firstName}</Heading>
      <div className="mt-8 flex items-end justify-between">
        <Subheading>Overview</Subheading>
        <div>
          <Select name="period">
            <option value="last_week">Last week</option>
            <option value="last_two">Last two weeks</option>
            <option value="last_month">Last month</option>
            <option value="last_quarter">Last quarter</option>
          </Select>
        </div>
      </div>
      <div className="mt-4 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total revenue" value="$2.6M" change="+4.5%" />
        <Stat title="Average order value" value="$455" change="-0.5%" />
        <Stat title="Tickets sold" value="5,888" change="+4.5%" />
        <Stat title="Pageviews" value="823,067" change="+21.2%" />
      </div>
      <Subheading className="mt-14">Estimates</Subheading>
      {loading ? (
        <div className="flex justify-center items-center h-32 mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
        </div>
      ) : estimates.length === 0 ? (
        <div className="mt-4 text-center py-8">
          <p className="text-gray-500">No estimates found</p>
        </div>
      ) : (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>Estimate #</TableHeader>
              <TableHeader>Date of Event</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>County</TableHeader>
              <TableHeader>Event Start</TableHeader>
              <TableHeader>Event End</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {estimates.map((estimate) => (
              <TableRow key={estimate.id} href={`/estimates/${estimate.id}`} title={`Estimate ${estimate.estimate_number}`}>
                <TableCell className="font-medium text-gray-900">{estimate.estimate_number}</TableCell>
                <TableCell className="text-gray-500">{estimate.event_date ? formatDate(estimate.event_date) : 'Not set'}</TableCell>
                <TableCell className="text-gray-900">{getClientName(estimate)}</TableCell>
                <TableCell className="text-gray-900">{estimate.event_county || 'Not set'}</TableCell>
                <TableCell className="text-gray-900">{formatTime(estimate.event_start_time) || 'Not set'}</TableCell>
                <TableCell className="text-gray-900">{formatTime(estimate.event_end_time) || 'Not set'}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getEstimateStatusBadgeClass(estimate.status)}`}>
                    {getEstimateStatusText(estimate.status)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Subheading className="mt-14">Invoices</Subheading>
      {loading ? (
        <div className="flex justify-center items-center h-32 mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="mt-4 text-center py-8">
          <p className="text-gray-500">No invoices found</p>
        </div>
      ) : (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>Invoice #</TableHeader>
              <TableHeader>Estimate #</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Event Start</TableHeader>
              <TableHeader>Event End</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Payment Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link href={`/invoices/${invoice.id}`} className="text-gray-900 hover:text-blue-600">
                    {invoice.invoice_number}
                  </Link>
                </TableCell>
                <TableCell className="text-gray-500">
                  {invoice.estimates?.estimate_number ? (
                    <Link href={`/estimates/${invoice.estimate_id}`} className="text-gray-500 hover:text-blue-600">
                      #{invoice.estimates.estimate_number}
                    </Link>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-gray-500">{invoice.event_date ? formatDate(invoice.event_date) : 'Not set'}</TableCell>
                <TableCell className="text-gray-900">{getClientName(invoice)}</TableCell>
                <TableCell className="text-gray-900">{formatTime(invoice.event_start_time) || 'Not set'}</TableCell>
                <TableCell className="text-gray-900">{formatTime(invoice.event_end_time) || 'Not set'}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getInvoiceStatusBadgeClass(invoice.status)}`}>
                    {getInvoiceStatusText(invoice.status)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPaymentStatusBadgeClass(invoice.payment_status || 'unpaid')}`}>
                    {getPaymentStatusText(invoice.payment_status || 'unpaid')}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
    </>
  )
}
