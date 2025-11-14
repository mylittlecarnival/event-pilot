'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/button'
import { Textarea } from '@/components/textarea'
import { Heading, Subheading } from '@/components/heading'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/description-list'
import { Divider } from '@/components/divider'
import { Badge } from '@/components/badge'
import { InvoiceApprovalDisclosures } from '@/components/invoice-approval-disclosures'
import { DigitalSignature, type SignatureData } from '@/components/digital-signature'
import {
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import type { InvoiceApproval } from '@/types/invoice-approvals'

interface ApprovalPageState {
  approval: InvoiceApproval | null
  loading: boolean
  error: string | null
  submitting: boolean
  submitted: boolean
  rejectionReason: string
  showRejectionForm: boolean
  allDisclosuresApproved: boolean
  signatureData: SignatureData | null
  signatureValid: boolean
}

export default function InvoiceApprovalPage() {
  const params = useParams()
  const hash = params.hash as string

  const [state, setState] = useState<ApprovalPageState>({
    approval: null,
    loading: true,
    error: null,
    submitting: false,
    submitted: false,
    rejectionReason: '',
    showRejectionForm: false,
    allDisclosuresApproved: true, // Default to true, will be updated by disclosure component
    signatureData: null,
    signatureValid: false
  })

  // Use a ref to store the generate function to avoid re-renders
  const generateSignatureRef = useRef<(() => Promise<SignatureData | null>) | null>(null)

  // Load approval data
  useEffect(() => {
    async function loadApproval() {
      if (!hash) {
        setState(prev => ({ ...prev, loading: false, error: 'Invalid approval link' }))
        return
      }

      try {
        const response = await fetch(`/api/approve-invoice/${hash}`)
        if (!response.ok) {
          const errorData = await response.json()
          setState(prev => ({ ...prev, loading: false, error: errorData.error || 'Failed to load approval details' }))
          return
        }

        const { data: approval } = await response.json()
        setState(prev => ({
          ...prev,
          approval,
          loading: false,
          submitted: approval.status !== 'sent'
        }))
      } catch (error) {
        console.error('Error loading approval:', error)
        setState(prev => ({ ...prev, loading: false, error: 'Failed to load approval details' }))
      }
    }

    loadApproval()
  }, [hash])

  const handleShowRejectionForm = () => {
    setState(prev => ({ ...prev, showRejectionForm: true, error: null }))
  }

  const handleDisclosureStatusChange = useCallback((allApproved: boolean) => {
    setState(prev => ({ ...prev, allDisclosuresApproved: allApproved }))
  }, [])

  const handleSignatureChange = useCallback((signatureData: SignatureData | null) => {
    setState(prev => ({ ...prev, signatureData }))
  }, [])

  const handleSignatureValidationChange = useCallback((isValid: boolean) => {
    setState(prev => ({ ...prev, signatureValid: isValid }))
  }, [])

  const handleGenerateSignatureFunction = useCallback((generateFn: () => Promise<SignatureData | null>) => {
    generateSignatureRef.current = generateFn
  }, [])

  const handleApproval = async (status: 'approved' | 'rejected') => {
    if (!state.approval || state.submitted) return

    if (status === 'approved' && !state.allDisclosuresApproved) {
      setState(prev => ({ ...prev, error: 'Please approve all required disclosures before approving this invoice' }))
      return
    }

    if (status === 'approved' && !state.signatureValid) {
      setState(prev => ({ ...prev, error: 'Please provide your full name and consent to use digital signature before approving this invoice' }))
      return
    }

    // Generate signature when approving
    let signatureData: SignatureData | null = null
    if (status === 'approved' && generateSignatureRef.current) {
      try {
        signatureData = await generateSignatureRef.current()
        if (!signatureData) {
          setState(prev => ({ ...prev, error: 'Failed to generate digital signature. Please try again.' }))
          return
        }
        console.log('Generated signature data size:', JSON.stringify(signatureData).length, 'bytes')
      } catch (error) {
        console.error('Error generating signature:', error)
        setState(prev => ({ ...prev, error: 'Failed to generate digital signature. Please try again.' }))
        return
      }
    }

    if (status === 'rejected' && !state.rejectionReason.trim()) {
      setState(prev => ({ ...prev, error: 'Please provide a reason for rejection' }))
      return
    }

    setState(prev => ({ ...prev, submitting: true, error: null }))

    try {
      const response = await fetch('/api/approve-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_hash: hash,
          status,
          contact_response: status === 'rejected' ? state.rejectionReason : null,
          signature: status === 'approved' ? signatureData : null
        })
      })

      if (!response.ok) {
        const responseText = await response.text()
        console.error('API Error Response:', responseText)

        let errorMessage = 'Failed to submit response'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          console.error('Failed to parse error response as JSON:', parseError)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const responseData = await response.json()

      setState(prev => ({
        ...prev,
        submitting: false,
        submitted: true,
        approval: prev.approval ? { ...prev.approval, status } : null
      }))

      // If approved and payment URL is provided, redirect to payment
      if (status === 'approved' && responseData.payment_url) {
        setTimeout(() => {
          window.location.href = responseData.payment_url
        }, 2000) // Give user 2 seconds to see the approval confirmation
      }

    } catch (error) {
      console.error('Error submitting approval:', error)
      setState(prev => ({
        ...prev,
        submitting: false,
        error: error instanceof Error ? error.message : 'Failed to submit response'
      }))
    }
  }

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#111827' }}></div>
          <p className="mt-2" style={{ color: '#4b5563' }}>Loading invoice details...</p>
        </div>
      </div>
    )
  }

  if (state.error || !state.approval) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-md mx-auto text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="mt-4 text-xl font-semibold" style={{ color: '#111827' }}>Unable to Load Invoice</h1>
          <p className="mt-2" style={{ color: '#4b5563' }}>{state.error || 'Invoice not found'}</p>
        </div>
      </div>
    )
  }

  const { approval } = state
  const invoice = approval.invoices
  const contact = approval.contacts

  if (state.submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-md mx-auto text-center">
          {approval.status === 'approved' ? (
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
          ) : (
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          )}
          <h1 className="mt-4 text-xl font-semibold" style={{ color: '#111827' }}>
            Invoice {approval.status === 'approved' ? 'Approved' : 'Rejected'}
          </h1>
          <p className="mt-2" style={{ color: '#4b5563' }}>
            This page can no longer be accessed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow px-6 py-8 mb-6">
          <div className="text-center">
            {/* Company Logo */}
            <div className="mb-6">
              <img
                src="/mlc_logo.png"
                alt="My LIttle Carnival"
                className="h-16 w-auto mx-auto"
              />
            </div>
            <Heading>Invoice Approval Request</Heading>
            <Subheading className="mt-2">
              Please review the invoice details below and approve or reject this invoice.
            </Subheading>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center justify-between">
              <div>
                <Heading level={2}>Invoice #{invoice?.invoice_number}</Heading>
                <p className="text-sm text-slate-600 mt-1">
                  Sent to: {contact?.first_name} {contact?.last_name} ({contact?.email})
                </p>
              </div>
              <Badge color={
                invoice?.status === 'sent for approval' || invoice?.status === 'payment requested' || invoice?.status === 'pending' || invoice?.status === 'sent' ? 'yellow' :
                invoice?.status === 'approved' ? 'green' :
                invoice?.status === 'rejected' ? 'red' :
                'zinc'
              }>
                {invoice?.status === 'sent for approval' ? 'Payment Requested' :
                 invoice?.status === 'payment requested' ? 'Payment Requested' :
                 invoice?.status === 'draft' ? 'Draft' :
                 invoice?.status === 'approved' ? 'Approved' :
                 invoice?.status === 'rejected' ? 'Rejected' :
                 invoice?.status}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Bill To Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bill To</h3>
              <DescriptionList>
                <DescriptionTerm>
                  <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                  Contact
                </DescriptionTerm>
                <DescriptionDetails>
                  {contact?.first_name} {contact?.last_name}
                  {contact?.email && (
                    <div className="text-sm text-slate-600">{contact.email}</div>
                  )}
                  {contact?.phone && (
                    <div className="text-sm text-slate-600">{contact.phone}</div>
                  )}
                </DescriptionDetails>

                {(contact?.address_street || contact?.address_city) && (
                  <>
                    <DescriptionTerm>Address</DescriptionTerm>
                    <DescriptionDetails>
                      {contact?.address_street && (
                        <div>{contact.address_street}</div>
                      )}
                      {contact?.address_city && (
                        <div>
                          {contact.address_city}, {contact.address_state} {contact.address_postal_code}
                        </div>
                      )}
                    </DescriptionDetails>
                  </>
                )}

                {invoice?.organizations && (
                  <>
                    <DescriptionTerm>Organization</DescriptionTerm>
                    <DescriptionDetails>{invoice.organizations.name}</DescriptionDetails>
                  </>
                )}
              </DescriptionList>
            </div>
     
            {/* Event Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Event Details</h3>
              <DescriptionList>
                {invoice?.event_type && (
                  <>
                    <DescriptionTerm>Event Type</DescriptionTerm>
                    <DescriptionDetails>{invoice.event_type}</DescriptionDetails>
                  </>
                )}

                {invoice?.event_date && (
                  <>
                    <DescriptionTerm>
                      <CalendarIcon className="h-4 w-4 inline mr-1" />
                      Event Date
                    </DescriptionTerm>
                    <DescriptionDetails>
                      {new Date(invoice.event_date).toLocaleDateString()}
                    </DescriptionDetails>
                  </>
                )}

                {(invoice?.event_start_time || invoice?.event_end_time) && (
                  <>
                    <DescriptionTerm>
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      Event Time
                    </DescriptionTerm>
                    <DescriptionDetails>
                      {invoice.event_start_time && (
                        <span>
                          {new Date(`2000-01-01T${invoice.event_start_time}`).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                      {invoice.event_start_time && invoice.event_end_time && <span> - </span>}
                      {invoice.event_end_time && (
                        <span>
                          {new Date(`2000-01-01T${invoice.event_end_time}`).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </DescriptionDetails>
                  </>
                )}

                {(invoice?.event_address_street || invoice?.event_city) && (
                  <>
                    <DescriptionTerm>
                      <MapPinIcon className="h-4 w-4 inline mr-1" />
                      Event Location
                    </DescriptionTerm>
                    <DescriptionDetails>
                      {invoice?.event_address_street && (
                        <div>
                          {invoice.event_address_street}
                          {invoice.event_address_unit && ` ${invoice.event_address_unit}`}
                        </div>
                      )}
                      {invoice?.event_city && (
                        <div>
                          {invoice.event_city}, {invoice.event_state} {invoice.event_zipcode}
                        </div>
                      )}
                      {invoice?.event_county && (
                        <div className="text-sm text-slate-600">{invoice.event_county} County</div>
                      )}
                    </DescriptionDetails>
                  </>
                )}

                {invoice?.guests && (
                  <>
                    <DescriptionTerm>
                      <UserGroupIcon className="h-4 w-4 inline mr-1" />
                      Number of Guests
                    </DescriptionTerm>
                    <DescriptionDetails>{invoice.guests}</DescriptionDetails>
                  </>
                )}
              </DescriptionList>
            </div>
          </div>

          <Divider />

          <div className="p-6">
            {invoice?.invoice_items && invoice.invoice_items.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Items & Services</h3>
                <div className="flow-root overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-white">
                      <tr>
                        <th scope="col" className="relative isolate py-3.5 pr-3 text-left text-sm font-semibold text-slate-900">
                          Product / Service
                          <div className="absolute inset-y-0 right-full -z-10 w-screen border-b border-b-gray-200"></div>
                          <div className="absolute inset-y-0 left-0 -z-10 w-screen border-b border-b-gray-200"></div>
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-16">Qty</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-24">Unit Price</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.invoice_items.map((item) => (
                        <tr key={item.id}>
                          <td className="relative py-4 pr-3 text-sm">
                            <div className="font-bold text-slate-900">{item.item_name}</div>
                            {item.item_description && (
                              <div className="text-sm text-slate-600 mt-1 leading-relaxed break-words">
                                {item.item_description}
                              </div>
                            )}
                            {item.item_sku && (
                              <div className="text-xs text-slate-500 mt-1">SKU: {item.item_sku}</div>
                            )}
                            <div className="absolute right-full bottom-0 h-px w-screen bg-slate-100"></div>
                            <div className="absolute bottom-0 left-0 h-px w-screen bg-slate-100"></div>
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-900 text-right align-top w-16">{item.qty || 1}</td>
                          <td className="px-3 py-4 text-sm text-slate-900 text-right align-top w-24">${(item.unit_price || 0).toFixed(2)}</td>
                          <td className="px-3 py-4 text-sm font-medium text-slate-900 text-right align-top w-24">
                            ${((item.qty || 1) * (item.unit_price || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-1 border-slate-500">
                        <td colSpan={3} className="py-4 pr-3 text-right font-bold text-slate-900 text-lg">
                          Total
                        </td>
                        <td className="px-3 py-4 text-right font-bold text-lg text-slate-900">
                          ${invoice.invoice_items
                            .reduce((sum, item) => sum + ((item.qty || 1) * (item.unit_price || 0)), 0)
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <Divider />

          {/* Disclosures Section */}
          <div className="p-6">
            <InvoiceApprovalDisclosures
              approvalHash={hash}
              onDisclosureStatusChange={handleDisclosureStatusChange}
            />
          </div>

          <Divider />

          {/* Digital Signature Section */}
          <div className="p-6">
            <DigitalSignature
              onSignatureChange={handleSignatureChange}
              onValidationChange={handleSignatureValidationChange}
              onGenerateSignature={handleGenerateSignatureFunction}
            />
          </div>

          <Divider />

          {/* Action Buttons */}
          <div className="p-6">
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{state.error}</p>
              </div>
            )}

            <div className="space-y-4">
              {!state.showRejectionForm ? (
                <div className="flex space-x-4">
                  <Button
                    color="green"
                    onClick={() => handleApproval('approved')}
                    disabled={state.submitting || !state.allDisclosuresApproved || !state.signatureValid}
                    className="flex-1"
                  >
                    {state.submitting ? 'Processing...' : 'Approve Invoice'}
                  </Button>
                  <Button
                    color="red"
                    onClick={handleShowRejectionForm}
                    disabled={state.submitting}
                    className="flex-1"
                  >
                    Reject Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="rejection-reason" className="block text-sm font-medium text-slate-700 mb-2">
                      Reason for rejection (required)
                    </label>
                    <Textarea
                      id="rejection-reason"
                      value={state.rejectionReason}
                      onChange={(e) => setState(prev => ({ ...prev, rejectionReason: e.target.value }))}
                      placeholder="Please provide your reason for rejecting this invoice..."
                      rows={4}
                      disabled={state.submitting}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <Button
                      plain
                      onClick={() => setState(prev => ({ ...prev, showRejectionForm: false, rejectionReason: '', error: null }))}
                      disabled={state.submitting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      color="red"
                      onClick={() => handleApproval('rejected')}
                      disabled={state.submitting || !state.rejectionReason.trim()}
                      className="flex-1"
                    >
                      {state.submitting ? 'Processing...' : 'Submit Rejection'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}