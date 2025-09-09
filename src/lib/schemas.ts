import { z } from 'zod'

export const LoginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(6).max(128),
}).strict()

export const ProfileUpdateSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .refine((v) => v === undefined || /^\+?[1-9]\d{6,14}$/.test(v), { message: 'Invalid phone format' }),
}).strict()

export const PaymentUpdateSchema = z.object({
  bankName: z.string().trim().min(1).max(100),
  bankAccountNumber: z.string().trim().min(4).max(34),
}).strict()

export const ChangePasswordSchema = z.object({
  newPassword: z.string().min(6),
}).strict()

export const NotificationsUpdateSchema = z.object({
  productUpdates: z.boolean(),
  payouts: z.boolean(),
}).strict()

export const TwoFAEnableSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
}).strict()

export const WithdrawRequestSchema = z.object({
  amount: z.number().int().positive(),
  bankAccountId: z.number().int().positive().optional(),
}).strict()

export const KycUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['female', 'male', '']).optional(),
}).strict()

export const PayoutsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  type: z.enum(['referral_order', 'bonus', 'withdrawal']).optional(),
}).strict()

export const WithdrawalsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
}).strict()

export const ReferralsQuerySchema = z.object({
  q: z.string().trim().min(1).max(64).optional(),
  onboarding: z.enum(['Registered','Completed KYC','Bank Account added','Pledge added']).optional(),
  account: z.enum(['onboarding','active','deactivated']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
}).strict()

export const ReferralOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
}).strict()
