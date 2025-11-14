import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    return NextResponse.json(organizations || [])
  } catch (error) {
    console.error('Error in organizations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('organizations')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error('Error creating organization:', error)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in organizations POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
