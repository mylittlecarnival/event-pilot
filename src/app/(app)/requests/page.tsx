'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { getRequests } from '@/lib/api/requests'
import type { Request } from '@/types/requests'

function getStatusBadgeClass(status: string): string {
  const statusClasses: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20',
    accepted: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
  }
  return statusClasses[status] || 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
}

function getStatusText(status: string | null): string {
  if (!status) return 'Pending'
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
  }
  return statusMap[status] || status
}

function getClientName(request: Request): string {
  if (request.organization_name) {
    return request.organization_name
  }

  if (request.first_name || request.last_name) {
    const parts = []
    if (request.first_name) parts.push(request.first_name)
    if (request.last_name) parts.push(request.last_name)
    return parts.join(' ')
  }

  return 'No name provided'
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(timeString: string | null): string {
  if (!timeString) return 'Not set'
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Load requests on component mount
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await getRequests()
        setRequests(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requests')
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [])

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this request?')) {
      // Delete logic will be implemented later
      console.log('Delete request:', id)
    }
  }

  const handleConvertToEstimate = async (id: string) => {
    // Convert to estimate logic will be implemented later
    console.log('Convert to estimate:', id)
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
        <Heading>Requests</Heading>
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
              <h3 className="text-sm font-medium text-red-800">Error loading requests</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : requests.length === 0 ? (
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
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No requests</h3>
          <p className="mt-1 text-sm text-gray-500">No requests have been submitted yet.</p>
        </div>
      ) : (
        <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader></TableHeader>
              <TableHeader>Request Date</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Event Date</TableHeader>
              <TableHeader>County</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <React.Fragment key={request.id}>
                <TableRow>
                  <TableCell className="w-12">
                    <button
                      onClick={() => toggleRow(request.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedRows.has(request.id) ? (
                        <ChevronDownIcon className="size-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="size-4 text-gray-500" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-gray-900">{formatDate(request.created_at)}</TableCell>
                  <TableCell className="text-gray-900">{getClientName(request)}</TableCell>
                  <TableCell className="text-gray-500">{formatDate(request.event_date)}</TableCell>
                  <TableCell className="text-gray-900">{request.event_county || 'Not set'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusBadgeClass(request.status || 'pending')}`}>
                      {getStatusText(request.status)}
                    </span>
                  </TableCell>
                </TableRow>
                {expandedRows.has(request.id) && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-gray-50">
                      <div className="py-6 px-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Contact Information */}
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                            <dl className="space-y-3">
                              <div>
                                <dt className="text-xs font-medium text-gray-500">Name</dt>
                                <dd className="text-sm text-gray-900 mt-1">{getClientName(request)}</dd>
                              </div>
                              {request.contact_email && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Email</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.contact_email}</dd>
                                </div>
                              )}
                              {request.phone && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Phone</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.phone}</dd>
                                </div>
                              )}
                              {request.organization && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Organization</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.organization}</dd>
                                </div>
                              )}
                              {request.referred_by && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Referred By</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.referred_by}</dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          {/* Event Details */}
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Event Details</h3>
                            <dl className="space-y-3">
                              <div>
                                <dt className="text-xs font-medium text-gray-500">Event Date</dt>
                                <dd className="text-sm text-gray-900 mt-1">{formatDate(request.event_date)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium text-gray-500">Event Time</dt>
                                <dd className="text-sm text-gray-900 mt-1">
                                  {formatTime(request.event_start_time)} - {formatTime(request.event_end_time)}
                                </dd>
                              </div>
                              {request.event_type && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Event Type</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.event_type}</dd>
                                </div>
                              )}
                              {request.guests && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Number of Guests</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.guests}</dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          {/* Event Location */}
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Event Location</h3>
                            <dl className="space-y-3">
                              {request.event_address_street && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Street Address</dt>
                                  <dd className="text-sm text-gray-900 mt-1">
                                    {request.event_address_street}
                                    {request.event_address_unit && `, ${request.event_address_unit}`}
                                  </dd>
                                </div>
                              )}
                              {request.event_city && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">City</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.event_city}</dd>
                                </div>
                              )}
                              {request.event_state && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">State</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.event_state}</dd>
                                </div>
                              )}
                              {request.event_zipcode && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Zip Code</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.event_zipcode}</dd>
                                </div>
                              )}
                              {request.event_county && (
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">County</dt>
                                  <dd className="text-sm text-gray-900 mt-1">{request.event_county}</dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          {/* Requested Items */}
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Requested Items</h3>
                            {request.request_items && request.request_items.length > 0 ? (
                              <div className="space-y-2">
                                {request.request_items.map((item) => (
                                  <div key={item.id} className="bg-white rounded-md p-3 border border-gray-200">
                                    <div className="flex justify-between items-start gap-4">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                          {item.products?.name || 'Unknown Product'}
                                        </p>
                                        {item.products?.description && (
                                          <div className="text-xs text-gray-500 mt-1 text-wrap">{item.products.description}</div>
                                        )}
                                      </div>
                                      <div className="flex-shrink-0 text-sm text-gray-600 whitespace-nowrap">
                                        Qty: {item.qty}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No items requested</p>
                            )}
                          </div>

                          {/* Notes */}
                          {request.notes && (
                            <div className="lg:col-span-2">
                              <h3 className="text-sm font-semibold text-gray-900 mb-4">Notes</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.notes}</p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="lg:col-span-2 pt-4 border-t border-gray-200">
                            <div className="flex gap-3">
                              <Button
                                onClick={() => handleConvertToEstimate(request.id)}
                              >
                                Convert to Estimate
                              </Button>
                              <Button
                                onClick={() => handleDelete(request.id)}
                                color="red"
                              >
                                Delete Request
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
