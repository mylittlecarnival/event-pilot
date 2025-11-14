import { NextRequest, NextResponse } from 'next/server'
import { getEstimateApprovalByHash } from '@/lib/api/estimate-approvals-server'

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

    const approval = await getEstimateApprovalByHash(hash)

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found or link has expired' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: approval })

  } catch (error) {
    console.error('Error fetching approval by hash:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval details' },
      { status: 500 }
    )
  }
}