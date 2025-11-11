import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

interface Document {
  id: string
  name: string
  url: string
  type?: string
  size?: number
  uploadedAt?: string
}

interface DocumentListProps {
  documents: Document[]
  title?: string
  onDownload?: (doc: Document) => void
  onView?: (doc: Document) => void
  emptyMessage?: string
}

export function DocumentList({
  documents,
  title = 'Documents',
  onDownload,
  onView,
  emptyMessage = 'No documents available',
}: DocumentListProps) {
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {doc.size && <span>{formatFileSize(doc.size)}</span>}
                    {doc.uploadedAt && (
                      <>
                        <span>•</span>
                        <span>{format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {onView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(doc)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                {onDownload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
