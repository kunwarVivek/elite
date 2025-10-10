import { z, ZodSchema, ZodError } from 'zod';

// Advanced conditional validation
export const createConditionalSchema = <T extends z.ZodTypeAny>(
  baseSchema: T,
  condition: (data: any) => boolean,
  conditionalSchema: T
): z.ZodType<any> => {
  return z.any().refine((data) => {
    if (condition(data)) {
      return conditionalSchema.safeParse(data).success;
    }
    return baseSchema.safeParse(data).success;
  }, {
    message: 'Conditional validation failed',
  });
};

// Context-aware validation based on user role
export const createRoleBasedSchema = <T extends Record<string, z.ZodTypeAny>>(
  schemas: {
    INVESTOR?: ZodSchema;
    FOUNDER?: ZodSchema;
    SYNDICATE_LEAD?: ZodSchema;
    ADMIN?: ZodSchema;
  }
) => {
  return z.object({
    role: z.enum(['INVESTOR', 'FOUNDER', 'SYNDICATE_LEAD', 'ADMIN']),
    data: z.any(),
  }).refine((input) => {
    const roleSchema = schemas[input.role];
    if (!roleSchema) return true;

    return roleSchema.safeParse(input.data).success;
  }, {
    message: 'Data does not meet requirements for specified role',
    path: ['data'],
  });
};

// Cross-field validation with dependencies
export const createDependentFieldSchema = <T extends Record<string, any>>(
  fieldName: keyof T,
  dependencies: (keyof T)[],
  validator: (value: any, dependentValues: any) => boolean,
  message: string = 'Field validation failed based on dependent fields'
) => {
  return z.any().refine((data) => {
    const fieldValue = data[fieldName];
    const dependentValues = dependencies.reduce((acc, dep) => {
      acc[dep] = data[dep];
      return acc;
    }, {} as Record<string, any>);

    return validator(fieldValue, dependentValues);
  }, {
    message,
    path: [fieldName],
  });
};

// Async validation wrapper
export const createAsyncSchema = <T>(
  schema: ZodSchema<T>,
  asyncValidator: (data: T) => Promise<{ isValid: boolean; message?: string }>
): ZodSchema<T> => {
  return z.any().refine(async (data) => {
    // First validate with the base schema
    const baseResult = schema.safeParse(data);
    if (!baseResult.success) return false;

    // Then run async validation
    try {
      const asyncResult = await asyncValidator(baseResult.data);
      return asyncResult.isValid;
    } catch (error) {
      return false;
    }
  }, {
    message: 'Async validation failed',
  });
};

// Business logic validation schemas
export const investmentValidationSchema = z.object({
  amount: z.number().positive(),
  pitch_id: z.string().uuid(),
  investor_id: z.string().uuid(),
  equity_percentage: z.number().min(0).max(100).optional(),
}).refine(
  async (data) => {
    // Simulate async validation - in real app this would check against database
    if (data.amount > 1000000) {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return false; // Large investments need special approval
    }
    return true;
  },
  {
    message: 'Large investments require special approval',
    path: ['amount'],
  }
);

// Rate limiting validation schema
export const rateLimitSchema = z.object({
  identifier: z.string(),
  action: z.string(),
  max_requests: z.number().positive(),
  window_ms: z.number().positive(),
}).refine(
  (data) => {
    // Simulate rate limit check
    const now = Date.now();
    const windowStart = now - data.window_ms;
    // In real implementation, this would check Redis or database
    return true; // Placeholder
  },
  {
    message: 'Rate limit exceeded',
  }
);

// File upload advanced validation
export const advancedFileUploadSchema = z.object({
  file: z.instanceof(File),
  user_id: z.string().uuid(),
  upload_context: z.enum(['PROFILE', 'PITCH_DECK', 'DOCUMENT', 'KYC']),
}).refine(
  async (data) => {
    // Simulate virus scanning
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check file content for malicious patterns
    const content = await data.file.text();
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
    ];

    return !maliciousPatterns.some(pattern => pattern.test(content));
  },
  {
    message: 'File contains potentially malicious content',
    path: ['file'],
  }
);

// Complex business rule validation
export const startupFundingValidationSchema = z.object({
  funding_goal: z.number().positive(),
  current_funding: z.number().min(0),
  funding_round: z.enum(['SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C']),
  valuation_pre_money: z.number().positive().optional(),
  valuation_post_money: z.number().positive().optional(),
}).refine(
  (data) => {
    // Post-money valuation should be greater than pre-money
    if (data.valuation_pre_money && data.valuation_post_money) {
      return data.valuation_post_money > data.valuation_pre_money;
    }
    return true;
  },
  {
    message: 'Post-money valuation must be greater than pre-money valuation',
    path: ['valuation_post_money'],
  }
).refine(
  (data) => {
    // Current funding shouldn't exceed goal
    return data.current_funding <= data.funding_goal;
  },
  {
    message: 'Current funding cannot exceed funding goal',
    path: ['current_funding'],
  }
).refine(
  (data) => {
    // Validate funding amounts make sense for round type
    const reasonableAmounts = {
      SEED: { min: 100000, max: 2000000 },
      SERIES_A: { min: 1000000, max: 15000000 },
      SERIES_B: { min: 5000000, max: 50000000 },
      SERIES_C: { min: 20000000, max: 100000000 },
    };

    const range = reasonableAmounts[data.funding_round];
    return data.funding_goal >= range.min && data.funding_goal <= range.max;
  },
  {
    message: 'Funding goal seems unrealistic for this round type',
    path: ['funding_goal'],
  }
);

// Multi-step form validation with state management
export const createMultiStepSchema = <T extends Record<string, ZodSchema>>(steps: T) => {
  const stepKeys = Object.keys(steps) as Array<keyof T>;

  return z.object({
    current_step: z.enum(stepKeys.map(k => k as string) as [string, ...string[]]),
    completed_steps: z.array(z.enum(stepKeys.map(k => k as string) as [string, ...string[]])).default([]),
    step_data: z.record(z.any()),
  }).refine(
    (data) => {
      // Validate that current step data matches the schema for that step
      const currentStepSchema = steps[data.current_step];
      if (!currentStepSchema) return true;

      return currentStepSchema.safeParse(data.step_data).success;
    },
    {
      message: 'Current step data is invalid',
      path: ['step_data'],
    }
  ).refine(
    (data) => {
      // Validate that completed steps have valid data
      return data.completed_steps.every(step => {
        const stepSchema = steps[step];
        if (!stepSchema) return true;

        const stepData = data.step_data[step];
        return stepSchema.safeParse(stepData).success;
      });
    },
    {
      message: 'Some completed steps have invalid data',
      path: ['step_data'],
    }
  );
};

// Dynamic schema based on runtime conditions
export const createDynamicSchema = (
  baseFields: Record<string, ZodSchema>,
  conditionalFields: (data: any) => Record<string, ZodSchema>
) => {
  return z.object(baseFields).refine((data) => {
    const dynamicFields = conditionalFields(data);

    for (const [fieldName, schema] of Object.entries(dynamicFields)) {
      const fieldValue = data[fieldName];
      if (fieldValue !== undefined) {
        const result = schema.safeParse(fieldValue);
        if (!result.success) {
          return false;
        }
      }
    }

    return true;
  }, {
    message: 'Dynamic validation failed',
  });
};

// Schema composition utilities
export const mergeSchemas = <T extends ZodSchema, U extends ZodSchema>(
  schema1: T,
  schema2: U
): z.ZodIntersection<T, U> => {
  return schema1.and(schema2);
};

export const extendSchema = <T extends z.ZodRawShape, U extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>,
  extension: U
): z.ZodObject<T & U> => {
  return baseSchema.extend(extension);
};

export const createUnionSchema = <T extends ZodSchema[]>(...schemas: T): z.ZodUnion<T> => {
  return z.union(schemas as [T[0], T[1], ...T[2][]]);
};

// Validation pipeline for complex business logic
export const createValidationPipeline = <T>(
  ...validators: Array<(data: T) => { isValid: boolean; message?: string; field?: string }>
) => {
  return (data: T): { isValid: boolean; errors: Array<{ message: string; field?: string }> } => {
    const errors: Array<{ message: string; field?: string }> = [];

    for (const validator of validators) {
      const result = validator(data);
      if (!result.isValid) {
        errors.push({
          message: result.message || 'Validation failed',
          field: result.field,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };
};

// Type-safe schema builder
export const createSchemaBuilder = <T extends Record<string, ZodSchema>>(initialSchema: T) => {
  const schema = { ...initialSchema };

  return {
    addField: <K extends string, U extends ZodSchema>(
      key: K,
      fieldSchema: U
    ): createSchemaBuilder<T & Record<K, U>> => {
      return createSchemaBuilder({ ...schema, [key]: fieldSchema });
    },

    addOptionalField: <K extends string, U extends ZodSchema>(
      key: K,
      fieldSchema: U
    ): createSchemaBuilder<T & Record<K, z.ZodOptional<U>>> => {
      return createSchemaBuilder({ ...schema, [key]: fieldSchema.optional() });
    },

    addConditionalField: <K extends string, U extends ZodSchema>(
      key: K,
      condition: (data: any) => boolean,
      fieldSchema: U
    ): createSchemaBuilder<T & Record<K, U>> => {
      // This would need more complex implementation for runtime conditionals
      return createSchemaBuilder({ ...schema, [key]: fieldSchema });
    },

    build: (): z.ZodObject<T> => {
      return z.object(schema);
    },
  };
};

// Export advanced validation utilities
export default {
  createConditionalSchema,
  createRoleBasedSchema,
  createDependentFieldSchema,
  createAsyncSchema,
  createMultiStepSchema,
  createDynamicSchema,
  mergeSchemas,
  extendSchema,
  createUnionSchema,
  createValidationPipeline,
  createSchemaBuilder,
};