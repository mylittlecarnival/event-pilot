'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { Field, Label } from '@/components/fieldset'
import { Toggle } from '@/components/toggle'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { PlusIcon, PencilIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { getAllDisclosures, createDisclosure, updateDisclosure, deleteDisclosure } from '@/lib/api/disclosures'
import type { Disclosure, CreateDisclosureData, UpdateDisclosureData } from '@/types/disclosures'

export default function DisclosuresPage() {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingDisclosure, setEditingDisclosure] = useState<Disclosure | null>(null)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<CreateDisclosureData>({
    title: '',
    content: '',
    is_active: true,
    sort_order: 0
  })

  useEffect(() => {
    loadDisclosures()
  }, [])

  const loadDisclosures = async () => {
    try {
      const data = await getAllDisclosures()
      setDisclosures(data)
    } catch (error) {
      console.error('Error loading disclosures:', error)
      setError('Failed to load disclosures')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (disclosure?: Disclosure) => {
    if (disclosure) {
      setEditingDisclosure(disclosure)
      setFormData({
        title: disclosure.title,
        content: disclosure.content,
        is_active: disclosure.is_active,
        sort_order: disclosure.sort_order
      })
    } else {
      setEditingDisclosure(null)
      setFormData({
        title: '',
        content: '',
        is_active: true,
        sort_order: disclosures.length
      })
    }
    setShowModal(true)
    setError(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingDisclosure(null)
    setFormData({
      title: '',
      content: '',
      is_active: true,
      sort_order: 0
    })
    setError(null)
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingDisclosure) {
        const updateData: UpdateDisclosureData = {
          title: formData.title,
          content: formData.content,
          is_active: formData.is_active,
          sort_order: formData.sort_order
        }
        const updated = await updateDisclosure(editingDisclosure.id, updateData)
        setDisclosures(prev => prev.map(d => d.id === editingDisclosure.id ? updated : d))
      } else {
        const created = await createDisclosure(formData)
        setDisclosures(prev => [...prev, created])
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving disclosure:', error)
      setError('Failed to save disclosure')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (disclosure: Disclosure) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${disclosure.title}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    try {
      await deleteDisclosure(disclosure.id)
      setDisclosures(prev => prev.filter(d => d.id !== disclosure.id))
    } catch (error) {
      console.error('Error deleting disclosure:', error)
      setError('Failed to delete disclosure')
    }
  }

  const handleDragStart = (e: React.DragEvent, disclosureId: string) => {
    setDraggedItem(disclosureId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()

    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null)
      return
    }

    const draggedIndex = disclosures.findIndex(d => d.id === draggedItem)
    const targetIndex = disclosures.findIndex(d => d.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null)
      return
    }

    // Create new array with reordered items
    const newDisclosures = [...disclosures]
    const [draggedDisclosure] = newDisclosures.splice(draggedIndex, 1)
    newDisclosures.splice(targetIndex, 0, draggedDisclosure)

    // Update sort_order for all items
    const updatedDisclosures = newDisclosures.map((disclosure, index) => ({
      ...disclosure,
      sort_order: index
    }))

    setDisclosures(updatedDisclosures)
    setDraggedItem(null)

    // Update sort orders in database
    try {
      for (const disclosure of updatedDisclosures) {
        await updateDisclosure(disclosure.id, { sort_order: disclosure.sort_order })
      }
    } catch (error) {
      console.error('Error updating sort orders:', error)
      // Reload data on error
      loadDisclosures()
    }
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
        <div>
          <p className="text-sm text-gray-600">
            Manage disclosure templates that can be attached to estimates and invoices for client approval.<br />
            <span className="text-xs text-red-500">Drag and drop to reorder how disclosures are displayed to clients.</span>
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusIcon className="size-4" />
          Add Disclosure
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {disclosures.length === 0 ? (
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
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No disclosures</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new disclosure template.</p>
          <div className="mt-6">
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="size-4" />
              Add Disclosure
            </Button>
          </div>
        </div>
      ) : (
        <Table className="mt-8">
          <TableHead>
            <TableRow>
              <TableHeader className="w-12"></TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Content</TableHeader>
              <TableHeader>Active</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {disclosures.map((disclosure) => (
              <TableRow
                key={disclosure.id}
                draggable
                onDragStart={(e) => handleDragStart(e, disclosure.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, disclosure.id)}
                className={`${draggedItem === disclosure.id ? 'opacity-50' : ''} hover:bg-gray-50 cursor-move`}
              >
                <TableCell className="w-12">
                  <Bars3Icon className="h-4 w-4 text-gray-400" />
                </TableCell>
                <TableCell className="font-medium">{disclosure.title}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate">{disclosure.content}</div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                    disclosure.is_active
                      ? 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20'
                      : 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
                  }`}>
                    {disclosure.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleOpenModal(disclosure)}
                      plain
                      className="text-blue-600 hover:text-blue-500"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(disclosure)}
                      plain
                      className="text-red-600 hover:text-red-500"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onClose={handleCloseModal}>
        <DialogTitle>
          {editingDisclosure ? 'Edit Disclosure' : 'Add New Disclosure'}
        </DialogTitle>
        <DialogDescription>
          {editingDisclosure
            ? 'Update the disclosure template details below.'
            : 'Create a new disclosure template that can be attached to estimates and invoices.'}
        </DialogDescription>

        <DialogBody>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Field>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Liability Waiver"
                disabled={saving}
              />
            </Field>

            <Field>
              <Label>Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the disclosure content that clients will need to approve..."
                rows={6}
                disabled={saving}
              />
            </Field>


            <div className="flex items-center justify-between">
              <label className="block text-sm/6 font-medium text-zinc-950">Active</label>
              <Toggle
                checked={formData.is_active ?? false}
                onChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                disabled={saving}
                color="green"
              />
            </div>
          </div>
        </DialogBody>

        <DialogActions>
          <Button
            plain
            onClick={handleCloseModal}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.title.trim() || !formData.content.trim()}
          >
            {saving ? 'Saving...' : editingDisclosure ? 'Update Disclosure' : 'Create Disclosure'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}