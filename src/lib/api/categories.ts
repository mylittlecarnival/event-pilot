'use client'

import type { Category, CategoryWithProductCount } from '@/types/categories'

export async function getCategories(): Promise<CategoryWithProductCount[]> {
  try {
    const response = await fetch('/api/categories')
    if (!response.ok) {
      throw new Error('Failed to fetch categories')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

export async function createCategory(data: { name: string; description?: string | null }): Promise<Category | null> {
  try {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to create category')
    }
    return await response.json()
  } catch (error) {
    console.error('Error creating category:', error)
    return null
  }
}

export async function updateCategory(id: string, data: { name: string; description?: string | null }): Promise<Category | null> {
  try {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update category')
    }
    return await response.json()
  } catch (error) {
    console.error('Error updating category:', error)
    return null
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to delete category')
    }
    return true
  } catch (error) {
    console.error('Error deleting category:', error)
    return false
  }
}

export async function getProductCategories(productId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/products/${productId}/categories`)
    if (!response.ok) {
      throw new Error('Failed to fetch product categories')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching product categories:', error)
    return []
  }
}

export async function updateProductCategories(productId: string, categoryIds: string[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/products/${productId}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_ids: categoryIds }),
    })
    if (!response.ok) {
      throw new Error('Failed to update product categories')
    }
    return true
  } catch (error) {
    console.error('Error updating product categories:', error)
    return false
  }
}
