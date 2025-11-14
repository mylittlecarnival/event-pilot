'use client'

import { useState, useEffect, useCallback } from 'react'
import { getEstimateDisclosuresByApprovalHash, approveEstimateDisclosure } from '@/lib/api/disclosures'
import type { EstimateDisclosure } from '@/types/disclosures'

interface ApprovalDisclosuresProps {
  approvalHash: string
  onDisclosureStatusChange: (allApproved: boolean) => void
}

export function ApprovalDisclosures({ approvalHash, onDisclosureStatusChange }: ApprovalDisclosuresProps) {
  const [disclosures, setDisclosures] = useState<EstimateDisclosure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadDisclosures() {
      if (hasLoaded || !approvalHash) return

      try {
        const data = await getEstimateDisclosuresByApprovalHash(approvalHash)
        if (isMounted) {
          setDisclosures(data)
          setHasLoaded(true)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading disclosures:', error)
          setError('Failed to load disclosures')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDisclosures()

    return () => {
      isMounted = false
    }
  }, [approvalHash, hasLoaded])

  useEffect(() => {
    // Check if all disclosures are approved
    const allApproved = disclosures.length > 0 && disclosures.every(d => d.is_approved)
    onDisclosureStatusChange(allApproved)
  }, [disclosures, onDisclosureStatusChange])

  const handleDisclosureToggle = async (disclosure: EstimateDisclosure) => {
    if (disclosure.is_approved) {
      // Don't allow unapproving once approved
      return
    }

    try {
      const updatedDisclosure = await approveEstimateDisclosure(disclosure.id)
      setDisclosures(prev => prev.map(d =>
        d.id === disclosure.id ? updatedDisclosure : d
      ))
    } catch (error) {
      console.error('Error updating disclosure:', error)
      // You might want to show an error message here
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-500">Loading disclosures...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    )
  }

  if (disclosures.length === 0) {
    return null // No disclosures to show
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Disclosures
        </h3>
        <p className="text-sm text-gray-600">
          Please review and approve the following disclosures before approving this estimate:
        </p>
      </div>

      <div className="space-y-3">
        {disclosures.map((disclosure) => (
          <div
            key={disclosure.id}
            className={`p-4 rounded-lg ${
              disclosure.is_approved
                ? 'bg-green-50 border border-green-200'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex gap-3">
              <div className="flex h-6 shrink-0 items-center">
                <div className="group grid size-4 grid-cols-1">
                  <input
                    id={`disclosure-${disclosure.id}`}
                    type="checkbox"
                    checked={disclosure.is_approved}
                    onChange={() => handleDisclosureToggle(disclosure)}
                    disabled={disclosure.is_approved}
                    className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-gray-900 checked:bg-gray-900 disabled:opacity-50 disabled:border-green-500 disabled:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 forced-colors:appearance-auto"
                  />
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-white"
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
              <div className="flex-1">
                <label htmlFor={`disclosure-${disclosure.id}`} className="block font-medium text-gray-900">
                  {disclosure.disclosure_title}
                  {disclosure.is_approved && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      Approved
                    </span>
                  )}
                </label>
                <div className="mt-2">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {disclosure.disclosure_content}
                  </p>
                  {disclosure.approved_at && (
                    <div className="mt-2 text-xs text-green-600">
                      Approved on {new Date(disclosure.approved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {disclosures.some(d => !d.is_approved) && (
        <div className="rounded-md bg-amber-50 p-4">
          <div className="text-sm text-amber-800">
            <strong>Note:</strong> You must approve all disclosures above before you can approve this estimate.
          </div>
        </div>
      )}
    </div>
  )
}