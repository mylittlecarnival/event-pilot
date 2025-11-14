'use client'

export interface Product {
  id: string
  name: string
  sku: string | null
  active: boolean
  unit_price: number | null
  featured_image: string | null
  product_gallery: string[]
  description: string | null
  rules: string | null
  is_internal: boolean
  is_default: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/products')
    if (!response.ok) {
      throw new Error('Failed to fetch products')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`/api/products/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch product')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export async function createProduct(productData: Partial<Product>): Promise<Product | null> {
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create product')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating product:', error)
    return null
  }
}

export async function updateProduct(id: string, productData: Partial<Product>): Promise<Product | null> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update product')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error updating product:', error)
    return null
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete product')
    }
    
    return true
  } catch (error) {
    console.error('Error deleting product:', error)
    return false
  }
}

export async function searchProducts(query: string, includeInternal: boolean = true): Promise<Product[]> {
  try {
    const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&includeInternal=${includeInternal}`)
    if (!response.ok) {
      throw new Error('Failed to search products')
    }
    return await response.json()
  } catch (error) {
    console.error('Error searching products:', error)
    return []
  }
}

export async function getDefaultProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/products?default=true&includeInternal=true')
    if (!response.ok) {
      throw new Error('Failed to fetch default products')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching default products:', error)
    return []
  }
}
