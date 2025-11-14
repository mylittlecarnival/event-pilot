import { NextRequest, NextResponse } from 'next/server'
import { sendEstimateForApproval } from '@/lib/api/estimate-approvals-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params
    const body = await request.json()
    const { contact_id, customMessage, due_date } = body

    console.log('Received approval request:', { estimateId, contact_id, customMessage, due_date })

    if (!estimateId || !contact_id) {
      console.error('Missing required fields:', { estimateId, contact_id })
      return NextResponse.json(
        { error: 'Estimate ID and Contact ID are required' },
        { status: 400 }
      )
    }

    // Temporarily make due_date optional to test
    const approval = await sendEstimateForApproval(estimateId, contact_id, customMessage, due_date)

    return NextResponse.json({
      success: true,
      data: approval
    })

  } catch (error) {
    console.error('Error sending estimate for approval:', error)
    return NextResponse.json(
      { error: 'Failed to send estimate for approval' },
      { status: 500 }
    )
  }
}