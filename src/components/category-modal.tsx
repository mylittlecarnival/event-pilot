'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Field, Label } from '@/components/fieldset'
import { createCategory, updateCategory } from '@/lib/api/categories'
import type { Category } from '@/types/categories'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category?: Category | null
}

export function CategoryModal({ isOpen, onClose, onSuccess, category }: CategoryModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = !!category

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name)
        setDescription(category.description || '')
      } else {
        setName('')
        setDescription('')
      }
      setError(null)
    }
  }, [isOpen, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Category name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = { name: name.trim(), description: description.trim() || null }

      if (isEditMode && category) {
        const updated = await updateCategory(category.id, data)
        if (!updated) {
          setError('Failed to update category')
          return
        }
      } else {
        const created = await createCategory(data)
        if (!created) {
          setError('Failed to create category')
          return
        }
      }

      onClose()
      onSuccess()
    } catch (error) {
      console.error('Error saving category:', error)
      setError(error instanceof Error ? error.message : 'Failed to save category')
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
      <DialogTitle>{isEditMode ? 'Edit Category' : 'Create Category'}</DialogTitle>
      <DialogDescription>
        {isEditMode
          ? 'Update the category name and description.'
          : 'Create a new category to organize your products.'}
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
                placeholder="Enter category name..."
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
              : (isEditMode ? 'Update Category' : 'Create Category')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
