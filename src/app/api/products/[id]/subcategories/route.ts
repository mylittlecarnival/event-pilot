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
      .from('product_subcategories')
      .select('subcategory_id')
      .eq('product_id', id)

    if (error) {
      console.error('Error fetching product subcategories:', error)
      return NextResponse.json({ error: 'Failed to fetch product subcategories' }, { status: 500 })
    }

    const subcategoryIds = (data || []).map((row) => row.subcategory_id)
    return NextResponse.json(subcategoryIds)
  } catch (error) {
    console.error('Error in product subcategories GET API:', error)
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
    const subcategoryIds: string[] = body.subcategory_ids || []

    // Delete all existing assignments for this product
    const { error: deleteError } = await supabase
      .from('product_subcategories')
      .delete()
      .eq('product_id', id)

    if (deleteError) {
      console.error('Error deleting product subcategories:', deleteError)
      return NextResponse.json({ error: 'Failed to update product subcategories' }, { status: 500 })
    }

    // Insert new assignments
    if (subcategoryIds.length > 0) {
      const rows = subcategoryIds.map((subcategoryId) => ({
        product_id: id,
        subcategory_id: subcategoryId,
      }))

      const { error: insertError } = await supabase
        .from('product_subcategories')
        .insert(rows)

      if (insertError) {
        console.error('Error inserting product subcategories:', insertError)
        return NextResponse.json({ error: 'Failed to update product subcategories' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in product subcategories PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
