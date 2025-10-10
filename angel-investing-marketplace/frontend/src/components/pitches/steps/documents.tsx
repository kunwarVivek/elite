import { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, Image, Video, Trash2, Download, Eye } from 'lucide-react'
import type { PitchFormData } from '@/hooks/use-pitch-form'

interface DocumentsStepProps {
  form: UseFormReturn<PitchFormData>
}

interface UploadedDocument {
  id: string
  name: string
  type: string
  size: number
  url?: string
}

export function DocumentsStep({ form }: DocumentsStepProps) {
  // Mock uploaded documents - in real implementation, this would come from state
  const uploadedDocuments: UploadedDocument[] = [
    {
      id: '1',
      name: 'Pitch_Deck_v2.pdf',
      type: 'application/pdf',
      size: 2048576,
      url: '#'
    },
    {
      id: '2',
      name: 'Financial_Projections.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024000,
      url: '#'
    }
  ]

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />
    if (type.includes('image')) return <Image className="h-4 w-4" />
    if (type.includes('video')) return <Video className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Supporting Documents
        </CardTitle>
        <CardDescription>
          Upload your pitch deck, financial projections, and other supporting documents to strengthen your pitch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Pitch Deck Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pitch Deck</h3>

          <FormField
            control={form.control}
            name="pitch_deck"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Upload Pitch Deck (PDF recommended)
                </FormLabel>
                <FormControl>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Drop your pitch deck here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, PPT, or PPTX files up to 25MB
                      </p>
                      <Button variant="outline" className="mt-4">
                        Choose File
                      </Button>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  A well-designed pitch deck is crucial for investor interest. Include problem/solution, market opportunity, traction, and team.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Financial Documents */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Financial Documents</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Projections */}
            <FormField
              control={form.control}
              name="financial_projections_file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Financial Projections
                  </FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">
                        Upload Financial Model
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Excel, Google Sheets, or PDF
                      </p>
                      <Button variant="outline" size="sm">
                        Upload File
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Historical Financials */}
            <FormField
              control={form.control}
              name="historical_financials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Historical Financials
                  </FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">
                        Past Financial Statements
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        If available (optional)
                      </p>
                      <Button variant="outline" size="sm">
                        Upload File
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Legal Documents */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Legal & Compliance Documents</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Incorporation Certificate */}
            <FormField
              control={form.control}
              name="incorporation_certificate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Certificate of Incorporation
                  </FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                      <FileText className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mb-2">
                        PDF or Image
                      </p>
                      <Button variant="outline" size="sm">
                        Upload
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tax Returns */}
            <FormField
              control={form.control}
              name="tax_returns"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Tax Returns (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                      <FileText className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mb-2">
                        Last 2 years
                      </p>
                      <Button variant="outline" size="sm">
                        Upload
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* IP Documents */}
            <FormField
              control={form.control}
              name="ip_documents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    IP/Patent Documents
                  </FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                      <FileText className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mb-2">
                        If applicable
                      </p>
                      <Button variant="outline" size="sm">
                        Upload
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Uploaded Documents Display */}
        {uploadedDocuments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Uploaded Documents</h3>

            <div className="space-y-3">
              {uploadedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.type)}
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)} • Uploaded recently
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Documents */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Additional Documents</h3>

          <FormField
            control={form.control}
            name="additional_documents"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Other Supporting Documents
                </FormLabel>
                <FormControl>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">
                      Upload Product Demo, Customer Testimonials, etc.
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Any additional files that support your pitch
                    </p>
                    <Button variant="outline">
                      Add Files
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Include product demos, customer case studies, market research, or other materials that strengthen your case.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Document Guidelines */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Document Upload Guidelines
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Recommended Documents:</h5>
              <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Pitch deck (10-15 slides)</li>
                <li>• Financial model/projections</li>
                <li>• Product demo/screenshots</li>
                <li>• Customer testimonials</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-1">File Requirements:</h5>
              <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Maximum 25MB per file</li>
                <li>• PDF, Excel, Word, PowerPoint</li>
                <li>• Clear, professional formatting</li>
                <li>• Include your company branding</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
            Privacy & Document Security
          </h4>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            All uploaded documents are encrypted and stored securely. Documents are only shared with investors who have expressed serious interest in your pitch and signed appropriate NDAs.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}