'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { CategoryModal } from '@/components/category-modal'
import { Heading } from '@/components/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { deleteCategory, getCategories } from '@/lib/api/categories'
import type { CategoryWithProductCount } from '@/types/categories'
import { PlusIcon } from '@heroicons/react/20/solid'
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export default function Categories() {
  const [categories, setCategories] = useState<CategoryWithProductCount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithProductCount | null>(null)

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleCreate = () => {
    setEditingCategory(null)
    setModalOpen(true)
  }

  const handleEdit = (category: CategoryWithProductCount) => {
    setEditingCategory(category)
    setModalOpen(true)
  }

  const handleDelete = async (category: CategoryWithProductCount) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"? This will remove all product associations for this category.`
    )
    if (!confirmed) return

    const success = await deleteCategory(category.id)
    if (success) {
      fetchCategories()
    }
  }

  const handleModalSuccess = () => {
    fetchCategories()
  }

  if (loading) {
    return (
      <>
        <div className="flex items-end justify-between gap-4">
          <Heading>Categories</Heading>
          <Button onClick={handleCreate}>
            <PlusIcon />
            Create category
          </Button>
        </div>
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">Loading categories...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heading>Categories</Heading>
          <span className="text-sm text-zinc-500">
            ({categories.length} {categories.length === 1 ? 'category' : 'categories'})
          </span>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon />
          Create category
        </Button>
      </div>

      {categories.length > 0 ? (
        <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]" grid striped>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Products</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium text-zinc-950">
                  {category.name}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {category.description || '—'}
                </TableCell>
                <TableCell>
                  <Badge color={category.product_count > 0 ? 'blue' : 'zinc'}>
                    {category.product_count}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="inline-flex items-center justify-center p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-12">
          <div className="text-zinc-500">
            No categories found. Create your first category to get started.
          </div>
        </div>
      )}

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        category={editingCategory}
      />
    </>
  )
}
