import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSafeStore } from '@/stores/safe-store'
import { useAuthStore } from '@/stores/auth-store'
import { CurrencyInput, PercentageInput } from '@/components/investment'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'

export const Route = createFileRoute('/safes/new')({
  component: CreateSafePage,
})

function CreateSafePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { create, isLoading } = useSafeStore()

  const [formData, setFormData] = useState({
    investmentId: '',
    type: 'POST_MONEY' as 'POST_MONEY' | 'PRE_MONEY',
    investmentAmount: 0,
    valuationCap: 0,
    discountRate: 0,
    proRataRights: true,
    majorInvestorRights: false,
    documentUrls: [] as string[],
    terms: {},
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.investmentId) {
      newErrors.investmentId = 'Investment ID is required'
    }
    if (formData.investmentAmount <= 0) {
      newErrors.investmentAmount = 'Investment amount must be greater than 0'
    }
    if (formData.valuationCap && formData.valuationCap <= 0) {
      newErrors.valuationCap = 'Valuation cap must be greater than 0'
    }
    if (formData.discountRate && (formData.discountRate < 0 || formData.discountRate > 100)) {
      newErrors.discountRate = 'Discount rate must be between 0 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast.error('Please fix the errors in the form')
      return
    }

    try {
      const result = await create(formData)
      if (result) {
        toast.success('SAFE agreement created successfully')
        navigate({ to: '/safes/$id', params: { id: result.id } })
      } else {
        toast.error('Failed to create SAFE agreement')
      }
    } catch (error) {
      toast.error('An error occurred while creating the SAFE agreement')
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Link to="/safes">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to SAFEs
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create SAFE Agreement</CardTitle>
          <CardDescription>
            Create a new Simple Agreement for Future Equity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="investmentId">Investment ID *</Label>
              <Input
                id="investmentId"
                value={formData.investmentId}
                onChange={(e) =>
                  setFormData({ ...formData, investmentId: e.target.value })
                }
                placeholder="Enter investment ID"
              />
              {errors.investmentId && (
                <p className="text-sm text-destructive">{errors.investmentId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">SAFE Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST_MONEY">Post-Money</SelectItem>
                  <SelectItem value="PRE_MONEY">Pre-Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <CurrencyInput
              label="Investment Amount *"
              value={formData.investmentAmount}
              onChange={(value) =>
                setFormData({ ...formData, investmentAmount: value })
              }
              error={errors.investmentAmount}
              helperText="The amount invested through this SAFE"
            />

            <CurrencyInput
              label="Valuation Cap"
              value={formData.valuationCap}
              onChange={(value) => setFormData({ ...formData, valuationCap: value })}
              error={errors.valuationCap}
              helperText="Maximum company valuation for conversion (optional)"
            />

            <PercentageInput
              label="Discount Rate"
              value={formData.discountRate}
              onChange={(value) => setFormData({ ...formData, discountRate: value })}
              error={errors.discountRate}
              helperText="Discount percentage on the conversion price (optional)"
            />

            <div className="space-y-2">
              <Label htmlFor="documentUrls">Document URLs</Label>
              <Textarea
                id="documentUrls"
                placeholder="Enter document URLs, one per line"
                rows={3}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    documentUrls: e.target.value.split('\n').filter((url) => url.trim()),
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Add links to supporting documents (optional)
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Creating...' : 'Create SAFE Agreement'}
              </Button>
              <Link to="/safes">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
