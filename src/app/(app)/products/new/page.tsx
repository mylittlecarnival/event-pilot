'use client'

import { Button } from '@/components/button'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/checkbox'
import { Divider } from '@/components/divider'
import { Heading, Subheading } from '@/components/heading'
import { ImageGallery, ImageUpload } from '@/components/image-upload'
import { Input } from '@/components/input'
import { SimpleToggle } from '@/components/toggle'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { TiptapEditor } from '@/components/tiptap-editor'
import { Label } from '@/components/fieldset'
import { createProduct } from '@/lib/api/products'
import { getCategories, updateProductCategories, getAllSubcategories, updateProductSubcategories } from '@/lib/api/categories'
import type { CategoryWithProductCount, SubcategoryWithProductCount } from '@/types/categories'
import { ChevronLeftIcon } from '@heroicons/react/16/solid'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CreateProduct() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [isInternal, setIsInternal] = useState<boolean>(false)
  const [isDefault, setIsDefault] = useState<boolean>(false)
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const [productGallery, setProductGallery] = useState<string[]>([])
  const [description, setDescription] = useState<string>('')
  const [categories, setCategories] = useState<CategoryWithProductCount[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [allSubcategories, setAllSubcategories] = useState<SubcategoryWithProductCount[]>([])
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    Promise.all([getCategories(), getAllSubcategories()]).then(([cats, subs]) => {
      setCategories(cats)
      setAllSubcategories(subs)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | HTMLFormElement, actionType: 'save' | 'saveAndNew' = 'save') => {
    if ('preventDefault' in e) {
      e.preventDefault()
    }
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

      console.log('Creating product with data:', productData)
      console.log('Featured image URL:', featuredImage)
      console.log('Product gallery:', productGallery)

      const newProduct = await createProduct(productData)
      if (newProduct) {
        if (selectedCategoryIds.length > 0) {
          await updateProductCategories(newProduct.id, selectedCategoryIds)
        }
        // Save subcategories filtered to only those belonging to selected categories
        const validSubcategoryIds = selectedSubcategoryIds.filter((subId) =>
          allSubcategories.some((sub) => sub.id === subId && selectedCategoryIds.includes(sub.category_id))
        )
        if (validSubcategoryIds.length > 0) {
          await updateProductSubcategories(newProduct.id, validSubcategoryIds)
        }
        console.log('Product created successfully:', newProduct)
        setSaved(true)

        if (actionType === 'saveAndNew') {
          // For "Save & Add New", redirect to new product page after short delay
          setTimeout(() => {
            router.push('/products/new')
            router.refresh() // Refresh to reset the form
          }, 1500)
        } else {
          // For regular save, redirect to products main page
          setTimeout(() => {
            router.push('/products')
          }, 1500)
        }
      } else {
        setError('Failed to create product')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      setError(error instanceof Error ? error.message : 'Failed to create product')
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

  return (
    <>
      <div className="max-lg:hidden">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500">
          <ChevronLeftIcon className="size-4 fill-zinc-400" />
          Products
        </Link>
      </div>

      <div className="mt-4 lg:mt-8">
        <Heading>Create New Product</Heading>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl">
        <Divider className="my-10 mt-6" />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Product Name</Subheading>
            <Text>The name of your product as it will appear to customers.</Text>
          </div>
          <div>
            <Input aria-label="Product Name" name="name" required />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>SKU</Subheading>
            <Text>Stock Keeping Unit - a unique identifier for inventory tracking.</Text>
          </div>
          <div>
            <Input aria-label="SKU" name="sku" />
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
              placeholder="0.00"
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
              folder="gallery"
              maxImages={10}
            />
          </div>
        </section>

        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Categories</Subheading>
            <Text>Assign this product to categories and subcategories.</Text>
          </div>
          <div>
            {categories.length > 0 ? (
              <div className="space-y-3">
                {categories.map((category) => {
                  const isSelected = selectedCategoryIds.includes(category.id)
                  const catSubs = allSubcategories.filter((sub) => sub.category_id === category.id)
                  return (
                    <div key={category.id}>
                      <CheckboxGroup>
                        <CheckboxField>
                          <Checkbox
                            checked={isSelected}
                            onChange={(checked) => {
                              if (checked) {
                                setSelectedCategoryIds((prev) => [...prev, category.id])
                              } else {
                                setSelectedCategoryIds((prev) => prev.filter((id) => id !== category.id))
                                setSelectedSubcategoryIds((prev) =>
                                  prev.filter((subId) => {
                                    const sub = allSubcategories.find((s) => s.id === subId)
                                    return sub ? sub.category_id !== category.id : true
                                  })
                                )
                              }
                            }}
                          />
                          <Label>{category.name}</Label>
                        </CheckboxField>
                      </CheckboxGroup>
                      {isSelected && catSubs.length > 0 && (
                        <div className="ml-6 mt-1 pl-2 border-l-2 border-zinc-200">
                          <CheckboxGroup>
                            {catSubs.map((sub) => (
                              <CheckboxField key={sub.id}>
                                <Checkbox
                                  checked={selectedSubcategoryIds.includes(sub.id)}
                                  onChange={(checked) => {
                                    if (checked) {
                                      setSelectedSubcategoryIds((prev) => [...prev, sub.id])
                                      // Auto-select parent category
                                      setSelectedCategoryIds((prev) =>
                                        prev.includes(sub.category_id) ? prev : [...prev, sub.category_id]
                                      )
                                    } else {
                                      setSelectedSubcategoryIds((prev) => prev.filter((id) => id !== sub.id))
                                    }
                                  }}
                                />
                                <Label>{sub.name}</Label>
                              </CheckboxField>
                            ))}
                          </CheckboxGroup>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <Text>No categories available. Create categories in the Categories page first.</Text>
            )}
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
                Product Created Successfully
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
              disabled={saving}
              outline
            >
              {saving ? 'Creating...' : 'Save & Add New'}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Save Product'}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}