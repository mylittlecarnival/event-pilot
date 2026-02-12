import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const [subcategoriesResult, countsResult] = await Promise.all([
      supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', id)
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      supabase
        .from('product_subcategories')
        .select('subcategory_id'),
    ])

    if (subcategoriesResult.error) {
      console.error('Error fetching subcategories:', subcategoriesResult.error)
      return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 })
    }

    // Build product count map
    const countMap: Record<string, number> = {}
    for (const row of countsResult.data || []) {
      countMap[row.subcategory_id] = (countMap[row.subcategory_id] || 0) + 1
    }

    const subcategoriesWithCount = (subcategoriesResult.data || []).map((sub) => ({
      ...sub,
      product_count: countMap[sub.id] || 0,
    }))

    return NextResponse.json(subcategoriesWithCount)
  } catch (error) {
    console.error('Error in subcategories GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('subcategories')
      .insert([{
        category_id: id,
        name: body.name,
        description: body.description || null,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating subcategory:', error)
      return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in subcategories POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
