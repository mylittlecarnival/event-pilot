import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const includeInternal = searchParams.get('includeInternal') === 'true'
    const defaultOnly = searchParams.get('default') === 'true'
    
    let query = supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .eq('active', true)
    
    // Filter out internal products unless explicitly requested
    if (!includeInternal) {
      query = query.eq('is_internal', false)
    }
    
    // Filter for default products only
    if (defaultOnly) {
      query = query.eq('is_default', true)
    }
    
    // Add search functionality
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`)
    }
    
    query = query.order('created_at', { ascending: false })

    const { data: products, error } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json(products || [])
  } catch (error) {
    console.error('Error in products API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('products')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in products POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
