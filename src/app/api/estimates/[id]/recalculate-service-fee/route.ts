import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Call the stored procedure to update service fee for this estimate
    const { error } = await supabase.rpc('update_service_fee_for_estimate', {
      estimate_id_param: id
    })

    if (error) {
      console.error('Error recalculating service fee:', error)
      return NextResponse.json({ error: 'Failed to recalculate service fee' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/estimates/[id]/recalculate-service-fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}