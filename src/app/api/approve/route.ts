import { NextRequest, NextResponse } from 'next/server'
import { updateEstimateApprovalStatus } from '@/lib/api/estimate-approvals-server'
import { logEstimateActionServer } from '@/lib/api/activity-logs-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { approval_hash, status, contact_response, signature } = body

    // Validate required fields
    if (!approval_hash || !status) {
      return NextResponse.json(
        { error: 'Approval hash and status are required' },
        { status: 400 }
      )
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // If rejecting, contact_response should be provided
    if (status === 'rejected' && !contact_response?.trim()) {
      return NextResponse.json(
        { error: 'A reason is required when rejecting an estimate' },
        { status: 400 }
      )
    }

    // If approving, signature should be provided
    if (status === 'approved' && !signature) {
      return NextResponse.json(
        { error: 'A digital signature is required when approving an estimate' },
        { status: 400 }
      )
    }

    // Update the approval status
    const updatedApproval = await updateEstimateApprovalStatus(
      approval_hash,
      status,
      contact_response,
      signature
    )

    // Note: Estimate status is automatically updated by database trigger when approval status changes

    // Create activity log entry
    if (updatedApproval.estimate_id) {
      try {
        const contactName = `${updatedApproval.contacts?.first_name || ''} ${updatedApproval.contacts?.last_name || ''}`.trim()

        await logEstimateActionServer(
          updatedApproval.estimate_id,
          status === 'approved' ? 'Approved by Customer' : 'Rejected by Customer',
          {
            contact_email: updatedApproval.contacts?.email,
            contact_name: contactName,
            contact_response: contact_response || null,
            responded_at: updatedApproval.responded_at
          }
        )
      } catch (error) {
        console.error('Failed to log approval response activity:', error)
      }
    }

    // TODO: Send notification email to estimate creator

    return NextResponse.json({
      success: true,
      data: {
        status: updatedApproval.status,
        responded_at: updatedApproval.responded_at
      }
    })

  } catch (error) {
    console.error('Error processing approval:', error)

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Failed to update estimate approval')) {
        return NextResponse.json(
          { error: 'Invalid approval link or approval has already been processed' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}