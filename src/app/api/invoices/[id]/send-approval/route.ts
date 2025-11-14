import { NextRequest, NextResponse } from 'next/server'
import { sendInvoiceForApproval } from '@/lib/api/invoice-approvals-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params
    const body = await request.json()
    const { contact_id, customMessage, due_date } = body

    console.log('Received invoice approval request:', { invoiceId, contact_id, customMessage, due_date })

    if (!invoiceId || !contact_id) {
      console.error('Missing required fields:', { invoiceId, contact_id })
      return NextResponse.json(
        { error: 'Invoice ID and Contact ID are required' },
        { status: 400 }
      )
    }

    // Temporarily make due_date optional to test
    const approval = await sendInvoiceForApproval(invoiceId, contact_id, customMessage, due_date)

    return NextResponse.json({
      success: true,
      data: approval
    })

  } catch (error) {
    console.error('Error sending invoice for approval:', error)
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invoice for approval' },
      { status: 500 }
    )
  }
}
