import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ResponsiveImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  aspectRatio?: 'square' | 'video' | 'wide' | 'tall' | number
}

export function ResponsiveImage({
  src,
  alt,
  className,
  width,
  height,
  sizes,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  objectFit = 'cover',
  aspectRatio,
}: ResponsiveImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square'
      case 'video':
        return 'aspect-video'
      case 'wide':
        return 'aspect-[21/9]'
      case 'tall':
        return 'aspect-[3/4]'
      default:
        if (typeof aspectRatio === 'number') {
          return `aspect-[${aspectRatio}]`
        }
        return ''
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center justify-center text-muted-foreground',
          getAspectRatioClass(),
          className
        )}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', getAspectRatioClass(), className)}>
      {isLoading && (
        <Skeleton className="absolute inset-0 z-10" />
      )}

      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        quality={quality}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          objectFit && `object-${objectFit}`,
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          objectFit,
        }}
      />
    </div>
  )
}

// Specialized image components for common use cases
export function AvatarImage({
  src,
  alt,
  size = 'md',
  className,
  ...props
}: ResponsiveImageProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <ResponsiveImage
      {...props}
      src={src}
      alt={alt}
      className={cn(
        'rounded-full',
        sizeClasses[size],
        className
      )}
      aspectRatio="square"
      objectFit="cover"
    />
  )
}

export function CardImage({
  src,
  alt,
  className,
  ...props
}: ResponsiveImageProps) {
  return (
    <ResponsiveImage
      {...props}
      src={src}
      alt={alt}
      className={cn(
        'rounded-t-lg',
        className
      )}
      aspectRatio="video"
      objectFit="cover"
    />
  )
}

export function HeroImage({
  src,
  alt,
  className,
  ...props
}: ResponsiveImageProps) {
  return (
    <ResponsiveImage
      {...props}
      src={src}
      alt={alt}
      className={cn(
        'rounded-lg',
        className
      )}
      aspectRatio="wide"
      objectFit="cover"
      priority={true}
    />
  )
}

export function GalleryImage({
  src,
  alt,
  className,
  ...props
}: ResponsiveImageProps) {
  return (
    <ResponsiveImage
      {...props}
      src={src}
      alt={alt}
      className={cn(
        'rounded-lg cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
      aspectRatio="square"
      objectFit="cover"
    />
  )
}

// Background image component with responsive sizing
export function BackgroundImage({
  src,
  children,
  className,
  ...props
}: ResponsiveImageProps & { children?: React.ReactNode }) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <ResponsiveImage
        {...props}
        src={src}
        alt=""
        className="absolute inset-0 z-0"
        aspectRatio={undefined}
        objectFit="cover"
        priority={true}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}