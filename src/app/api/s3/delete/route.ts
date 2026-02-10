import { deleteFromS3, deleteMultipleFromS3 } from '@/lib/s3'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, urls } = body as { url?: string; urls?: string[] }

    if (urls && Array.isArray(urls)) {
      await deleteMultipleFromS3(urls)
    } else if (url) {
      await deleteFromS3(url)
    } else {
      return NextResponse.json({ error: 'Provide url or urls' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('S3 delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
