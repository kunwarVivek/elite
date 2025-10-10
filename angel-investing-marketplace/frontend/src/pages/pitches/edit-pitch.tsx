import { useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Save,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Pause,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePitch, useUpdatePitch, usePublishPitch, usePausePitch } from '@/hooks/use-pitch'
import { PitchForm } from '@/components/pitches/pitch-form'
import { PitchStatusBadge } from '@/components/pitches/pitch-status-badge'
import { formatRelativeTime } from '@/lib/pitch-utils'

export function EditPitch() {
  const { id } = useParams({ from: '/pitches/$id/edit' })
  const navigate = useNavigate()
  const { data: pitch, isLoading, error, fetchPitch } = usePitch(id)
  const updatePitchMutation = useUpdatePitch()
  const publishPitchMutation = usePublishPitch()
  const pausePitchMutation = usePausePitch()

  useEffect(() => {
    if (id) {
      fetchPitch()
    }
  }, [id, fetchPitch])

  const handleUpdateSuccess = (updatedPitchId: string) => {
    toast.success('Pitch updated successfully!')
    navigate({ to: '/pitches/$id', params: { id: updatedPitchId } })
  }

  const handlePublish = async () => {
    try {
      await publishPitchMutation.mutateAsync(id)
      toast.success('Pitch published successfully!')
      fetchPitch() // Refresh the pitch data
    } catch (error) {
      toast.error('Failed to publish pitch')
    }
  }

  const handlePause = async () => {
    try {
      await pausePitchMutation.mutateAsync(id)
      toast.success('Pitch paused successfully!')
      fetchPitch() // Refresh the pitch data
    } catch (error) {
      toast.error('Failed to pause pitch')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <Card>
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !pitch) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">Failed to load pitch for editing</p>
            <Button onClick={() => fetchPitch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/pitches/$id', params: { id } })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pitch
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Pitch</h1>
            <p className="text-muted-foreground mt-1">
              Make changes to your pitch details and content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PitchStatusBadge status={pitch.status} />
          <span className="text-sm text-muted-foreground">
            Last updated {formatRelativeTime(pitch.updated_at)}
          </span>
        </div>
      </div>

      {/* Status Alerts */}
      {pitch.status === 'DRAFT' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your pitch is currently in draft mode. Complete your edits and publish it to make it visible to investors.
          </AlertDescription>
        </Alert>
      )}

      {pitch.status === 'UNDER_REVIEW' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Your pitch is currently under review by our team. You'll be notified once it's approved for publication.
          </AlertDescription>
        </Alert>
      )}

      {pitch.status === 'ACTIVE' && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Your pitch is active and visible to investors. Any changes you make will require re-review before publication.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions for Active Pitches */}
      {pitch.status === 'ACTIVE' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your active pitch status and visibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handlePause}
                disabled={pausePitchMutation.isPending}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause Pitch
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate({ to: '/pitches/$id/analytics', params: { id } })}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Analytics
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate({ to: '/pitches/$id', params: { id } })}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Pitch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      <PitchForm
        key={pitch.id} // Force re-render when pitch changes
        startupId={pitch.startup_id}
        onSuccess={handleUpdateSuccess}
      />

      {/* Important Notes */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-amber-800 dark:text-amber-200">
            Important Editing Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
          <p>• Changes to active pitches require re-review before publication</p>
          <p>• Draft pitches can be edited freely without review</p>
          <p>• All edits are automatically saved as drafts</p>
          <p>• Consider how changes might affect investor perception</p>
        </CardContent>
      </Card>
    </div>
  )
}