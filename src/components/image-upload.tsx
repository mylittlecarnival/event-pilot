'use client'

import { Button } from '@/components/button'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState, useRef } from 'react'

interface ImageUploadProps {
  value?: string
  onChange: (url: string | null) => void
  folder?: string
  accept?: string
  maxSize?: number // in MB
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  folder = 'images',
  accept = 'image/*',
  maxSize = 5,
  className = ''
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const res = await fetch('/api/s3/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')

      const { url } = await res.json()
      setPreview(url)
      onChange(url)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (preview) {
      try {
        await fetch('/api/s3/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: preview }),
        })
      } catch (error) {
        console.error('Error deleting image from S3:', error)
      }
    }
    setPreview(null)
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-zinc-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className="w-full h-48 border-2 border-dashed border-zinc-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 transition-colors"
        >
          <PhotoIcon className="w-12 h-12 text-zinc-400 mb-2" />
          <p className="text-zinc-500 text-sm">Click to upload image</p>
          <p className="text-zinc-400 text-xs">Max size: {maxSize}MB</p>
        </div>
      )}

      <Button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        plain
      >
        {uploading ? 'Uploading...' : preview ? 'Change Image' : 'Select Image'}
      </Button>
    </div>
  )
}

interface ImageGalleryProps {
  value?: string[]
  onChange: (urls: string[]) => void
  folder?: string
  maxImages?: number
  className?: string
}

export function ImageGallery({
  value = [],
  onChange,
  folder = 'gallery',
  maxImages = 10,
  className = ''
}: ImageGalleryProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    if (value.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)
    try {
      const uploadPromises = files.map(async (file) => {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large (max 5MB)`)
        }
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`)
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

        const res = await fetch('/api/s3/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')

        const { url } = await res.json()
        return url as string
      })

      const newUrls = await Promise.all(uploadPromises)
      onChange([...value, ...newUrls])
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Failed to upload images. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async (index: number) => {
    const urlToRemove = value[index]
    if (urlToRemove) {
      try {
        await fetch('/api/s3/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToRemove }),
        })
      } catch (error) {
        console.error('Error deleting image from S3:', error)
      }
    }
    const newUrls = value.filter((_, i) => i !== index)
    onChange(newUrls)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={`Gallery image ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-zinc-200"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < maxImages && (
        <Button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          plain
        >
          {uploading ? 'Uploading...' : 'Add Images'}
        </Button>
      )}

      <p className="text-xs text-zinc-500">
        {value.length} / {maxImages} images uploaded
      </p>
    </div>
  )
}
