import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'

let _s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.AWS_S3_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _s3Client
}

function getBucket(): string {
  return process.env.AWS_S3_BUCKET_NAME!
}

function getRegion(): string {
  return process.env.AWS_S3_REGION!
}

function getPublicUrl(key: string): string {
  return `https://${getBucket()}.s3.${getRegion()}.amazonaws.com/${key}`
}

function extractKeyFromUrl(url: string): string | null {
  const prefix = `https://${getBucket()}.s3.${getRegion()}.amazonaws.com/`
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length)
  }
  return null
}

export async function uploadToS3(file: Buffer, folder: string, ext: string): Promise<string> {
  const hash = createHash('sha256').update(file).digest('hex')
  const key = `${folder}/${hash}.${ext}`

  await getS3Client().send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: file,
    ContentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  }))

  return getPublicUrl(key)
}

export async function deleteFromS3(url: string): Promise<void> {
  const key = extractKeyFromUrl(url)
  if (!key) return

  await getS3Client().send(new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }))
}

export async function deleteMultipleFromS3(urls: string[]): Promise<void> {
  const keys = urls.map(extractKeyFromUrl).filter((k): k is string => k !== null)
  if (keys.length === 0) return

  await getS3Client().send(new DeleteObjectsCommand({
    Bucket: getBucket(),
    Delete: {
      Objects: keys.map(Key => ({ Key })),
    },
  }))
}
