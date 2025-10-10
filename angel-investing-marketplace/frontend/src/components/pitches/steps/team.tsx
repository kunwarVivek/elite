import { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Trash2, Linkedin, Award } from 'lucide-react'
import type { PitchFormData } from '@/hooks/use-pitch-form'

interface TeamStepProps {
  form: UseFormReturn<PitchFormData>
}

interface TeamMember {
  name: string
  role: string
  bio: string
  linkedin_url?: string
  experience_years?: number
}

export function TeamStep({ form }: TeamStepProps) {
  // For now, we'll handle team as a simple optional field
  // In a full implementation, this would be a dynamic array of team members

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Information
        </CardTitle>
        <CardDescription>
          Highlight your team's expertise and track record. Strong teams are crucial for investor confidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Founder Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Founder & Key Team Members</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Founder Name */}
            <FormField
              control={form.control}
              name="founder_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Founder/CEO Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Smith"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Primary founder or CEO name
                  </p>
                </FormItem>
              )}
            />

            {/* Founder Experience */}
            <FormField
              control={form.control}
              name="founder_experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Years of Experience
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Relevant industry experience
                  </p>
                </FormItem>
              )}
            />
          </div>

          {/* Founder Background */}
          <FormField
            control={form.control}
            name="founder_background"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">
                  Founder Background & Expertise
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the founder's background, relevant experience, previous startups, education, and why they're qualified to lead this venture..."
                    className="min-h-[120px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Highlight relevant experience, previous successes, and domain expertise.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Team Size & Structure */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Team Overview</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Team Size */}
            <FormField
              control={form.control}
              name="current_team_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Current Team Size
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="5"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Total number of team members
                  </p>
                </FormItem>
              )}
            />

            {/* Technical Team Members */}
            <FormField
              control={form.control}
              name="technical_team_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Technical Team Members
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="3"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Developers, engineers, data scientists
                  </p>
                </FormItem>
              )}
            />

            {/* Business Team Members */}
            <FormField
              control={form.control}
              name="business_team_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Business Team Members
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Marketing, sales, operations
                  </p>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Key Team Members */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Key Team Members</h3>
            <Badge variant="outline">
              Optional - Add later if needed
            </Badge>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="font-medium mb-2">Team Member Profiles</h4>
            <p className="text-sm text-muted-foreground mb-4">
              In the full implementation, you would add detailed profiles for each key team member including their background, experience, and LinkedIn profiles.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Typical Information:</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Name and position</li>
                  <li>• Professional background</li>
                  <li>• Relevant experience</li>
                  <li>• Previous companies</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Optional Details:</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Education</li>
                  <li>• LinkedIn profile</li>
                  <li>• Notable achievements</li>
                  <li>• Why they're passionate about this venture</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Advisors & Mentors */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Advisors & Board Members</h3>

          <FormField
            control={form.control}
            name="advisors"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Key Advisors or Board Members
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List any notable advisors, board members, or mentors who are supporting your venture. Include their credentials and how they add value..."
                    className="min-h-[100px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Mention any well-known advisors or industry experts who lend credibility to your team.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Team Strengths */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Team Strengths & Gaps</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team Strengths */}
            <FormField
              control={form.control}
              name="team_strengths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Team Strengths
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What are your team's key strengths? Technical expertise, industry connections, previous startup experience, etc..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Gaps */}
            <FormField
              control={form.control}
              name="team_gaps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Areas for Growth
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What skills or experience gaps exist in your team? How do you plan to address them? (This shows self-awareness to investors)"
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Team Culture & Values */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Company Culture</h3>

          <FormField
            control={form.control}
            name="company_culture"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Company Culture & Values
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your company culture, values, and what kind of work environment you're building. How do you attract and retain talent?..."
                    className="min-h-[100px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Investors look for passionate teams with strong cultures that can scale effectively.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Hiring Plans */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Hiring Plans</h3>

          <FormField
            control={form.control}
            name="hiring_plans"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Key Hires Needed
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What key positions do you need to fill in the next 6-12 months? How will the investment help you attract top talent?..."
                    className="min-h-[100px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Outline your hiring roadmap and how you plan to use funds for team expansion.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Team Validation Tips */}
        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Tips for Presenting Your Team
          </h4>
          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <li>• Highlight relevant experience and track record</li>
            <li>• Show passion and commitment to the mission</li>
            <li>• Be transparent about gaps and how you'll address them</li>
            <li>• Include diversity and complementary skill sets</li>
            <li>• Mention any notable advisors or board members</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}