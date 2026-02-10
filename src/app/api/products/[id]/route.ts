import { createClient } from '@/lib/supabase/server'
import { deleteFromS3, deleteMultipleFromS3 } from '@/lib/s3'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Error fetching product:', error)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error in product GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Fetch current product to compare images
    const { data: current } = await supabase
      .from('products')
      .select('featured_image, product_gallery')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from('products')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating product:', error)
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    // Clean up removed images from S3
    if (current) {
      const oldFeatured = current.featured_image as string | null
      const newFeatured = body.featured_image as string | null
      if (oldFeatured && oldFeatured !== newFeatured) {
        deleteFromS3(oldFeatured).catch(err => console.error('S3 cleanup error (featured):', err))
      }

      const oldGallery = (current.product_gallery as string[] | null) || []
      const newGallery = (body.product_gallery as string[] | null) || []
      const removedGallery = oldGallery.filter(url => !newGallery.includes(url))
      if (removedGallery.length > 0) {
        deleteMultipleFromS3(removedGallery).catch(err => console.error('S3 cleanup error (gallery):', err))
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in product PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch product images before soft-deleting
    const { data: product } = await supabase
      .from('products')
      .select('featured_image, product_gallery')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error deleting product:', error)
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }

    // Clean up all images from S3
    if (product) {
      const allUrls: string[] = []
      if (product.featured_image) allUrls.push(product.featured_image as string)
      if (product.product_gallery && Array.isArray(product.product_gallery)) {
        allUrls.push(...(product.product_gallery as string[]))
      }
      if (allUrls.length > 0) {
        deleteMultipleFromS3(allUrls).catch(err => console.error('S3 cleanup error (delete):', err))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in product DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
