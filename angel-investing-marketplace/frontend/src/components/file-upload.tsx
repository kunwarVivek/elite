import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  file: File;
  preview?: string;
  type: string;
  description?: string;
  uploadUrl?: string;
}

interface FileUploadProps {
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
  label?: string;
  required?: boolean;
  error?: string;
  documentTypeOptions?: Array<{ value: string; label: string }>;
}

/**
 * Reusable File Upload Component
 * Supports drag-and-drop, file preview, and document type selection
 */
export function FileUpload({
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  onFilesChange,
  files,
  label = 'Upload Documents',
  required = false,
  error,
  documentTypeOptions = [
    { value: 'tax_return', label: 'Tax Return' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'accreditation_certificate', label: 'Accreditation Certificate' },
    { value: 'proof_of_address', label: 'Proof of Address' },
    { value: 'investment_statement', label: 'Investment Statement' },
    { value: 'other', label: 'Other' },
  ],
}: FileUploadProps) {
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      const errors: string[] = [];

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejection) => {
          rejection.errors.forEach((err: any) => {
            if (err.code === 'file-too-large') {
              errors.push(`${rejection.file.name}: File is too large (max ${maxSize / 1024 / 1024}MB)`);
            } else if (err.code === 'file-invalid-type') {
              errors.push(`${rejection.file.name}: Invalid file type`);
            } else {
              errors.push(`${rejection.file.name}: ${err.message}`);
            }
          });
        });
      }

      // Check max files limit
      if (files.length + acceptedFiles.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        setUploadErrors(errors);
        return;
      }

      setUploadErrors(errors);

      // Create file objects with preview
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        type: 'other', // Default type, user can change
      }));

      onFilesChange([...files, ...newFiles]);
    },
    [files, maxFiles, maxSize, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
  });

  const removeFile = (index: number) => {
    const newFiles = [...files];
    // Revoke preview URL to avoid memory leaks
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  const updateFileType = (index: number, type: string) => {
    const newFiles = [...files];
    newFiles[index].type = type;
    onFilesChange(newFiles);
  };

  const updateFileDescription = (index: number, description: string) => {
    const newFiles = [...files];
    newFiles[index].description = description;
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      {/* Dropzone */}
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            error && 'border-red-500'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm font-medium mb-2">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum {maxFiles} files, up to {maxSize / 1024 / 1024}MB each. Accepted formats: PDF, JPG, PNG
          </p>
        </div>
      )}

      {/* Error Messages */}
      {(error || uploadErrors.length > 0) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {uploadErrors.map((err, idx) => (
              <div key={idx}>{err}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Uploaded Files ({files.length}/{maxFiles})</p>
          {files.map((uploadedFile, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {uploadedFile.preview ? (
                    <img
                      src={uploadedFile.preview}
                      alt="Preview"
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <File className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Document Type Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Document Type *</label>
                  <select
                    value={uploadedFile.type}
                    onChange={(e) => updateFileType(index, e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {documentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Description (Optional)</label>
                  <input
                    type="text"
                    value={uploadedFile.description || ''}
                    onChange={(e) => updateFileDescription(index, e.target.value)}
                    placeholder="e.g., 2023 Tax Return"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
