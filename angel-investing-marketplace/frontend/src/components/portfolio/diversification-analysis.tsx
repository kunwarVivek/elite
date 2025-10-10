import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TreeMap,
  ScatterChart,
  Scatter
} from 'recharts'
import {
  PieChart as PieChartIcon,
  BarChart3,
  Target,
  Globe,
  Building,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react'
import { formatPercentage, formatCurrency } from '@/lib/portfolio-utils'

interface DiversificationAnalysisProps {
  portfolioId: string
}

interface DiversificationMetric {
  dimension: string
  score: number
  max_score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  description: string
  recommendations: string[]
}

function SectorDiversification() {
  const sectorData = [
    { sector: 'SaaS', value: 45000, percentage: 45, investments: 8 },
    { sector: 'Healthcare', value: 25000, percentage: 25, investments: 5 },
    { sector: 'Fintech', value: 20000, percentage: 20, investments: 4 },
    { sector: 'CleanTech', value: 10000, percentage: 10, investments: 2 }
  ]

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Sector Diversification
        </CardTitle>
        <CardDescription>
          Distribution of investments across industry sectors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ sector, percentage }) => `${sector}: ${formatPercentage(percentage / 100)}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Sector Breakdown</h4>
            {sectorData.map((sector, index) => (
              <div key={sector.sector} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{sector.sector}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(sector.value)}</div>
                    <div className="text-sm text-muted-foreground">
                      {sector.investments} investments
                    </div>
                  </div>
                </div>
                <Progress value={sector.percentage} className="h-2" />
              </div>
            ))}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Consider adding exposure to underrepresented sectors like CleanTech to improve diversification.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StageDiversification() {
  const stageData = [
    { stage: 'MVP', value: 40000, percentage: 40, investments: 6 },
    { stage: 'Growth', value: 35000, percentage: 35, investments: 5 },
    { stage: 'Prototype', value: 15000, percentage: 15, investments: 4 },
    { stage: 'Scale', value: 10000, percentage: 10, investments: 2 }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Stage Diversification
        </CardTitle>
        <CardDescription>
          Distribution across startup development stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis dataKey="stage" type="category" width={80} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function GeographicDiversification() {
  const geoData = [
    { country: 'United States', value: 75000, percentage: 75, investments: 12 },
    { country: 'Canada', value: 15000, percentage: 15, investments: 3 },
    { country: 'United Kingdom', value: 10000, percentage: 10, investments: 2 }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Geographic Diversification
        </CardTitle>
        <CardDescription>
          International exposure and geographic distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {geoData.map((country, index) => (
            <div key={country.country} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{country.country}</span>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(country.value)}</div>
                  <div className="text-sm text-muted-foreground">
                    {country.investments} investments
                  </div>
                </div>
              </div>
              <Progress value={country.percentage} className="h-2" />
            </div>
          ))}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Low international diversification. Consider adding European or Asian startup exposure.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}

function DiversificationScorecard() {
  const metrics: DiversificationMetric[] = [
    {
      dimension: 'Sector Diversity',
      score: 0.75,
      max_score: 1.0,
      grade: 'B',
      description: 'Good distribution across different industries',
      recommendations: [
        'Consider adding exposure to underrepresented sectors',
        'Monitor sector concentration regularly'
      ]
    },
    {
      dimension: 'Stage Diversity',
      score: 0.60,
      max_score: 1.0,
      grade: 'C',
      description: 'Moderate distribution across development stages',
      recommendations: [
        'Increase allocation to early-stage opportunities',
        'Balance growth vs. mature stage investments'
      ]
    },
    {
      dimension: 'Geographic Diversity',
      score: 0.45,
      max_score: 1.0,
      grade: 'D',
      description: 'Limited international exposure',
      recommendations: [
        'Add international startup investments',
        'Consider currency diversification strategies'
      ]
    },
    {
      dimension: 'Company Size Diversity',
      score: 0.55,
      max_score: 1.0,
      grade: 'C',
      description: 'Moderate distribution across company sizes',
      recommendations: [
        'Include more small and medium-sized companies',
        'Balance with established larger startups'
      ]
    }
  ]

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50'
      case 'B': return 'text-blue-600 bg-blue-50'
      case 'C': return 'text-yellow-600 bg-yellow-50'
      case 'D': return 'text-orange-600 bg-orange-50'
      case 'F': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const overallScore = metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Diversification Scorecard
        </CardTitle>
        <CardDescription>
          Overall assessment of portfolio diversification quality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">
            {formatPercentage(overallScore)}
          </div>
          <div className="text-sm text-muted-foreground">Overall Diversification Score</div>
        </div>

        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{metric.dimension}</h4>
                <div className="flex items-center gap-2">
                  <Badge className={getGradeColor(metric.grade)}>
                    Grade {metric.grade}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatPercentage(metric.score)}
                  </span>
                </div>
              </div>

              <Progress value={metric.score * 100} className="mb-3" />

              <p className="text-sm text-muted-foreground mb-3">
                {metric.description}
              </p>

              <div className="space-y-1">
                <div className="text-sm font-medium">Recommendations:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {metric.recommendations.map((rec, recIndex) => (
                    <li key={recIndex} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CorrelationAnalysis() {
  // Mock correlation data between investments
  const correlationData = [
    { investment: 'TechCorp Inc', saas: 0.85, healthcare: 0.12, fintech: 0.65, cleantech: 0.08 },
    { investment: 'HealthTech Ltd', saas: 0.15, healthcare: 0.92, fintech: 0.18, cleantech: 0.05 },
    { investment: 'FinTech Solutions', saas: 0.58, healthcare: 0.22, fintech: 0.88, cleantech: 0.12 },
    { investment: 'Green Energy Co', saas: 0.05, healthcare: 0.08, fintech: 0.15, cleantech: 0.95 }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Correlation Analysis
        </CardTitle>
        <CardDescription>
          Inter-relationships between portfolio investments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2 text-xs font-medium text-center">
            <div></div>
            <div>SaaS</div>
            <div>Healthcare</div>
            <div>Fintech</div>
            <div>CleanTech</div>
          </div>

          {correlationData.map((row, index) => (
            <div key={index} className="grid grid-cols-5 gap-2 text-center">
              <div className="text-sm font-medium text-left">{row.investment}</div>
              <div className={`text-sm ${row.saas > 0.7 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                {formatPercentage(row.saas)}
              </div>
              <div className={`text-sm ${row.healthcare > 0.7 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                {formatPercentage(row.healthcare)}
              </div>
              <div className={`text-sm ${row.fintech > 0.7 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                {formatPercentage(row.fintech)}
              </div>
              <div className={`text-sm ${row.cleantech > 0.7 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                {formatPercentage(row.cleantech)}
              </div>
            </div>
          ))}
        </div>

        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            High correlation within sectors (red values) indicates potential concentration risk.
            Consider investments that have lower correlation with existing holdings.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

export function DiversificationAnalysis({ portfolioId }: DiversificationAnalysisProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Portfolio Diversification Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive analysis of portfolio diversification across multiple dimensions
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="sectors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
        </TabsList>

        <TabsContent value="sectors" className="space-y-6">
          <SectorDiversification />
          <CorrelationAnalysis />
        </TabsContent>

        <TabsContent value="stages" className="space-y-6">
          <StageDiversification />
        </TabsContent>

        <TabsContent value="geographic" className="space-y-6">
          <GeographicDiversification />
        </TabsContent>

        <TabsContent value="scorecard" className="space-y-6">
          <DiversificationScorecard />
        </TabsContent>
      </Tabs>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Diversification Benefits:</strong> Proper diversification can reduce portfolio volatility
          while maintaining expected returns. Aim for exposure across different sectors, stages, geographies,
          and company sizes to optimize your risk-return profile.
        </AlertDescription>
      </Alert>
    </div>
  )
}