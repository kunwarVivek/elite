import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Lightbulb,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Target,
  Clock,
} from 'lucide-react'
import { PitchForm } from '@/components/pitches/pitch-form'

export function CreatePitch() {
  const navigate = useNavigate()

  const handleSuccess = (pitchId: string) => {
    navigate({ to: '/pitches/$id', params: { id: pitchId } })
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/pitches' })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Pitch</h1>
            <p className="text-muted-foreground mt-1">
              Create a compelling investment pitch to attract angel investors
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-sm">
          Step-by-step creation
        </Badge>
      </div>

      {/* Getting Started Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Plan Your Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Before starting, gather your key metrics, financial projections, and competitive analysis. A well-prepared pitch performs better.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-blue-500" />
              Know Your Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Focus on what matters to angel investors: problem-solution fit, market opportunity, and your team's ability to execute.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-green-500" />
              Take Your Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You can save drafts and return later. Most founders take 2-3 sessions to complete a comprehensive pitch.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Creation Process Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Creation Process</CardTitle>
          <CardDescription>
            Here's what you'll need to complete your pitch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <div>
                <p className="font-medium text-sm">Basic Information</p>
                <p className="text-xs text-muted-foreground">Title, summary, funding details</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">2</span>
              </div>
              <div>
                <p className="font-medium text-sm">Pitch Content</p>
                <p className="text-xs text-muted-foreground">Problem, solution, market opportunity</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">3</span>
              </div>
              <div>
                <p className="font-medium text-sm">Financial Projections</p>
                <p className="text-xs text-muted-foreground">Revenue forecasts, cost structure</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">4</span>
              </div>
              <div>
                <p className="font-medium text-sm">Team Information</p>
                <p className="text-xs text-muted-foreground">Founder and team member details</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">5</span>
              </div>
              <div>
                <p className="font-medium text-sm">Supporting Documents</p>
                <p className="text-xs text-muted-foreground">Pitch deck, financials, legal docs</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
                <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">6</span>
              </div>
              <div>
                <p className="font-medium text-sm">Review & Submit</p>
                <p className="text-xs text-muted-foreground">Final review and publication</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Before you start:</strong> Make sure you have your startup profile set up and verified.
          You'll need to provide accurate financial projections and have supporting documents ready.
        </AlertDescription>
      </Alert>

      {/* Creation Form */}
      <PitchForm onSuccess={handleSuccess} />

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Resources to help you create a compelling pitch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Pitch Creation Guides</h4>
              <div className="space-y-2 text-sm">
                <Button variant="link" className="h-auto p-0 text-left justify-start">
                  • How to Write a Compelling Problem Statement
                </Button>
                <Button variant="link" className="h-auto p-0 text-left justify-start">
                  • Financial Projections Best Practices
                </Button>
                <Button variant="link" className="h-auto p-0 text-left justify-start">
                  • Creating an Effective Pitch Deck
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Platform Support</h4>
              <div className="space-y-2 text-sm">
                <Button variant="link" className="h-auto p-0 text-left justify-start">
                  • Pitch Review Process Explained
                </Button>
                <Button variant="link" className="h-auto p-0 text-left justify-start">
                  • Document Upload Requirements
                </Button>
                <Button variant="link" className="h-auto p-0 text-left justify-start">
                  • Contact Support Team
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}