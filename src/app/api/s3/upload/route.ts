import { uploadToS3 } from '@/lib/s3'
import { NextResponse } from 'next/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'images'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be less than 5MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const url = await uploadToS3(buffer, folder, ext)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('S3 upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
