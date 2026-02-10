import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*, product_categories(id)')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Map to include product_count
    const categoriesWithCount = (categories || []).map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: category.created_at,
      updated_at: category.updated_at,
      deleted_at: category.deleted_at,
      product_count: category.product_categories?.length || 0,
    }))

    return NextResponse.json(categoriesWithCount)
  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: body.name, description: body.description || null }])
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in categories POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
