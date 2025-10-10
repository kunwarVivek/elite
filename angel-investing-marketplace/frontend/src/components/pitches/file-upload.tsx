import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileText,
  Image,
  Video,
  X,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/pitch-utils'

interface UploadedFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  url?: string
}

interface FileUploadProps {
  accept?: Record<string, string[]>
  maxSize?: number
  maxFiles?: number
  uploadedFiles: UploadedFile[]
  onFilesSelected: (files: File[]) => void
  onFileRemove: (fileId: string) => void
  onFileDownload?: (fileId: string) => void
  className?: string
  disabled?: boolean
}

export function FileUpload({
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt'],
    'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  uploadedFiles,
  onFilesSelected,
  onFileRemove,
  onFileDownload,
  className,
  disabled = false,
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        console.error('Rejected files:', rejectedFiles)
      }

      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles)
      }
    },
    [onFilesSelected]
  )

  const { getRootProps, getInputProps, isDragActive: dropzoneIsDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: maxFiles - uploadedFiles.length,
    disabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  })

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />
    }
    if (file.type.startsWith('video/')) {
      return <Video className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  const getFileStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const canUploadMore = uploadedFiles.length < maxFiles

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      {canUploadMore && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                dropzoneIsDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} />

              <Upload className={cn(
                "h-12 w-12 mx-auto mb-4",
                dropzoneIsDragActive ? "text-primary" : "text-muted-foreground"
              )} />

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {dropzoneIsDragActive
                    ? "Drop files here"
                    : "Drag & drop files here, or click to select"
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: PDF, Word, Excel, Images up to {formatFileSize(maxSize)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum {maxFiles} files
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4"
                disabled={disabled}
              >
                Choose Files
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Uploaded Files</h4>
                <Badge variant="outline">
                  {uploadedFiles.length} of {maxFiles}
                </Badge>
              </div>

              <div className="space-y-2">
                {uploadedFiles.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(uploadedFile.file)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {uploadedFile.file.name}
                        </p>
                        {getFileStatusIcon(uploadedFile.status)}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                        {uploadedFile.file.type && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">
                              {uploadedFile.file.type}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Upload Progress */}
                      {uploadedFile.status === 'uploading' && (
                        <div className="mt-2 space-y-1">
                          <Progress value={uploadedFile.progress} className="h-1" />
                          <p className="text-xs text-muted-foreground">
                            Uploading... {uploadedFile.progress}%
                          </p>
                        </div>
                      )}

                      {/* Error Message */}
                      {uploadedFile.status === 'error' && uploadedFile.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {uploadedFile.error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {uploadedFile.status === 'completed' && uploadedFile.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileDownload?.(uploadedFile.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFileRemove(uploadedFile.id)}
                        disabled={uploadedFile.status === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Guidelines */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Supported formats:</strong> PDF, Word, Excel, PowerPoint, Images</p>
        <p><strong>Maximum size:</strong> {formatFileSize(maxSize)} per file</p>
        <p><strong>Tip:</strong> Use clear, descriptive filenames for better organization</p>
      </div>
    </div>
  )
}

// Simplified file upload for single files
export function SimpleFileUpload({
  onFileSelect,
  accept,
  maxSize = 10 * 1024 * 1024,
  disabled = false,
  className,
}: {
  onFileSelect: (file: File) => void
  accept?: Record<string, string[]>
  maxSize?: number
  disabled?: boolean
  className?: string
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: 1,
    disabled,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-muted-foreground/50",
        isDragActive && "border-primary bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input {...getInputProps()} />

      <Upload className={cn(
        "h-8 w-8 mx-auto mb-2",
        isDragActive ? "text-primary" : "text-muted-foreground"
      )} />

      <p className="text-sm">
        {isDragActive ? "Drop file here" : "Click to upload or drag and drop"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Max size: {formatFileSize(maxSize)}
      </p>
    </div>
  )
}