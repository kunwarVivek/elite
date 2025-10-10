import React, { useState, useRef, KeyboardEvent } from 'react';
import { Paperclip, Send, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 2000,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      textareaRef.current?.focus();
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newAttachments = Array.from(files);
      const validAttachments = newAttachments.filter(file => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          return false;
        }

        // Validate file type
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/zip',
        ];

        if (!allowedTypes.includes(file.type)) {
          alert(`File ${file.name} has an unsupported format.`);
          return false;
        }

        return true;
      });

      setAttachments(prev => [...prev, ...validAttachments]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* File Attachments Preview */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                <Paperclip className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input Area */}
        <div
          className={`relative border rounded-lg transition-colors ${
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className="min-h-[44px] max-h-32 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 pr-20"
            rows={1}
          />

          {/* Character Count */}
          {message.length > maxLength * 0.8 && (
            <div className="absolute bottom-2 left-3 text-xs text-gray-400">
              {message.length}/{maxLength}
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute bottom-2 right-2 flex items-center space-x-1">
            {/* File Attachment Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>

            {/* Emoji Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={disabled}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add emoji</TooltipContent>
            </Tooltip>

            {/* Send Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleSendMessage}
                  disabled={disabled || (!message.trim() && attachments.length === 0)}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message (Enter)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip"
        />

        {/* Drag and Drop Hint */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center pointer-events-none">
            <div className="text-center text-blue-600">
              <Paperclip className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Drop files here to attach</p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};