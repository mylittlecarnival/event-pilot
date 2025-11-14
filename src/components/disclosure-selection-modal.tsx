'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { Button } from '@/components/button'
import { Checkbox, CheckboxField } from '@/components/checkbox'
import { Label } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { getDisclosures, addDisclosuresToEstimate } from '@/lib/api/disclosures'
import type { DisclosureSelection } from '@/types/disclosures'

interface DisclosureSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  estimateId: string
  contactId: string
}

export function DisclosureSelectionModal({
  isOpen,
  onClose,
  onSuccess,
  estimateId,
  contactId
}: DisclosureSelectionModalProps) {
  const [disclosures, setDisclosures] = useState<DisclosureSelection[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load disclosures when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDisclosures()
    }
  }, [isOpen])

  const loadDisclosures = async () => {
    setLoading(true)
    setError(null)

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
      setLoading(false)
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

  const handleSave = async () => {
    const selectedIds = disclosures.filter(d => d.selected).map(d => d.id)

    if (selectedIds.length === 0) {
      // No disclosures selected, just proceed with approval
      onSuccess()
      return
    }

    setSaving(true)
    setError(null)

    try {
      await addDisclosuresToEstimate(estimateId, contactId, selectedIds)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding disclosures:', error)
      setError('Failed to add disclosures to estimate')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = disclosures.filter(d => d.selected).length

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-2xl w-full space-y-4 bg-white p-6 rounded-lg shadow-xl">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Select Disclosures for Approval
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            Select which disclosures the client must approve along with the estimate.
            These will be captured as a snapshot and preserved even if the original
            disclosure text changes in the future.
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading disclosures...</div>
            </div>
          ) : disclosures.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No disclosures available</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {selectedCount} of {disclosures.length} selected
                </span>
                <Button
                  onClick={handleSelectAll}
                  plain
                  className="text-blue-600 hover:text-blue-500"
                >
                  {disclosures.every(d => d.selected) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {disclosures.map((disclosure) => (
                  <div
                    key={disclosure.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <CheckboxField>
                      <Checkbox
                        checked={disclosure.selected}
                        onChange={() => handleToggleDisclosure(disclosure.id)}
                      />
                      <Label className="font-medium text-gray-900">
                        {disclosure.title}
                      </Label>
                    </CheckboxField>
                    <div className="mt-2 text-sm text-gray-600 pl-6">
                      {disclosure.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button onClick={onClose} outline>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? 'Adding Disclosures...' :
               selectedCount === 0 ? 'Continue Without Disclosures' :
               `Add ${selectedCount} Disclosure${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}