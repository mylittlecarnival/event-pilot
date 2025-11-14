'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { getEstimates } from '@/lib/api/estimates'
import { NewEstimateModal } from '@/components/new-estimate-modal'
import type { Estimate } from '@/types/estimates'

function getStatusBadgeClass(status: string): string {
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

function getStatusText(status: string): string {
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

function getClientName(estimate: Estimate): string {
  if (estimate.organizations?.name) {
    return estimate.organizations.name
  }
  
  if (estimate.contacts?.first_name || estimate.contacts?.last_name) {
    const parts = []
    if (estimate.contacts.first_name) parts.push(estimate.contacts.first_name)
    if (estimate.contacts.last_name) parts.push(estimate.contacts.last_name)
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


export default function Estimates() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const router = useRouter()

  // Load estimates on component mount
  useEffect(() => {
    const loadEstimates = async () => {
      try {
        const data = await getEstimates()
        setEstimates(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load estimates')
      } finally {
        setLoading(false)
      }
    }

    loadEstimates()
  }, [])

  const handleNewEstimateSuccess = (estimateId: string) => {
    router.push(`/estimates/${estimateId}`)
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
        <Heading>Estimates</Heading>
        <Button
          className="-my-0.5"
          onClick={() => setShowNewModal(true)}
        >
          Create Estimate
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
              <h3 className="text-sm font-medium text-red-800">Error loading estimates</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : estimates.length === 0 ? (
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
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No estimates</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new estimate.</p>
          <div className="mt-6">
            <Button onClick={() => setShowNewModal(true)}>
              Create Estimate
            </Button>
          </div>
        </div>
      ) : (
        <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
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
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusBadgeClass(estimate.status)}`}>
                    {getStatusText(estimate.status)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* New Estimate Modal */}
      <NewEstimateModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={handleNewEstimateSuccess}
      />
    </>
  )
}
