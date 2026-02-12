import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch categories, product counts, and subcategory counts separately to avoid PostgREST join issues
    const [categoriesResult, productCountsResult, subcategoryCountsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      supabase
        .from('product_categories')
        .select('category_id'),
      supabase
        .from('subcategories')
        .select('category_id')
        .is('deleted_at', null),
    ])

    if (categoriesResult.error) {
      console.error('Error fetching categories:', categoriesResult.error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Build product count map from junction rows
    const productCountMap: Record<string, number> = {}
    for (const row of productCountsResult.data || []) {
      productCountMap[row.category_id] = (productCountMap[row.category_id] || 0) + 1
    }

    // Build subcategory count map
    const subcategoryCountMap: Record<string, number> = {}
    for (const row of subcategoryCountsResult.data || []) {
      subcategoryCountMap[row.category_id] = (subcategoryCountMap[row.category_id] || 0) + 1
    }

    const categoriesWithCount = (categoriesResult.data || []).map((category) => ({
      ...category,
      product_count: productCountMap[category.id] || 0,
      subcategory_count: subcategoryCountMap[category.id] || 0,
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
