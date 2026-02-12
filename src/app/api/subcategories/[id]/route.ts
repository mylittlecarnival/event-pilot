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
      .from('subcategories')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Error fetching subcategory:', error)
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in subcategory GET API:', error)
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
      .from('subcategories')
      .update({
        name: body.name,
        description: body.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subcategory:', error)
      return NextResponse.json({ error: 'Failed to update subcategory' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in subcategory PUT API:', error)
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

    // Hard-delete junction rows for this subcategory
    const { error: junctionError } = await supabase
      .from('product_subcategories')
      .delete()
      .eq('subcategory_id', id)

    if (junctionError) {
      console.error('Error deleting product_subcategories:', junctionError)
      return NextResponse.json({ error: 'Failed to delete subcategory associations' }, { status: 500 })
    }

    // Soft-delete the subcategory
    const { error } = await supabase
      .from('subcategories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error deleting subcategory:', error)
      return NextResponse.json({ error: 'Failed to delete subcategory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in subcategory DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
