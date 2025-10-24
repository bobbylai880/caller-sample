import { z } from 'zod';

export const phoneNumberSchema = z.string().min(4).max(20);

export const timeWindowSchema = z
  .object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  })
  .refine((data) => {
    if (data.start && data.end) {
      return new Date(data.start).getTime() < new Date(data.end).getTime();
    }
    return true;
  }, 'timeWindow.start must be before timeWindow.end');

export const backoffPolicySchema = z
  .object({
    initialSeconds: z.number().min(1).optional(),
    multiplier: z.number().min(1).optional(),
    maxSeconds: z.number().min(1).optional(),
    jitterRatio: z.number().min(0).max(1).optional()
  })
  .optional();

export const createTaskSchema = z.object({
  numbers: z.array(phoneNumberSchema).min(1).max(3),
  userPhone: phoneNumberSchema,
  ruleSetId: z.string().min(1),
  timeWindow: timeWindowSchema.optional(),
  perNumberMaxAttempts: z.number().int().min(1).max(10).optional(),
  globalMaxAttempts: z.number().int().min(1).max(30).optional(),
  backoffPolicy: backoffPolicySchema
});

export const stopTaskSchema = z.object({
  id: z.string().min(1)
});
