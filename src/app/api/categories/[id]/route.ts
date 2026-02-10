import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Error fetching category:', error)
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error in category GET API:', error)
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

    const { data, error } = await supabase
      .from('categories')
      .update({
        name: body.name,
        description: body.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in category PUT API:', error)
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

    // Hard-delete junction rows for this category
    const { error: junctionError } = await supabase
      .from('product_categories')
      .delete()
      .eq('category_id', id)

    if (junctionError) {
      console.error('Error deleting product_categories:', junctionError)
      return NextResponse.json({ error: 'Failed to delete category associations' }, { status: 500 })
    }

    // Soft-delete the category
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in category DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
