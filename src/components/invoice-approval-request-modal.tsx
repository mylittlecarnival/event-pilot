'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Field, Label } from '@/components/fieldset'
import { getDisclosures, addDisclosuresToInvoice } from '@/lib/api/disclosures'
import type { Invoice } from '@/types/invoices'
import type { DisclosureSelection } from '@/types/disclosures'

interface InvoiceApprovalRequestModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: Invoice
}

export function InvoiceApprovalRequestModal({ isOpen, onClose, invoice }: InvoiceApprovalRequestModalProps) {
  const [customMessage, setCustomMessage] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disclosures, setDisclosures] = useState<DisclosureSelection[]>([])
  const [loadingDisclosures, setLoadingDisclosures] = useState(false)

  // Load disclosures when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDisclosures()
    }
  }, [isOpen])

  const loadDisclosures = async () => {
    setLoadingDisclosures(true)
    try {
      const data = await getDisclosures()
      setDisclosures(data.map(disclosure => ({
        id: disclosure.id,
        title: disclosure.title,
        content: disclosure.content,
        selected: false
      })))
    } catch (error) {
      console.error('Error loading disclosures:', error)
      setError('Failed to load disclosures')
    } finally {
      setLoadingDisclosures(false)
    }
  }

  const handleToggleDisclosure = (id: string) => {
    setDisclosures(prev => prev.map(disclosure =>
      disclosure.id === id
        ? { ...disclosure, selected: !disclosure.selected }
        : disclosure
    ))
  }

  const handleSelectAll = () => {
    const allSelected = disclosures.every(d => d.selected)
    setDisclosures(prev => prev.map(disclosure => ({
      ...disclosure,
      selected: !allSelected
    })))
  }

  const handleSubmit = async () => {
    if (!invoice.contact_id) {
      setError('No contact is assigned to this invoice. Please assign a contact before sending payment request.')
      return
    }

    if (!dueDate) {
      setError('Please select a due date for the payment request.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // First, add selected disclosures to invoice if any are selected
      const selectedDisclosureIds = disclosures.filter(d => d.selected).map(d => d.id)
      if (selectedDisclosureIds.length > 0) {
        await addDisclosuresToInvoice(invoice.id, invoice.contact_id, selectedDisclosureIds)
      }

      // Then send the payment request
      const response = await fetch(`/api/invoices/${invoice.id}/send-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: invoice.contact_id,
          customMessage: customMessage.trim() || undefined,
          due_date: dueDate
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server error response:', errorData)
        console.error('Response status:', response.status)
        throw new Error(errorData.error || 'Failed to send payment request')
      }

      // Close the modal and reset form
      setCustomMessage('')
      setDueDate('')
      setDisclosures(prev => prev.map(d => ({ ...d, selected: false })))
      onClose()

      // Show success message (you might want to add a toast notification here)
      alert('Payment request sent successfully!')

    } catch (err) {
      console.error('Error sending payment request:', err)
      setError(err instanceof Error ? err.message : 'Failed to send payment request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setCustomMessage('')
      setDueDate('')
      setError(null)
      setDisclosures(prev => prev.map(d => ({ ...d, selected: false })))
      onClose()
    }
  }

  const selectedCount = disclosures.filter(d => d.selected).length

  return (
    <>
      <Dialog open={isOpen} onClose={handleClose}>
        <DialogTitle>Request Payment</DialogTitle>

        <DialogBody>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Field>
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} // Prevent past dates
              disabled={isSubmitting}
              className="mb-2"
              required
            />
          </Field>

          <Field>
            <Label>Custom Message (Optional)</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to include with the payment request..."
              rows={4}
              disabled={isSubmitting}
            />
          </Field>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900">
                Disclosures to Include
              </h3>
              {disclosures.length > 0 && (
                <Button
                  onClick={handleSelectAll}
                  plain
                  className="text-sm"
                  disabled={loadingDisclosures || isSubmitting}
                >
                  {disclosures.every(d => d.selected) ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>

            {loadingDisclosures ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading disclosures...</div>
              </div>
            ) : disclosures.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No disclosures available
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {disclosures.map((disclosure) => (
                  <div key={disclosure.id} className="flex gap-3">
                    <div className="flex h-6 shrink-0 items-center">
                      <div className="group grid size-4 grid-cols-1">
                        <input
                          id={`disclosure-${disclosure.id}`}
                          type="checkbox"
                          checked={disclosure.selected}
                          onChange={() => handleToggleDisclosure(disclosure.id)}
                          disabled={isSubmitting}
                          className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-gray-900 checked:bg-gray-900 indeterminate:border-gray-900 indeterminate:bg-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                        />
                        <svg
                          viewBox="0 0 14 14"
                          fill="none"
                          className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
                        >
                          <path
                            d="M3 8L6 11L11 3.5"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-0 group-has-checked:opacity-100"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="text-sm/6">
                      <label htmlFor={`disclosure-${disclosure.id}`} className="font-medium text-gray-900">
                        {disclosure.title}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedCount > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                {selectedCount} disclosure{selectedCount !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </DialogBody>

        <DialogActions>
          <Button
            plain
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !invoice.contact_id || !dueDate || loadingDisclosures}
          >
            {isSubmitting ? 'Sending...' : 'Request Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
