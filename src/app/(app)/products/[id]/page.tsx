'use client'

import { Button } from '@/components/button'
import { Checkbox, CheckboxField } from '@/components/checkbox'
import { Divider } from '@/components/divider'
import { Heading, Subheading } from '@/components/heading'
import { ImageGallery, ImageUpload } from '@/components/image-upload'
import { Input } from '@/components/input'
import { SimpleToggle } from '@/components/toggle'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { TiptapEditor } from '@/components/tiptap-editor'
import { getProduct, updateProduct, deleteProduct, type Product } from '@/lib/api/products'
import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeftIcon } from '@heroicons/react/16/solid'

type Props = {
  params: Promise<{ id: string }>
}

export default function ProductEdit({ params }: Props) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const [id, setId] = useState<string>('')
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const [productGallery, setProductGallery] = useState<string[]>([])
  const [isActive, setIsActive] = useState<boolean>(false)
  const [isInternal, setIsInternal] = useState<boolean>(false)
  const [isDefault, setIsDefault] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const resolvedParams = await params
        setId(resolvedParams.id)
        const data = await getProduct(resolvedParams.id)
        if (!data) {
          router.push('/products')
          return
        }
        setProduct(data)
        setFeaturedImage(data.featured_image)
        setProductGallery(data.product_gallery || [])
        setIsActive(data.active)
        setIsInternal(data.is_internal)
        setIsDefault(data.is_default)
        setDescription(data.description || '')
      } catch (error) {
        console.error('Error fetching product:', error)
        router.push('/products')
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [params, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | HTMLFormElement, actionType: 'save' | 'saveAndNew' = 'save') => {
    if ('preventDefault' in e) {
      e.preventDefault()
    }
    if (!product) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      // Get the form element - either from event target or direct form element
      const formElement = 'currentTarget' in e ? e.currentTarget : e
      const formData = new FormData(formElement)

      const productData = {
        name: formData.get('name') as string,
        sku: formData.get('sku') as string || null,
        description: description || null,
        unit_price: formData.get('unit_price') ? parseFloat(formData.get('unit_price') as string) : null,
        featured_image: featuredImage,
        product_gallery: productGallery,
        rules: formData.get('rules') as string || null,
        active: isActive,
        is_internal: isInternal,
        is_default: isDefault,
      }

      console.log('Updating product with data:', productData)
      console.log('Featured image URL:', featuredImage)
      console.log('Product gallery:', productGallery)

      const updatedProduct = await updateProduct(id, productData)
      if (updatedProduct) {
        console.log('Product updated successfully:', updatedProduct)
        setSaved(true)

        if (actionType === 'saveAndNew') {
          // For "Save & Add New", redirect to new product page after short delay
          setTimeout(() => {
            router.push('/products/new')
          }, 1500)
        } else {
          // For regular save, redirect to products main page after short delay
          setTimeout(() => {
            router.push('/products')
          }, 1500)
        }
      } else {
        setError('Failed to update product')
      }
    } catch (error) {
      console.error('Error updating product:', error)
      setError(error instanceof Error ? error.message : 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndNew = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const form = e.currentTarget.closest('form') as HTMLFormElement
    if (form) {
      handleSubmit(form, 'saveAndNew')
    }
  }

  const handleDelete = async () => {
    if (!product) return

    // Show confirmation dialog with text input
    const confirmationText = 'delete'
    const userInput = window.prompt(
      `Are you sure you want to delete this product?\n\nThis action cannot be undone and will permanently remove:\n- ${product.name}\n- All product data\n- All associated images\n\nType "${confirmationText}" to confirm deletion:`
    )

    if (userInput !== confirmationText) {
      if (userInput !== null) {
        alert('Deletion cancelled. You must type "delete" exactly to confirm.')
      }
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const success = await deleteProduct(id)
      if (success) {
        // Redirect to products list after successful deletion
        router.push('/products')
      } else {
        setError('Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center gap-4">
          <Link href="/products" className="text-zinc-600 hover:text-zinc-900 transition-colors">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <Heading>Loading...</Heading>
        </div>
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">
            Loading product...
          </div>
        </div>
      </>
    )
  }

  if (!product) {
    return (
      <>
        <div className="flex items-center gap-4">
          <Link href="/products" className="text-zinc-600 hover:text-zinc-900 transition-colors">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <Heading>Product not found</Heading>
        </div>
      </>
    )
  }

  return (
    <>

      <div className="max-lg:hidden">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500">
          <ChevronLeftIcon className="size-4 fill-zinc-400" />
          Products
        </Link>
      </div>

      <div className="mt-4 lg:mt-8">
        <Heading>{product.name}</Heading>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl">
        <Divider className="my-10 mt-6" />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Product Name</Subheading>
            <Text>The name of your product as it will appear to customers.</Text>
          </div>
          <div>
            <Input aria-label="Product Name" name="name" defaultValue={product.name} required />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>SKU</Subheading>
            <Text>Stock Keeping Unit - a unique identifier for inventory tracking.</Text>
          </div>
          <div>
            <Input aria-label="SKU" name="sku" defaultValue={product.sku || ''} />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Description</Subheading>
            <Text>Detailed description of your product for customers.</Text>
          </div>
          <div>
            <TiptapEditor
              value={description}
              onChange={setDescription}
              placeholder="Enter a detailed description for this product..."
              name="description"
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Unit Price</Subheading>
            <Text>The price per unit of this product.</Text>
          </div>
          <div>
            <Input 
              aria-label="Unit Price" 
              name="unit_price" 
              type="number" 
              step="0.01" 
              defaultValue={product.unit_price || ''} 
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Featured Image</Subheading>
            <Text>The main image that represents this product.</Text>
          </div>
          <div>
            <ImageUpload
              value={featuredImage || undefined}
              onChange={setFeaturedImage}
              bucket="Products"
              folder="featured"
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Product Gallery</Subheading>
            <Text>Additional images to showcase your product from different angles.</Text>
          </div>
          <div>
            <ImageGallery
              value={productGallery}
              onChange={setProductGallery}
              bucket="Products"
              folder="gallery"
              maxImages={10}
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Product Rules</Subheading>
            <Text>Any special rules, terms, or conditions for this product.</Text>
          </div>
          <div>
            <Textarea 
              aria-label="Product Rules" 
              name="rules" 
              defaultValue={product.rules || ''} 
              rows={3}
              placeholder="Enter any special rules or terms for this product..."
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Product Status</Subheading>
            <Text>Whether this product is active and available to add to estimates.</Text>
          </div>
          <div>
            <SimpleToggle
              checked={isActive}
              onChange={setIsActive}
              color="green"
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Internal Product</Subheading>
            <Text>Internal products are not visible to end users but can be added to estimates by staff (e.g., extra charges, fees).</Text>
          </div>
          <div>
            <SimpleToggle
              checked={isInternal}
              onChange={setIsInternal}
              color="blue"
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Default Product</Subheading>
            <Text>Default products are automatically included in new estimates.</Text>
          </div>
          <div>
            <SimpleToggle
              checked={isDefault}
              onChange={setIsDefault}
              color="purple"
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {error && (
              <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Product Updated Successfully
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Link href="/products">
              <Button type="button" plain>
                Cancel
              </Button>
            </Link>
            <Button
              type="button"
              onClick={handleSaveAndNew}
              disabled={saving || deleting}
              outline
            >
              {saving ? 'Saving...' : 'Save & Add New'}
            </Button>
            <Button type="submit" disabled={saving || deleting}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {product && (
        <div className="mt-12 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={deleting || saving}
            className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete product'}
          </button>
        </div>
      )}
    </>
  )
}
