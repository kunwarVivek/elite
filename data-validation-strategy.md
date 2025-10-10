# Data Validation Strategy with Zod

## Overview

Comprehensive data validation using Zod schemas ensures type safety, data integrity, and security across the angel investing platform. This strategy covers form validation, API validation, database validation, and runtime type checking.

## Core Validation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  React      │  │  Form       │  │  Real-time  │              │
│  │  Hook       │  │  Validation │  │  Validation │              │
│  │  Form       │  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Validated Data
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Request    │  │  Zod        │  │  Business   │              │
│  │  Validation │  │  Middleware │  │  Logic      │              │
│  │             │  │             │  │  Validation │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Type-safe Data
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE                                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Prisma     │  │  Zod        │  │  Raw SQL    │              │
│  │  Schema     │  │  Validation │  │  Constraints│              │
│  │  Validation │  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Base Schema Definitions

### Common Types

```typescript
// lib/validations/common.ts
import { z } from 'zod'

// Base types
export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email().min(5).max(255)
export const passwordSchema = z.string()
  .min(8)
  .max(128)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })

export const phoneSchema = z.string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number')
  .optional()

export const urlSchema = z.string().url().optional()

// Monetary values
export const currencyAmountSchema = z.number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Amount must be in cents')

export const percentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100')

// Date schemas
export const dateSchema = z.date()
export const futureDateSchema = z.date().refine(
  (date) => date > new Date(),
  'Date must be in the future'
)

// File schemas
export const fileSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().positive(),
  type: z.string().min(1),
  lastModified: z.number()
})

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(100),
  country: z.string().length(2), // ISO country code
  postal_code: z.string().min(3).max(20)
}).optional()

// Pagination
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// Filtering
export const dateRangeSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date)
    }
    return true
  },
  {
    message: 'Start date must be before end date',
    path: ['end_date']
  }
)
```

## User & Authentication Schemas

### User Registration Schema

```typescript
// lib/validations/auth.ts
import { z } from 'zod'
import { emailSchema, passwordSchema, phoneSchema } from './common'

export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  role: z.enum(['FOUNDER', 'INVESTOR', 'SYNDICATE_LEAD', 'ADMIN'], {
    required_error: 'Role is required'
  }),
  phone: phoneSchema,
  agreed_to_terms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions'
  }),
  agreed_to_privacy: z.boolean().refine(val => val === true, {
    message: 'You must agree to the privacy policy'
  })
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
)

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().default(false)
})

export const passwordResetSchema = z.object({
  email: emailSchema
})

export const passwordUpdateSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string()
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password']
  }
).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'New password must be different from current password',
    path: ['new_password']
  }
)
```

### Investor Accreditation Schema

```typescript
// lib/validations/investor.ts
import { z } from 'zod'
import { currencyAmountSchema } from './common'

export const accreditationSchema = z.object({
  annual_income: currencyAmountSchema,
  net_worth: currencyAmountSchema,
  liquid_assets: currencyAmountSchema.optional(),
  accreditation_method: z.enum([
    'INCOME',
    'NET_WORTH',
    'LICENSED_INVESTOR',
    'ENTITY'
  ]),
  documents: z.array(z.object({
    type: z.enum(['TAX_RETURN', 'BANK_STATEMENT', 'LICENSE', 'ENTITY_DOCS']),
    file_url: z.string().url(),
    uploaded_at: z.string().datetime()
  })).min(1, 'At least one supporting document is required'),
  verified_by: z.string().uuid().optional(),
  verified_at: z.string().datetime().optional(),
  expires_at: z.string().datetime()
}).refine(
  (data) => {
    if (data.accreditation_method === 'INCOME') {
      return data.annual_income >= 200000
    }
    if (data.accreditation_method === 'NET_WORTH') {
      return data.net_worth >= 1000000
    }
    return true
  },
  {
    message: 'Income or net worth does not meet accreditation requirements'
  }
)
```

## Startup & Pitch Schemas

### Startup Creation Schema

```typescript
// lib/validations/startup.ts
import { z } from 'zod'
import { urlSchema } from './common'

export const startupCreationSchema = z.object({
  name: z.string()
    .min(2, 'Startup name must be at least 2 characters')
    .max(100, 'Startup name cannot exceed 100 characters'),
  slug: z.string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  industry: z.string()
    .min(2, 'Industry is required')
    .max(50, 'Industry name too long'),
  stage: z.enum([
    'IDEA',
    'PROTOTYPE',
    'MVP',
    'GROWTH',
    'SCALE'
  ]),
  funding_goal: z.number()
    .min(10000, 'Minimum funding goal is $10,000')
    .max(10000000, 'Maximum funding goal is $10,000,000'),
  website_url: urlSchema,
  logo_url: urlSchema,
  team_size: z.number()
    .int()
    .min(1, 'Team size must be at least 1')
    .max(1000, 'Team size cannot exceed 1000'),
  founded_date: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) <= new Date(),
      'Founded date cannot be in the future'
    ),
  business_model: z.string()
    .min(20, 'Business model description too short')
    .max(1000, 'Business model description too long'),
  target_market: z.string()
    .min(20, 'Target market description too short')
    .max(1000, 'Target market description too long'),
  competitive_advantage: z.string()
    .min(20, 'Competitive advantage description too short')
    .max(1000, 'Competitive advantage description too long')
})
```

### Pitch Creation Schema

```typescript
// lib/validations/pitch.ts
import { z } from 'zod'
import { currencyAmountSchema, percentageSchema } from './common'

export const pitchCreationSchema = z.object({
  startup_id: z.string().uuid(),
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  summary: z.string()
    .min(100, 'Summary must be at least 100 characters')
    .max(1000, 'Summary cannot exceed 1000 characters'),
  problem_statement: z.string()
    .min(50, 'Problem statement too short')
    .max(2000, 'Problem statement too long'),
  solution: z.string()
    .min(50, 'Solution description too short')
    .max(2000, 'Solution description too long'),
  market_opportunity: z.string()
    .min(50, 'Market opportunity description too short')
    .max(2000, 'Market opportunity description too long'),
  competitive_analysis: z.string()
    .min(50, 'Competitive analysis too short')
    .max(2000, 'Competitive analysis too long'),
  funding_amount: currencyAmountSchema,
  equity_offered: percentageSchema.optional(),
  minimum_investment: z.number()
    .min(100, 'Minimum investment is $100')
    .max(10000, 'Maximum minimum investment is $10,000'),
  financial_projections: z.object({
    year1_revenue: currencyAmountSchema.optional(),
    year2_revenue: currencyAmountSchema.optional(),
    year3_revenue: currencyAmountSchema.optional(),
    year1_customers: z.number().int().positive().optional(),
    year2_customers: z.number().int().positive().optional(),
    year3_customers: z.number().int().positive().optional()
  }).optional(),
  pitch_deck_url: z.string().url().optional(),
  video_url: z.string().url().optional(),
  tags: z.array(z.string().min(2).max(30)).max(10).optional()
})
```

## Investment & Trading Schemas

### Investment Creation Schema

```typescript
// lib/validations/investment.ts
import { z } from 'zod'
import { currencyAmountSchema, percentageSchema } from './common'

export const investmentCreationSchema = z.object({
  pitch_id: z.string().uuid(),
  amount: currencyAmountSchema,
  equity_percentage: percentageSchema.optional(),
  payment_method: z.enum(['BANK_TRANSFER', 'CARD', 'CRYPTO', 'WIRE']),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the investment terms'
  }),
  risk_acknowledged: z.boolean().refine(val => val === true, {
    message: 'You must acknowledge the investment risks'
  }),
  syndicate_id: z.string().uuid().optional()
}).refine(
  (data) => {
    // If syndicate investment, amount must meet minimum
    if (data.syndicate_id) {
      return data.amount >= 100
    }
    return true
  },
  {
    message: 'Syndicate investments must be at least $100',
    path: ['amount']
  }
)
```

### Trading Order Schema

```typescript
// lib/validations/trading.ts
import { z } from 'zod'
import { currencyAmountSchema } from './common'

export const tradingOrderSchema = z.object({
  type: z.enum(['BUY', 'SELL']),
  share_certificate_id: z.string().uuid(),
  quantity: z.number()
    .int()
    .positive('Quantity must be positive'),
  price_per_share: currencyAmountSchema,
  order_type: z.enum(['MARKET', 'LIMIT']),
  expires_at: z.string().datetime().optional(),
  notes: z.string().max(500).optional()
}).refine(
  (data) => {
    if (data.order_type === 'LIMIT') {
      return data.expires_at !== undefined
    }
    return true
  },
  {
    message: 'Limit orders must have an expiration date',
    path: ['expires_at']
  }
)
```

## Communication Schemas

### Message Schema

```typescript
// lib/validations/communication.ts
import { z } from 'zod'

export const messageSchema = z.object({
  receiver_id: z.string().uuid(),
  subject: z.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject cannot exceed 200 characters'),
  content: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(10000, 'Message cannot exceed 10,000 characters'),
  message_type: z.enum([
    'GENERAL',
    'PITCH_INQUIRY',
    'INVESTMENT_DISCUSSION',
    'SUPPORT'
  ]).default('GENERAL'),
  pitch_id: z.string().uuid().optional(),
  investment_id: z.string().uuid().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().positive(),
    type: z.string()
  })).max(5).optional()
})
```

### Company Update Schema

```typescript
// lib/validations/updates.ts
import { z } from 'zod'

export const companyUpdateSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z.string()
    .min(50, 'Update must be at least 50 characters')
    .max(10000, 'Update cannot exceed 10,000 characters'),
  update_type: z.enum([
    'GENERAL',
    'MILESTONE',
    'FUNDING',
    'GROWTH',
    'CHALLENGE',
    'PIVOT'
  ]),
  visibility: z.enum([
    'ALL_INVESTORS',
    'SPECIFIC_ROUNDS',
    'LEAD_INVESTORS_ONLY'
  ]).default('ALL_INVESTORS'),
  round_ids: z.array(z.string().uuid()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.enum(['IMAGE', 'DOCUMENT', 'VIDEO']),
    size: z.number().positive()
  })).max(10).optional(),
  tags: z.array(z.string().min(2).max(30)).max(5).optional(),
  is_draft: z.boolean().default(false),
  scheduled_at: z.string().datetime().optional()
})
```

## API Request/Response Schemas

### Pagination Response Schema

```typescript
// lib/validations/api.ts
import { z } from 'zod'

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) => z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    total_pages: z.number().int().min(0),
    has_next: z.boolean(),
    has_prev: z.boolean()
  }),
  success: z.boolean(),
  message: z.string().optional()
})

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime()
})

export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.literal(true),
  data: dataSchema,
  message: z.string().optional(),
  timestamp: z.string().datetime()
})
```

## Database-Level Validation

### Prisma Schema Extensions

```typescript
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique @db.VarChar(255)
  name      String   @db.VarChar(255)
  role      UserRole @db.VarChar(50)
  avatar_url String?  @db.Text
  profile_data Json?  @db.JsonB

  // Validation constraints
  @@index([email])
  @@index([role])
  @@index([created_at])
}

model Investment {
  id          String      @id @default(cuid())
  investor_id String
  pitch_id    String
  amount      Decimal     @db.Decimal(15, 2)
  status      InvestmentStatus @default(PENDING)

  // Validation constraints
  @@index([investor_id])
  @@index([pitch_id])
  @@index([status])
  @@index([created_at])
}

enum UserRole {
  FOUNDER
  INVESTOR
  SYNDICATE_LEAD
  ADMIN
}

enum InvestmentStatus {
  PENDING
  ESCROW
  COMPLETED
  CANCELLED
}
```

## Runtime Validation Middleware

### API Request Validation

```typescript
// lib/middleware/validation.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { errorResponseSchema } from '@/lib/validations/api'

export function validateRequest<T extends z.ZodType>(
  schema: T,
  request: NextRequest
): z.infer<T> | Response {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        })),
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    return Response.json({
      success: false,
      error: 'Invalid request body',
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const validatedData = validateRequest(userRegistrationSchema, request)

  if (validatedData instanceof Response) {
    return validatedData // Return validation error response
  }

  // Continue with validated data
  const user = await createUser(validatedData)
  return Response.json({ success: true, data: user })
}
```

### Form Validation Hook

```typescript
// hooks/use-form-validation.ts
import { useState, useCallback } from 'react'
import { z } from 'zod'

export function useFormValidation<T extends z.ZodType>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const validateField = useCallback((fieldName: string, value: any) => {
    try {
      // Create partial schema for single field validation
      const fieldSchema = schema.pick({ [fieldName]: true } as any)
      fieldSchema.parse({ [fieldName]: value })

      // Remove error for this field if validation passes
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })

      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err =>
          err.path.includes(fieldName)
        )

        if (fieldError) {
          setErrors(prev => ({
            ...prev,
            [fieldName]: fieldError.message
          }))
        }
      }
      return false
    }
  }, [schema])

  const validateForm = useCallback((data: z.infer<T>): boolean => {
    setIsValidating(true)

    try {
      schema.parse(data)

      setErrors({})
      setIsValidating(false)
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}

        error.errors.forEach(err => {
          const fieldName = err.path[0] as string
          fieldErrors[fieldName] = err.message
        })

        setErrors(fieldErrors)
      }

      setIsValidating(false)
      return false
    }
  }, [schema])

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return errors[fieldName]
  }, [errors])

  const isFieldValid = useCallback((fieldName: string): boolean => {
    return !errors[fieldName]
  }, [errors])

  return {
    errors,
    isValidating,
    validateField,
    validateForm,
    getFieldError,
    isFieldValid,
    isFormValid: Object.keys(errors).length === 0
  }
}
```

## Advanced Validation Patterns

### Conditional Validation

```typescript
// lib/validations/conditional.ts
export const conditionalInvestmentSchema = z.object({
  investment_type: z.enum(['DIRECT', 'SYNDICATE']),
  amount: z.number().positive(),
  syndicate_id: z.string().uuid().optional(),
  payment_method: z.enum(['BANK_TRANSFER', 'CARD', 'CRYPTO'])
}).refine(
  (data) => {
    // Syndicate investments must be at least $100
    if (data.investment_type === 'SYNDICATE') {
      return data.amount >= 100
    }
    return true
  },
  {
    message: 'Syndicate investments must be at least $100',
    path: ['amount']
  }
).refine(
  (data) => {
    // Syndicate investments require syndicate_id
    if (data.investment_type === 'SYNDICATE') {
      return data.syndicate_id !== undefined
    }
    return true
  },
  {
    message: 'Syndicate ID is required for syndicate investments',
    path: ['syndicate_id']
  }
)
```

### Cross-Field Validation

```typescript
// lib/validations/cross-field.ts
export const startupFundingSchema = z.object({
  funding_goal: z.number().positive(),
  current_funding: z.number().min(0),
  funding_round: z.enum(['SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C']),
  valuation_pre_money: z.number().positive().optional(),
  valuation_post_money: z.number().positive().optional()
}).refine(
  (data) => {
    if (data.valuation_pre_money && data.valuation_post_money) {
      return data.valuation_post_money > data.valuation_pre_money
    }
    return true
  },
  {
    message: 'Post-money valuation must be greater than pre-money valuation',
    path: ['valuation_post_money']
  }
).refine(
  (data) => {
    return data.current_funding <= data.funding_goal
  },
  {
    message: 'Current funding cannot exceed funding goal',
    path: ['current_funding']
  }
)
```

### File Upload Validation

```typescript
// lib/validations/file-upload.ts
import { z } from 'zod'

export const fileUploadSchema = z.object({
  file: z.object({
    name: z.string().min(1),
    size: z.number().positive(),
    type: z.string().min(1),
    lastModified: z.number()
  }).refine(
    (file) => file.size <= 50 * 1024 * 1024, // 50MB
    'File size must be less than 50MB'
  ).refine(
    (file) => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ]
      return allowedTypes.includes(file.type)
    },
    'File type not allowed'
  ),
  startup_id: z.string().uuid(),
  file_type: z.enum(['PITCH_DECK', 'BUSINESS_PLAN', 'FINANCIAL', 'LEGAL']),
  is_public: z.boolean().default(false)
})
```

## Validation Error Handling

### Centralized Error Formatting

```typescript
// lib/validation-errors.ts
import { ZodError } from 'zod'

export class ValidationError extends Error {
  public errors: Array<{
    field: string
    message: string
    code: string
  }>

  constructor(zodError: ZodError) {
    super('Validation failed')

    this.errors = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }

  getFieldError(fieldName: string): string | undefined {
    return this.errors.find(error => error.field === fieldName)?.message
  }

  hasFieldError(fieldName: string): boolean {
    return this.errors.some(error => error.field === fieldName)
  }
}

export function formatValidationErrors(error: unknown): ValidationError | null {
  if (error instanceof ZodError) {
    return new ValidationError(error)
  }

  if (error instanceof ValidationError) {
    return error
  }

  return null
}
```

### Error Display Components

```typescript
// components/validation-error.tsx
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ValidationErrorProps {
  error?: string
  className?: string
}

export function ValidationError({ error, className }: ValidationErrorProps) {
  if (!error) return null

  return (
    <div className={cn(
      'flex items-center gap-2 text-sm text-red-600 mt-1',
      className
    )}>
      <AlertCircle className="h-4 w-4" />
      <span>{error}</span>
    </div>
  )
}

// Field-level validation display
interface FieldValidationProps {
  name: string
  errors: Record<string, string>
}

export function FieldValidation({ name, errors }: FieldValidationProps) {
  const error = errors[name]

  return <ValidationError error={error} />
}
```

## Testing Validation Schemas

### Schema Testing Utilities

```typescript
// lib/validations/testing.ts
import { z } from 'zod'

export function testSchema<T extends z.ZodType>(
  schema: T,
  validCases: Array<z.infer<T>>,
  invalidCases: Array<{
    data: any
    expectedErrors: string[]
  }>
) {
  describe(`Schema: ${schema.description || 'Unnamed Schema'}`, () => {
    validCases.forEach((validCase, index) => {
      test(`accepts valid case ${index + 1}`, () => {
        expect(() => schema.parse(validCase)).not.toThrow()
      })
    })

    invalidCases.forEach(({ data, expectedErrors }, index) => {
      test(`rejects invalid case ${index + 1}`, () => {
        try {
          schema.parse(data)
          fail('Expected validation to fail')
        } catch (error) {
          if (error instanceof z.ZodError) {
            const actualErrors = error.errors.map(err => err.message)
            expectedErrors.forEach(expectedError => {
              expect(actualErrors).toContain(expectedError)
            })
          } else {
            fail('Expected ZodError')
          }
        }
      })
    })
  })
}

// Usage
testSchema(
  userRegistrationSchema,
  [
    {
      email: 'test@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      name: 'John Doe',
      role: 'INVESTOR',
      agreed_to_terms: true,
      agreed_to_privacy: true
    }
  ],
  [
    {
      data: {
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different',
        name: '',
        role: 'INVALID_ROLE'
      },
      expectedErrors: [
        'Invalid email',
        'Password must contain at least one uppercase letter',
        'Passwords do not match',
        'Name must be at least 2 characters',
        'Invalid enum value'
      ]
    }
  ]
)
```

This data validation strategy provides comprehensive type safety and data integrity across the entire angel investing platform, ensuring that all user inputs, API requests, and database operations meet strict validation criteria while providing clear, actionable error messages.