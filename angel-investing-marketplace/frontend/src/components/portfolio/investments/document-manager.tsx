import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Plus,
  AlertCircle,
  CheckCircle,
  File,
  Image,
  Video,
  Archive
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { usePortfolioDocuments, useUploadPortfolioDocument, useDeletePortfolioDocument } from '@/hooks/use-portfolio'
import { formatDate, formatCompactNumber } from '@/lib/portfolio-utils'

interface DocumentManagerProps {
  portfolioId: string
  investmentName?: string
}

interface Document {
  id: string
  name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_at: string
  download_count: number
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
  if (fileType.includes('image')) return <Image className="h-4 w-4 text-blue-500" />
  if (fileType.includes('video')) return <Video className="h-4 w-4 text-purple-500" />
  if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-4 w-4 text-yellow-500" />
  return <File className="h-4 w-4 text-gray-500" />
}

function getFileTypeColor(fileType: string) {
  switch (fileType) {
    case 'PITCH_DECK': return 'bg-blue-100 text-blue-800'
    case 'BUSINESS_PLAN': return 'bg-green-100 text-green-800'
    case 'FINANCIAL_STATEMENT': return 'bg-purple-100 text-purple-800'
    case 'LEGAL_DOCUMENT': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function UploadDialog({
  isOpen,
  onClose,
  onUpload,
  isUploading
}: {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File, documentType: string) => void
  isUploading: boolean
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<string>('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'text/*': ['.txt']
    }
  })

  const handleUpload = () => {
    if (selectedFile && documentType) {
      onUpload(selectedFile, documentType)
      setSelectedFile(null)
      setDocumentType('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload investment-related documents and agreements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Type</label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PITCH_DECK">Pitch Deck</SelectItem>
                <SelectItem value="BUSINESS_PLAN">Business Plan</SelectItem>
                <SelectItem value="FINANCIAL_STATEMENT">Financial Statement</SelectItem>
                <SelectItem value="LEGAL_DOCUMENT">Legal Document</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="space-y-2">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCompactNumber(selectedFile.size)} bytes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="font-medium">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to select a file
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !documentType || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DocumentTableRow({
  document,
  onDownload,
  onDelete
}: {
  document: Document
  onDownload: (document: Document) => void
  onDelete: (documentId: string) => void
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center space-x-3">
          {getFileIcon(document.file_type)}
          <div>
            <div className="font-medium">{document.name}</div>
            <div className="text-sm text-muted-foreground">
              {formatCompactNumber(document.file_size)} • Uploaded {formatDate(document.uploaded_at)}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Badge className={getFileTypeColor(document.file_type)}>
          {document.file_type.replace(/_/g, ' ')}
        </Badge>
      </TableCell>

      <TableCell className="text-center">
        {document.download_count}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => onDownload(document)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(document.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function DocumentTableSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-4 w-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><div className="flex justify-end space-x-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function DocumentManager({ portfolioId, investmentName }: DocumentManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const {
    data: documentsResponse,
    isLoading,
    error,
    refetch
  } = usePortfolioDocuments(portfolioId)

  const uploadMutation = useUploadPortfolioDocument()
  const deleteMutation = useDeletePortfolioDocument()

  const documents = documentsResponse?.data || []

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.file_type === typeFilter
    return matchesSearch && matchesType
  })

  const handleFileUpload = async (file: File, documentType: string) => {
    try {
      await uploadMutation.mutateAsync({
        portfolioId,
        file,
        documentType
      })
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleFileDownload = (document: Document) => {
    window.open(document.file_url, '_blank')
  }

  const handleFileDelete = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteMutation.mutateAsync({ portfolioId, documentId })
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Management
          </CardTitle>
          <CardDescription>
            Manage documents for {investmentName || 'your investments'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              <p>Unable to load documents</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Management
            </CardTitle>
            <CardDescription>
              Manage documents for {investmentName || 'your investments'}
            </CardDescription>
          </div>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="PITCH_DECK">Pitch Deck</SelectItem>
              <SelectItem value="BUSINESS_PLAN">Business Plan</SelectItem>
              <SelectItem value="FINANCIAL_STATEMENT">Financial</SelectItem>
              <SelectItem value="LEGAL_DOCUMENT">Legal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <DocumentTableSkeleton />
              </TableBody>
            </Table>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || typeFilter !== 'all' ? (
              <div>
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents match your filters</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm('')
                    setTypeFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div>
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Upload investment documents to get started</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <DocumentTableRow
                    key={document.id}
                    document={document}
                    onDownload={handleFileDownload}
                    onDelete={handleFileDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <UploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUpload={handleFileUpload}
        isUploading={uploadMutation.isPending}
      />
    </Card>
  )
}