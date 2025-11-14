'use client'

import { createClient } from './client'

export interface UploadFileOptions {
  bucket: string
  path: string
  file: Blob | File
  contentType?: string
}

export async function uploadFile(options: UploadFileOptions): Promise<{ url?: string; path?: string; error?: string }> {
  const { bucket, path, file, contentType } = options
  const supabase = createClient()

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: contentType || 'application/pdf',
        upsert: true // Overwrite if file exists
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      url: urlData.publicUrl,
      path: data.path
    }
  } catch (error) {
    console.error('Upload error:', error)
    return { error: 'Failed to upload file' }
  }
}

export async function deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Storage delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

export async function getFileUrl(bucket: string, path: string): Promise<{ url?: string; error?: string }> {
  const supabase = createClient()

  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return { url: data.publicUrl }
  } catch (error) {
    console.error('Get URL error:', error)
    return { error: 'Failed to get file URL' }
  }
}