import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "./db";
import * as usersRepo from "./repos/users";

const JWT_SECRET: string = (() => {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    return "dev_secret_change_me";
  }
  return s;
})();
const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  password_reset_required?: boolean;
};

export async function registerUser(username: string, password: string) {
  const uname = username.trim().toLowerCase();
  if (!uname) throw new Error("username is required");
  if (password.length < 6) throw new Error("password must be at least 6 characters");

  const hash = await bcrypt.hash(password, 10);
  const row = await usersRepo.createUser(uname, hash) as UserRow | null;
  if (!row) throw new Error("username already exists");
  return sanitize(row);
}

export async function loginUser(username: string, password: string) {
  const uname = username.trim().toLowerCase();
  const user = (await usersRepo.findUserByUsername(uname)) as UserRow | null;
  if (!user) throw new Error("invalid username or password");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error("invalid username or password");

  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });

  const passwordResetRequired = Boolean(user.password_reset_required);
  return { token, user: sanitize(user), passwordResetRequired };
}

export type AuthPayload = { sub: number; username: string; iat: number; exp: number };

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('invalid token');
  }
  const p = decoded as Partial<AuthPayload>;
  if (
    typeof p.sub !== 'number' ||
    typeof p.username !== 'string' ||
    typeof p.iat !== 'number' ||
    typeof p.exp !== 'number'
  ) {
    throw new Error('invalid token payload');
  }
  return p as AuthPayload;
}

function sanitize(u: UserRow) {
  return { id: u.id, username: u.username, created_at: u.created_at };
}

export async function changePassword(userId: number, _oldPassword: string, newPassword: string) {
  if (newPassword.length < 6) throw new Error("password must be at least 6 characters");
  const user = (await usersRepo.findUserById(userId)) as UserRow | null;
  if (!user) throw new Error("user not found");
  // Old password verification is intentionally skipped per product requirements.
  const newHash = await bcrypt.hash(newPassword, 10);
  await usersRepo.updatePassword(userId, newHash, true);
  return { ok: true } as const;
}
