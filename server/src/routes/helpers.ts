import * as usersRepo from "../repos/users";

export function kindToColumn(kind: string) {
  if (kind === 'id_front') return 'id_front_path';
  if (kind === 'id_back') return 'id_back_path';
  if (kind === 'selfie') return 'selfie_path';
  return null;
}

export function isAbsoluteUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

export function publicBlobBase() {
  const base = (process.env.BLOB_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BLOB_BASE_URL || '').trim();
  return base.replace(/\/+$/, '');
}

export function toPublicBlobUrl(p: string) {
  const clean = String(p || '').replace(/^\/+/, '');
  const base = publicBlobBase();
  if (base) return `${base}/${clean}`;
  return `https://blob.vercel-storage.com/${clean}`;
}

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpCode(secretBase32: string, timeStepSec = 30, window = 0) {
  const key = base32Decode(secretBase32);
  const now = Math.floor(Date.now() / 1000);
  const step = Math.floor(now / timeStepSec) + window;
  const msg = Buffer.alloc(8);
  let tmp = step >>> 0;
  let hi = Math.floor(step / 0x100000000);
  for (let i = 7; i >= 0; i--) {
    msg[i] = tmp & 0xff;
    tmp >>>= 8;
    if (i === 4) tmp = hi;
  }
  const crypto = require('crypto');
  const h = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const bin = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16) | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, '0');
}

export function verifyTotp(secretBase32: string, token: string, skew = 1) {
  const t = String(token).trim();
  if (!/^\d{6}$/.test(t)) return false;
  for (let w = -skew; w <= skew; w++) {
    if (totpCode(secretBase32, 30, w) === t) return true;
  }
  return false;
}

export async function verifyTwofaIfEnabledOrSend(userId: number, req: any, res: any) {
  const u = await usersRepo.findUserById(userId);
  if (!u?.twofa_enabled) return true;
  const incoming = (req.headers['x-2fa-code'] as string | undefined) || (req.body?.twofaCode ? String(req.body.twofaCode) : undefined);
  const code = (incoming || '').trim();
  if (!code) {
    res.status(400).json({ error: '2fa code required' });
    return false;
  }
  const secret = await usersRepo.getTwofaSecret(userId);
  if (!secret || !verifyTotp(secret, code)) {
    res.status(400).json({ error: 'invalid 2fa code' });
    return false;
  }
  return true;
}

