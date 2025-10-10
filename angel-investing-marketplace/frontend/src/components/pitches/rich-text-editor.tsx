import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxLength?: number
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  disabled = false,
  maxLength,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    setCharCount(value.length)
  }, [value])

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    updateContent()
  }

  const updateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML
      onChange(content)
      setCharCount(content.length)
    }
  }

  const handleInput = () => {
    updateContent()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key for new paragraphs
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      execCommand('insertParagraph')
    }

    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      execCommand('indent')
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    execCommand('insertText', text)
  }

  const isCommandActive = (command: string): boolean => {
    return document.queryCommandState(command)
  }

  const getSelectionText = (): string => {
    return window.getSelection()?.toString() || ''
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      execCommand('insertImage', url)
    }
  }

  const formatButtons = [
    { command: 'bold', icon: Bold, tooltip: 'Bold (Ctrl+B)' },
    { command: 'italic', icon: Italic, tooltip: 'Italic (Ctrl+I)' },
    { command: 'underline', icon: Underline, tooltip: 'Underline (Ctrl+U)' },
  ]

  const listButtons = [
    { command: 'insertUnorderedList', icon: List, tooltip: 'Bullet List' },
    { command: 'insertOrderedList', icon: ListOrdered, tooltip: 'Numbered List' },
  ]

  const headingButtons = [
    { command: 'formatBlock', value: 'h1', icon: Heading1, tooltip: 'Heading 1' },
    { command: 'formatBlock', value: 'h2', icon: Heading2, tooltip: 'Heading 2' },
    { command: 'formatBlock', value: 'h3', icon: Heading3, tooltip: 'Heading 3' },
  ]

  const alignmentButtons = [
    { command: 'justifyLeft', icon: AlignLeft, tooltip: 'Align Left' },
    { command: 'justifyCenter', icon: AlignCenter, tooltip: 'Align Center' },
    { command: 'justifyRight', icon: AlignRight, tooltip: 'Align Right' },
  ]

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="border-b p-3">
          <div className="flex flex-wrap items-center gap-1">
            {/* Text Formatting */}
            <div className="flex items-center gap-1 mr-2">
              {formatButtons.map(({ command, icon: Icon, tooltip }) => (
                <Button
                  key={command}
                  type="button"
                  variant={isCommandActive(command) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => execCommand(command)}
                  disabled={disabled}
                  title={tooltip}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Headings */}
            <div className="flex items-center gap-1 mr-2">
              {headingButtons.map(({ command, value, icon: Icon, tooltip }) => (
                <Button
                  key={`${command}-${value}`}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand(command, value)}
                  disabled={disabled}
                  title={tooltip}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Lists */}
            <div className="flex items-center gap-1 mr-2">
              {listButtons.map(({ command, icon: Icon, tooltip }) => (
                <Button
                  key={command}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand(command)}
                  disabled={disabled}
                  title={tooltip}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Alignment */}
            <div className="flex items-center gap-1 mr-2">
              {alignmentButtons.map(({ command, icon: Icon, tooltip }) => (
                <Button
                  key={command}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand(command)}
                  disabled={disabled}
                  title={tooltip}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Special Actions */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={insertLink}
                disabled={disabled}
                title="Insert Link"
              >
                <Link className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={insertImage}
                disabled={disabled}
                title="Insert Image"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('formatBlock', 'blockquote')}
                disabled={disabled}
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable={!disabled}
            className={cn(
              "min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none",
              "prose-headings:font-semibold prose-headings:text-foreground",
              "prose-p:text-foreground prose-p:leading-relaxed",
              "prose-strong:text-foreground prose-strong:font-semibold",
              "prose-em:text-foreground",
              "prose-ul:text-foreground prose-ol:text-foreground",
              "prose-li:text-foreground prose-li:leading-relaxed",
              "prose-blockquote:text-muted-foreground prose-blockquote:border-l-muted-foreground",
              "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setIsActive(true)}
            onBlur={() => setIsActive(false)}
            dangerouslySetInnerHTML={{ __html: value }}
            data-placeholder={isActive || value ? '' : placeholder}
            style={{
              '--placeholder-color': 'rgb(148 163 184)',
            } as React.CSSProperties}
          />

          {/* Character Count */}
          {maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              {charCount}/{maxLength}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Simple text editor for basic formatting needs
export function SimpleTextEditor({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  maxLength,
}: RichTextEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={cn(
        "w-full min-h-[120px] p-3 border rounded-md resize-none",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  )
}