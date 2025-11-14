'use client'

import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input, InputGroup } from '@/components/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { getProducts, type Product } from '@/lib/api/products'
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/20/solid'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch all products including internal ones for admin interface
        const response = await fetch('/api/products?includeInternal=true')
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }
        const data = await response.json()
        // Sort products alphabetically by name
        const sortedProducts = data.sort((a: Product, b: Product) => a.name.localeCompare(b.name))
        setAllProducts(sortedProducts)
        setProducts(sortedProducts)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setProducts(allProducts)
    } else {
      const searchLower = searchTerm.toLowerCase()
      const filtered = allProducts.filter(product => {
        // Determine product type for search
        let productType = ''
        if (product.is_internal) {
          productType = 'internal'
        } else if (product.is_default) {
          productType = 'default'
        } else {
          productType = 'public'
        }

        // Search in name, SKU, description, and type
        return (
          product.name.toLowerCase().includes(searchLower) ||
          (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
          (product.description && product.description.toLowerCase().includes(searchLower)) ||
          productType.includes(searchLower)
        )
      })
      setProducts(filtered)
    }
  }, [searchTerm, allProducts])

  if (loading) {
    return (
      <>
        <div className="flex items-end justify-between gap-4">
          <Heading>Products</Heading>
          <Link href="/products/new">
            <Button>
              <PlusIcon />
              Create product
            </Button>
          </Link>
        </div>
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">
            Loading products...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heading>Products</Heading>
          <span className="text-sm text-zinc-500">
            ({products.length} {products.length === 1 ? 'product' : 'products'})
          </span>
        </div>
        <Link href="/products/new">
          <Button>
            <PlusIcon />
            Create product
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        <div className="max-w-md">
          <InputGroup>
            <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search products by name, SKU, description, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>
      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]" grid striped>
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>SKU</TableHeader>
            <TableHeader>Unit Price</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} href={`/products/${product.id}`} title={product.name}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {product.featured_image ? (
                    <Avatar src={product.featured_image} className="size-10" square />
                  ) : (
                    <div className="size-10 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center border border-zinc-200 dark:border-zinc-600">
                      <svg className="size-5 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-950 truncate">
                      {product.name}
                    </div>
                    {product.description && (
                      <div className="text-sm text-zinc-500 truncate max-w-xs">
                        {product.description.replace(/<[^>]*>/g, '')}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-zinc-500 font-mono text-sm">
                {product.sku || '—'}
              </TableCell>
              <TableCell>
                {product.unit_price ? `$${Number(product.unit_price).toFixed(2)}` : '—'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {product.is_internal && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 inset-ring inset-ring-blue-700/10">
                      Internal
                    </span>
                  )}
                  {product.is_default && (
                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 inset-ring inset-ring-purple-700/10">
                      Default
                    </span>
                  )}
                  {!product.is_internal && !product.is_default && (
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10">
                      Public
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge color={product.active ? 'green' : 'red'}>
                  {product.active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/products/${product.id}`} className="inline-flex items-center justify-center p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                  <PencilSquareIcon className="h-5 w-5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {products.length === 0 && (
        <div className="text-center py-12">
          <div className="text-zinc-500">
            {searchTerm ? (
              `No products found matching "${searchTerm}". Try adjusting your search.`
            ) : (
              'No products found. Create your first product to get started.'
            )}
          </div>
        </div>
      )}
    </>
  )
}
