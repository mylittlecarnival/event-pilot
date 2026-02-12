'use client'

import type { Category, CategoryWithProductCount, Subcategory, SubcategoryWithProductCount } from '@/types/categories'

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

// Subcategory functions

export async function getAllSubcategories(): Promise<SubcategoryWithProductCount[]> {
  try {
    const response = await fetch('/api/subcategories')
    if (!response.ok) {
      throw new Error('Failed to fetch subcategories')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching all subcategories:', error)
    return []
  }
}

export async function getSubcategories(categoryId: string): Promise<SubcategoryWithProductCount[]> {
  try {
    const response = await fetch(`/api/categories/${categoryId}/subcategories`)
    if (!response.ok) {
      throw new Error('Failed to fetch subcategories')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching subcategories:', error)
    return []
  }
}

export async function createSubcategory(categoryId: string, data: { name: string; description?: string | null }): Promise<Subcategory | null> {
  try {
    const response = await fetch(`/api/categories/${categoryId}/subcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to create subcategory')
    }
    return await response.json()
  } catch (error) {
    console.error('Error creating subcategory:', error)
    return null
  }
}

export async function updateSubcategory(id: string, data: { name: string; description?: string | null }): Promise<Subcategory | null> {
  try {
    const response = await fetch(`/api/subcategories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update subcategory')
    }
    return await response.json()
  } catch (error) {
    console.error('Error updating subcategory:', error)
    return null
  }
}

export async function deleteSubcategory(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/subcategories/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to delete subcategory')
    }
    return true
  } catch (error) {
    console.error('Error deleting subcategory:', error)
    return false
  }
}

export async function getProductSubcategories(productId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/products/${productId}/subcategories`)
    if (!response.ok) {
      throw new Error('Failed to fetch product subcategories')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching product subcategories:', error)
    return []
  }
}

export async function updateProductSubcategories(productId: string, subcategoryIds: string[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/products/${productId}/subcategories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subcategory_ids: subcategoryIds }),
    })
    if (!response.ok) {
      throw new Error('Failed to update product subcategories')
    }
    return true
  } catch (error) {
    console.error('Error updating product subcategories:', error)
    return false
  }
}
