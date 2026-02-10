import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('product_categories')
      .select('category_id')
      .eq('product_id', id)

    if (error) {
      console.error('Error fetching product categories:', error)
      return NextResponse.json({ error: 'Failed to fetch product categories' }, { status: 500 })
    }

    const categoryIds = (data || []).map((row) => row.category_id)
    return NextResponse.json(categoryIds)
  } catch (error) {
    console.error('Error in product categories GET API:', error)
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
    const categoryIds: string[] = body.category_ids || []

    // Delete all existing assignments for this product
    const { error: deleteError } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', id)

    if (deleteError) {
      console.error('Error deleting product categories:', deleteError)
      return NextResponse.json({ error: 'Failed to update product categories' }, { status: 500 })
    }

    // Insert new assignments
    if (categoryIds.length > 0) {
      const rows = categoryIds.map((categoryId) => ({
        product_id: id,
        category_id: categoryId,
      }))

      const { error: insertError } = await supabase
        .from('product_categories')
        .insert(rows)

      if (insertError) {
        console.error('Error inserting product categories:', insertError)
        return NextResponse.json({ error: 'Failed to update product categories' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in product categories PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
