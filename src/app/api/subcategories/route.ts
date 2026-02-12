import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const [subcategoriesResult, countsResult] = await Promise.all([
      supabase
        .from('subcategories')
        .select('*')
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
    console.error('Error in subcategories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
