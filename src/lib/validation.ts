import { ZodError, z } from 'zod';
import { NextResponse } from 'next/server';
import {
  LoginSchema,
  ProfileUpdateSchema,
  PaymentUpdateSchema,
  ChangePasswordSchema,
  ForceResetPasswordSchema,
  NotificationsUpdateSchema,
  TwoFAEnableSchema,
  WithdrawRequestSchema,
} from './schemas';

// Re-export schemas for existing imports
export {
  LoginSchema,
  ProfileUpdateSchema,
  PaymentUpdateSchema,
  ChangePasswordSchema,
  ForceResetPasswordSchema,
  NotificationsUpdateSchema,
  TwoFAEnableSchema,
  WithdrawRequestSchema,
};

export function validationError(error: ZodError) {
  const issues = error.issues.map((i) => ({ path: i.path, message: i.message }));
  return NextResponse.json({ error: 'Invalid request', issues }, { status: 400 });
}

export async function parseJson<TSchema extends z.ZodTypeAny>(req: Request, schema: TSchema) {
  const body = await req.json().catch(() => undefined);
  const result = schema.safeParse(body);
  if (!result.success) throw result.error;
  return result.data as z.infer<TSchema>;
}

export function parseQuery<TSchema extends z.ZodTypeAny>(req: Request, schema: TSchema) {
  const usp = new URL(req.url).searchParams;
  const obj: Record<string, string> = {};
  usp.forEach((v, k) => { obj[k] = v; });
  const result = schema.safeParse(obj);
  if (!result.success) throw result.error;
  return result.data as z.infer<TSchema>;
}
