'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Field, Label } from '@/components/fieldset'
import { createSubcategory, updateSubcategory } from '@/lib/api/categories'
import type { Subcategory } from '@/types/categories'

interface SubcategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categoryId: string
  categoryName: string
  subcategory?: Subcategory | null
}

export function SubcategoryModal({ isOpen, onClose, onSuccess, categoryId, categoryName, subcategory }: SubcategoryModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = !!subcategory

  useEffect(() => {
    if (isOpen) {
      if (subcategory) {
        setName(subcategory.name)
        setDescription(subcategory.description || '')
      } else {
        setName('')
        setDescription('')
      }
      setError(null)
    }
  }, [isOpen, subcategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Subcategory name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = { name: name.trim(), description: description.trim() || null }

      if (isEditMode && subcategory) {
        const updated = await updateSubcategory(subcategory.id, data)
        if (!updated) {
          setError('Failed to update subcategory')
          return
        }
      } else {
        const created = await createSubcategory(categoryId, data)
        if (!created) {
          setError('Failed to create subcategory')
          return
        }
      }

      onClose()
      onSuccess()
    } catch (error) {
      console.error('Error saving subcategory:', error)
      setError(error instanceof Error ? error.message : 'Failed to save subcategory')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setDescription('')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogTitle>{isEditMode ? 'Edit Subcategory' : 'Create Subcategory'}</DialogTitle>
      <DialogDescription>
        {isEditMode
          ? `Update the subcategory under "${categoryName}".`
          : `Create a new subcategory under "${categoryName}".`}
      </DialogDescription>

      <form onSubmit={handleSubmit}>
        <DialogBody>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <Field>
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter subcategory name..."
                required
              />
            </Field>

            <Field>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </Field>
          </div>
        </DialogBody>

        <DialogActions>
          <Button
            type="button"
            plain
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim()}
          >
            {loading
              ? (isEditMode ? 'Updating...' : 'Creating...')
              : (isEditMode ? 'Update Subcategory' : 'Create Subcategory')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
