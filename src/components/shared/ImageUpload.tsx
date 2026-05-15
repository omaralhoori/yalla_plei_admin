import { useRef, useState } from 'react'
import { Upload, X, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { ApiResponse, UploadResponse } from '@/types/api'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  label?: string
}

export default function ImageUpload({ value, onChange, label = 'Upload Image' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post<ApiResponse<UploadResponse>>('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.data.url)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-24 w-24 rounded-lg object-cover border"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 rounded-full bg-destructive text-white w-5 h-5 flex items-center justify-center hover:bg-destructive/90"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
          <Image className="w-8 h-8 text-muted-foreground/50" />
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        {isUploading ? 'Uploading...' : label}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
