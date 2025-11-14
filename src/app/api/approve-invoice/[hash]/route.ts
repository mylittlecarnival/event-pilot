import { NextRequest, NextResponse } from 'next/server'
import { getInvoiceApprovalByHash } from '@/lib/api/invoice-approvals-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params
    
    if (!hash) {
      return NextResponse.json(
        { error: 'Approval hash is required' },
        { status: 400 }
      )
    }

    const approval = await getInvoiceApprovalByHash(hash)

    if (!approval) {
      return NextResponse.json(
        { error: 'Invoice approval not found or link has expired' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: approval
    })

  } catch (error) {
    console.error('Error fetching invoice approval:', error)
    return NextResponse.json(
      { error: 'Failed to load invoice approval details' },
      { status: 500 }
    )
  }
}
