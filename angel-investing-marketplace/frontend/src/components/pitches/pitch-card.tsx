import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Eye,
  MessageCircle,
  Users,
  TrendingUp,
  ExternalLink,
  Heart,
  Share2,
  MoreHorizontal,
  Calendar,
  DollarSign,
  Target
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, formatPercentage, formatRelativeTime, calculateFundingProgress } from '@/lib/pitch-utils'
import type { Pitch } from '@/types/pitch'

interface PitchCardProps {
  pitch: Pitch
  variant?: 'default' | 'compact' | 'featured'
  showActions?: boolean
  onView?: (pitchId: string) => void
  onLike?: (pitchId: string) => void
  onShare?: (pitchId: string) => void
}

export function PitchCard({
  pitch,
  variant = 'default',
  showActions = true,
  onView,
  onLike,
  onShare
}: PitchCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const fundingProgress = calculateFundingProgress(pitch)

  const handleView = () => {
    onView?.(pitch.id)
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    onLike?.(pitch.id)
  }

  const handleShare = () => {
    onShare?.(pitch.id)
  }

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleView}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm truncate">{pitch.title}</h3>
                <Badge variant={fundingProgress.percentage >= 100 ? "default" : "secondary"} className="text-xs">
                  {pitch.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{pitch.startup?.name}</span>
                <span>{formatCurrency(pitch.funding_amount)}</span>
                <span>{pitch.view_count} views</span>
              </div>
            </div>

            {showActions && (
              <div className="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleLike() }}>
                  <Heart className={`h-3 w-3 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleShare() }}>
                  <Share2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'featured') {
    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20" onClick={handleView}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={pitch.startup?.logo_url} />
                <AvatarFallback>
                  {pitch.startup?.name?.slice(0, 2).toUpperCase() || 'ST'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg leading-tight">{pitch.title}</h3>
                <p className="text-sm text-muted-foreground">{pitch.startup?.name}</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-primary to-primary/80">
              Featured
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {pitch.summary}
          </p>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(pitch.funding_amount)}
              </p>
              <p className="text-xs text-muted-foreground">Target</p>
            </div>
            <div>
              <p className="text-lg font-bold">
                {formatPercentage(pitch.equity_offered)}
              </p>
              <p className="text-xs text-muted-foreground">Equity</p>
            </div>
            <div>
              <p className="text-lg font-bold">
                {fundingProgress.percentage.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">Funded</p>
            </div>
          </div>

          <Progress value={fundingProgress.percentage} className="h-2" />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{pitch.view_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{pitch.comments?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{pitch.investment_summary?.investor_count || 0}</span>
              </div>
            </div>

            <span>{formatRelativeTime(pitch.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleView}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={pitch.startup?.logo_url} />
              <AvatarFallback className="text-xs">
                {pitch.startup?.name?.slice(0, 2).toUpperCase() || 'ST'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base leading-tight truncate">
                {pitch.title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {pitch.startup?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs">
              {pitch.status}
            </Badge>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Pitch
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Heart className="h-4 w-4 mr-2" />
                    Save for Later
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {pitch.summary}
        </p>

        {/* Funding Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Funding Progress</span>
            <span className="text-muted-foreground">
              {formatCurrency(pitch.investment_summary?.total_invested || 0)} raised
            </span>
          </div>
          <Progress value={fundingProgress.percentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{fundingProgress.percentage.toFixed(0)}% funded</span>
            <span>{formatCurrency(pitch.funding_amount)} goal</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
            </div>
            <p className="text-sm font-semibold">
              {formatCurrency(pitch.funding_amount)}
            </p>
            <p className="text-xs text-muted-foreground">Target</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Target className="h-3 w-3" />
            </div>
            <p className="text-sm font-semibold">
              {formatPercentage(pitch.equity_offered)}
            </p>
            <p className="text-xs text-muted-foreground">Equity</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Eye className="h-3 w-3" />
            </div>
            <p className="text-sm font-semibold">{pitch.view_count}</p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
            </div>
            <p className="text-sm font-semibold">
              {pitch.investment_summary?.investor_count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Investors</p>
          </div>
        </div>

        {/* Tags */}
        {pitch.startup?.industry && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {pitch.startup.industry}
            </Badge>
            {pitch.startup?.stage && (
              <Badge variant="outline" className="text-xs">
                {pitch.startup.stage}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatRelativeTime(pitch.created_at)}</span>
          </div>

          {showActions && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleLike() }}
              >
                <Heart className={`h-3 w-3 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleShare() }}
              >
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}