'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { CategoryModal } from '@/components/category-modal'
import { SubcategoryModal } from '@/components/subcategory-modal'
import { Heading } from '@/components/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { deleteCategory, deleteSubcategory, getCategories, getSubcategories } from '@/lib/api/categories'
import type { CategoryWithProductCount, SubcategoryWithProductCount } from '@/types/categories'
import { PlusIcon } from '@heroicons/react/20/solid'
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export default function Categories() {
  const [categories, setCategories] = useState<CategoryWithProductCount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithProductCount | null>(null)

  // Subcategory state
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)
  const [subcategories, setSubcategories] = useState<SubcategoryWithProductCount[]>([])
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<SubcategoryWithProductCount | null>(null)
  const [subcategoryParentCategory, setSubcategoryParentCategory] = useState<CategoryWithProductCount | null>(null)

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

  const fetchSubcategories = async (categoryId: string) => {
    setSubcategoriesLoading(true)
    try {
      const data = await getSubcategories(categoryId)
      setSubcategories(data)
    } catch (error) {
      console.error('Error fetching subcategories:', error)
    } finally {
      setSubcategoriesLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const toggleExpand = (categoryId: string) => {
    if (expandedCategoryId === categoryId) {
      setExpandedCategoryId(null)
      setSubcategories([])
    } else {
      setExpandedCategoryId(categoryId)
      fetchSubcategories(categoryId)
    }
  }

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
      `Are you sure you want to delete "${category.name}"? This will remove all product associations and subcategories for this category.`
    )
    if (!confirmed) return

    const success = await deleteCategory(category.id)
    if (success) {
      if (expandedCategoryId === category.id) {
        setExpandedCategoryId(null)
        setSubcategories([])
      }
      fetchCategories()
    }
  }

  const handleModalSuccess = () => {
    fetchCategories()
    if (expandedCategoryId) {
      fetchSubcategories(expandedCategoryId)
    }
  }

  // Subcategory handlers
  const handleCreateSubcategory = (category: CategoryWithProductCount) => {
    setSubcategoryParentCategory(category)
    setEditingSubcategory(null)
    setSubcategoryModalOpen(true)
  }

  const handleEditSubcategory = (subcategory: SubcategoryWithProductCount, category: CategoryWithProductCount) => {
    setSubcategoryParentCategory(category)
    setEditingSubcategory(subcategory)
    setSubcategoryModalOpen(true)
  }

  const handleDeleteSubcategory = async (subcategory: SubcategoryWithProductCount) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${subcategory.name}"? This will remove all product associations for this subcategory.`
    )
    if (!confirmed) return

    const success = await deleteSubcategory(subcategory.id)
    if (success && expandedCategoryId) {
      fetchSubcategories(expandedCategoryId)
      fetchCategories()
    }
  }

  const handleSubcategoryModalSuccess = () => {
    if (expandedCategoryId) {
      fetchSubcategories(expandedCategoryId)
    }
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
              <TableHeader className="w-8"></TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Subcategories</TableHeader>
              <TableHeader>Products</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => {
              const isExpanded = expandedCategoryId === category.id
              return (
                <React.Fragment key={category.id}>
                  <TableRow>
                    <TableCell className="w-8">
                      <button
                        onClick={() => toggleExpand(category.id)}
                        className="inline-flex items-center justify-center p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-950">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-zinc-500 max-w-xs">
                      <span className="line-clamp-2">{category.description || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge color={category.subcategory_count > 0 ? 'purple' : 'zinc'}>
                        {category.subcategory_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={category.product_count > 0 ? 'blue' : 'zinc'}>
                        {category.product_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCreateSubcategory(category)}
                          className="inline-flex items-center justify-center p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Add subcategory"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
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

                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="!p-0">
                        <div className="bg-zinc-50 px-6 py-4 ml-8 border-l-2 border-zinc-200">
                          {subcategoriesLoading ? (
                            <div className="text-sm text-zinc-500 py-2">Loading subcategories...</div>
                          ) : subcategories.length > 0 ? (
                            <table className="w-full">
                              <thead>
                                <tr className="text-left text-sm text-zinc-500">
                                  <th className="pb-2 font-medium">Subcategory</th>
                                  <th className="pb-2 font-medium">Description</th>
                                  <th className="pb-2 font-medium">Products</th>
                                  <th className="pb-2 font-medium text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm">
                                {subcategories.map((sub) => (
                                  <tr key={sub.id} className="border-t border-zinc-200">
                                    <td className="py-2 font-medium text-zinc-900">{sub.name}</td>
                                    <td className="py-2 text-zinc-500 max-w-xs">
                                      <span className="line-clamp-1">{sub.description || '—'}</span>
                                    </td>
                                    <td className="py-2">
                                      <Badge color={sub.product_count > 0 ? 'blue' : 'zinc'}>
                                        {sub.product_count}
                                      </Badge>
                                    </td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => handleEditSubcategory(sub, category)}
                                          className="inline-flex items-center justify-center p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors"
                                        >
                                          <PencilSquareIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSubcategory(sub)}
                                          className="inline-flex items-center justify-center p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-sm text-zinc-500 py-2">
                              No subcategories yet.
                            </div>
                          )}
                          <button
                            onClick={() => handleCreateSubcategory(category)}
                            className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                          >
                            <PlusIcon className="h-4 w-4" />
                            Add subcategory
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
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

      {subcategoryParentCategory && (
        <SubcategoryModal
          isOpen={subcategoryModalOpen}
          onClose={() => setSubcategoryModalOpen(false)}
          onSuccess={handleSubcategoryModalSuccess}
          categoryId={subcategoryParentCategory.id}
          categoryName={subcategoryParentCategory.name}
          subcategory={editingSubcategory}
        />
      )}
    </>
  )
}
