'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { getInvoices } from '@/lib/api/invoices'
import { NewInvoiceModal } from '@/components/new-invoice-modal'
import type { Invoice } from '@/types/invoices'
import { Link } from '@/components/link'

function getStatusBadgeClass(status: string): string {
  const statusClasses: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10',
    sent: 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
    'sent for approval': 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
    'payment requested': 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
    approved: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
    rejected: 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10',
    expired: 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20',
    paid: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
    canceled: 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10',
  }
  return statusClasses[status] || 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    'sent for approval': 'Payment Requested',
    'payment requested': 'Payment Requested',
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

function getClientName(invoice: Invoice): string {
  if (invoice.organizations?.name) {
    return invoice.organizations.name
  }

  if (invoice.contacts?.first_name || invoice.contacts?.last_name) {
    const parts = []
    if (invoice.contacts.first_name) parts.push(invoice.contacts.first_name)
    if (invoice.contacts.last_name) parts.push(invoice.contacts.last_name)
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

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const router = useRouter()

  // Load invoices on component mount
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const data = await getInvoices()
        setInvoices(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices')
      } finally {
        setLoading(false)
      }
    }

    loadInvoices()
  }, [])

  const handleNewInvoiceSuccess = (invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <Heading>Invoices</Heading>
        <Button
          className="-my-0.5"
          onClick={() => setShowNewModal(true)}
        >
          Create Invoice
        </Button>
      </div>

      {error ? (
        <div className="mt-8 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading invoices</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="mt-8 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No invoices</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
          <div className="mt-6">
            <Button onClick={() => setShowNewModal(true)}>
              Create Invoice
            </Button>
          </div>
        </div>
      ) : (
        <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
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
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                    {getStatusText(invoice.status)}
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

      {/* New Invoice Modal */}
      <NewInvoiceModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={handleNewInvoiceSuccess}
      />
    </>
  )
}
