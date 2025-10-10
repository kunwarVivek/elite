import React, { useCallback, useState } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentUpload } from '@/types/onboarding';

interface DocumentUploaderProps {
  onFileSelect: (file: File) => void;
  onFileRemove: (fileId: string) => void;
  uploadedFiles: DocumentUpload[];
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
  title?: string;
  description?: string;
  required?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return <Eye className="w-4 h-4" />;
  }
  return <File className="w-4 h-4" />;
};

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onFileSelect,
  onFileRemove,
  uploadedFiles,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize = 10,
  className,
  title = "Upload Documents",
  description = "Upload clear, high-quality images or PDFs of your documents",
  required = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type not supported. Please upload: ${acceptedTypes.map(type => type.split('/')[1]).join(', ')}`;
    }

    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    return null;
  };

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    const newFile: DocumentUpload = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'other',
      file,
      status: 'uploading',
      uploadProgress: 0,
    };

    onFileSelect(file);

    // Simulate upload progress
    const interval = setInterval(() => {
      newFile.uploadProgress = (newFile.uploadProgress || 0) + 10;
      if (newFile.uploadProgress >= 100) {
        clearInterval(interval);
        newFile.status = 'uploaded';
      }
    }, 100);
  }, [onFileSelect, acceptedTypes, maxSize]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const canUploadMore = uploadedFiles.length < maxFiles;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium">{title}</h3>
          {required && <span className="text-destructive">*</span>}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            'hover:border-primary/50 hover:bg-primary/5'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Drag and drop your files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}
              (Max {maxSize}MB each)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            Choose Files
          </Button>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInput}
            multiple={maxFiles > 1}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Requirements */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">Document Requirements:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Ensure documents are clear and legible</li>
          <li>• All text should be readable without magnification</li>
          <li>• Include all corners of the document in the image</li>
          <li>• Use good lighting (no shadows or glare)</li>
          <li>• File size should be under {maxSize}MB</li>
        </ul>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Uploaded Files:</h4>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center space-x-3 p-3 border rounded-lg bg-background"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(uploadedFile.file.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>

                  {/* Upload Progress */}
                  {uploadedFile.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={uploadedFile.uploadProgress} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploading... {uploadedFile.uploadProgress}%
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  {uploadedFile.status === 'uploaded' && (
                    <div className="flex items-center mt-1">
                      <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">Uploaded</span>
                    </div>
                  )}

                  {uploadedFile.status === 'verifying' && (
                    <div className="flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 text-yellow-500 mr-1" />
                      <span className="text-xs text-yellow-600">Verifying...</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {uploadedFile.status === 'uploaded' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* Preview functionality */}}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileRemove(uploadedFile.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Count */}
      <div className="text-xs text-muted-foreground">
        {uploadedFiles.length} of {maxFiles} files uploaded
        {required && uploadedFiles.length === 0 && (
          <span className="text-destructive ml-1">*</span>
        )}
      </div>
    </div>
  );
};