import express from "express";
import { createHmac, randomBytes } from "crypto";
import { changePassword, verifyToken } from "../auth";
import * as kycRepo from "../repos/kyc";
import * as usersRepo from "../repos/users";
import * as referralsRepo from "../repos/referrals";
import * as ledgerRepo from "../repos/ledger";
import * as historyRepo from "../repos/history";
import * as withdrawalsRepo from "../repos/withdrawals";
import * as bankAccountsRepo from "../repos/bank-accounts";

// --- Helpers specific to user routes ---
function kindToColumn(kind: string) {
  if (kind === 'id_front') return 'id_front_path';
  if (kind === 'id_back') return 'id_back_path';
  if (kind === 'selfie') return 'selfie_path';
  return null;
}

function isAbsoluteUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function publicBlobBase() {
  const base = (process.env.BLOB_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BLOB_BASE_URL || '').trim();
  return base.replace(/\/+$/, '');
}

function toPublicBlobUrl(p: string) {
  const clean = String(p || '').replace(/^\/+/, '');
  const base = publicBlobBase();
  if (base) return `${base}/${clean}`;
  return `https://blob.vercel-storage.com/${clean}`;
}

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  while (output.length % 8 !== 0) output += "=";
  return output;
}

function base32Decode(str: string): Buffer {
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

function totpCode(secretBase32: string, timeStepSec = 30, window = 0) {
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
  const h = createHmac('sha1', key).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const bin = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16) | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, '0');
}

function verifyTotp(secretBase32: string, token: string, skew = 1) {
  const t = String(token).trim();
  if (!/^\d{6}$/.test(t)) return false;
  for (let w = -skew; w <= skew; w++) {
    if (totpCode(secretBase32, 30, w) === t) return true;
  }
  return false;
}

async function verifyTwofaIfEnabledOrSend(userId: number, req: express.Request, res: express.Response) {
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

async function getOrCreateDraftId(userId: number) {
  const latest = await kycRepo.getLatestDraftOrRejected(userId);
  if (latest?.id) return latest.id as number;
  return await kycRepo.insertNew(userId, '', undefined, undefined);
}

export function registerMeRoutes(app: express.Express) {
  app.post("/me/kyc/upload", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const kind = String(req.body?.kind || "");
      const blobPath = req.body?.blobPath ? String(req.body.blobPath) : "";
      const blobUrl = req.body?.url ? String(req.body.url) : "";
      const col = kindToColumn(kind);
      if (!col || (!blobPath && !blobUrl)) return res.status(400).json({ error: "invalid request" });
      const draftId = await getOrCreateDraftId(payload.sub);
      const stored = blobUrl && isAbsoluteUrl(blobUrl) ? blobUrl : toPublicBlobUrl(blobPath);
      await kycRepo.setUploadPathById(draftId, col, stored);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.delete("/me/kyc/upload/:kind", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const kind = String(req.params?.kind || "");
      const col = kindToColumn(kind);
      if (!col) return res.status(400).json({ error: "invalid request" });
      const latest = await kycRepo.getLatest(payload.sub);
      if (!latest?.id) return res.status(404).json({ error: "not found" });

      try {
        const p = await kycRepo.getLatestPath(payload.sub, col);
        if (p) {
          const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
          const fullUrl = isAbsoluteUrl(p) ? p : toPublicBlobUrl(p);
          if (blobToken) {
            await fetch('https://api.vercel.com/v2/blob/delete', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${blobToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: fullUrl }),
            }).catch(() => undefined);
          }
        }
      } catch {}
      await kycRepo.clearUploadPathById(latest.id as number, col);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/kyc/image/:kind", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const kind = String(req.params?.kind || "");
      const col = kindToColumn(kind);
      if (!col) return res.status(400).json({ error: "invalid request" });
      const p = await kycRepo.getLatestPath(payload.sub, col);
      if (!p) return res.status(404).json({ error: "not found" });
      const url = isAbsoluteUrl(p) ? p : toPublicBlobUrl(p);
      res.json({ url });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/me/change-password", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const newPassword = String(req.body?.newPassword || "");
      if (newPassword.length < 6) return res.status(400).json({ error: "password must be at least 6 characters" });
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      await changePassword(payload.sub, "", newPassword);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/kyc", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const kyc = await kycRepo.getLatest(payload.sub);
      if (kyc) {
        (kyc as any).has_id_front = Boolean(kyc.id_front_path);
        (kyc as any).has_id_back = Boolean(kyc.id_back_path);
        (kyc as any).has_selfie = Boolean(kyc.selfie_path);
      }
      res.json({ kyc });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/me/kyc", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const fullName = String(req.body?.fullName || "").trim();
      const dob = req.body?.dob ? String(req.body.dob) : undefined;
      const gender = req.body?.gender ? String(req.body.gender) : undefined;
      if (!fullName) return res.status(400).json({ error: "fullName is required" });
      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        return res.status(400).json({ error: "dob must be YYYY-MM-DD" });
      }
      const draftId = await getOrCreateDraftId(payload.sub);
      await kycRepo.updateDraftBasic(draftId, fullName, dob, gender);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/me/kyc/submit", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const latest = await kycRepo.getLatest(payload.sub);
      if (!latest?.id) return res.status(404).json({ error: "not found" });
      await kycRepo.submit(payload.sub, latest.id as number);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me", (req, res) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    try {
      const payload = verifyToken(token);
      res.json({ ok: true, user: { id: payload.sub, username: payload.username } });
    } catch {
      res.status(401).json({ error: "invalid token" });
    }
  });

  app.get("/me/profile", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const prof = await usersRepo.getProfile(payload.sub);
      if (!prof) return res.status(404).json({ error: "not found" });
      const accs = await bankAccountsRepo.listForUser(payload.sub);
      const def = accs.find(a => a.is_default) || accs[0];
      const profile = {
        username: prof.username || undefined,
        email: prof.email || undefined,
        phone: prof.phone || undefined,
        twofaEnabled: Boolean(prof.twofa_enabled),
        welcomeTourSeen: Boolean(prof.welcome_tour_seen),
      };
      const payment = {
        bankName: def?.bank_name || undefined,
        bankAccountNumber: def?.account_number || undefined,
      };
      const notifications = {
        productUpdates: Boolean(prof.notify_product_updates),
        payouts: Boolean(prof.notify_payouts),
      };
      res.json({ profile, payment, notifications });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.put("/me/profile", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const username = String(req.body?.username || "").trim();
      const email = String(req.body?.email || "").trim();
      const phone = req.body?.phone ? String(req.body.phone).trim() : "";
      if (!username || !email) return res.status(400).json({ error: "invalid request" });
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      const exists = await usersRepo.usernameExists(username, payload.sub);
      if (exists) return res.status(409).json({ error: "username already taken" });
      await usersRepo.updateProfileWithUsername(payload.sub, email, phone, username);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/referrals", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const q = String(req.query?.q || "");
      const onboarding = String(req.query?.onboarding || "");
      const account = String(req.query?.account || "");
      const page = Math.max(1, Number(req.query?.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
      const offset = (page - 1) * limit;
      const { referrals, total } = await referralsRepo.listReferralsForUser({
        userId: payload.sub,
        q: q || undefined,
        onboarding: onboarding || undefined,
        account: account || undefined,
        limit,
        offset,
      });
      res.json({ referrals, total, page, limit });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/referrals/:username", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const uname = String(req.params.username || '').toLowerCase();
      const page = Math.max(1, Number(req.query?.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
      const { detail, orders, totalOrders } = await referralsRepo.getReferralDetail(payload.sub, uname, limit, (page - 1) * limit);
      if (!detail) return res.status(404).json({ error: "not found" });
      res.json({ referral: detail, orders, totalOrders, page, limit });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/referrals/:username/orders", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const uname = String(req.params.username || '').toLowerCase();
      const page = Math.max(1, Number(req.query?.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
      const { orders, total } = await referralsRepo.getReferralOrders(payload.sub, uname, limit, (page - 1) * limit);
      res.json({ orders, total, page, limit });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/payouts", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const page = Math.max(1, Number(req.query?.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
      const offset = (page - 1) * limit;
      const type = req.query?.type ? String(req.query.type) : undefined;
      const { rows, total } = await historyRepo.getPayoutsHistory(payload.sub, type as any, limit, offset);
      const bonusTotal = await ledgerRepo.sumLedgerByType(payload.sub, 'bonus');
      const withdrawalTotal = await ledgerRepo.sumLedgerByType(payload.sub, 'withdrawal');
      const summary = { bonusTotal, withdrawalTotal } as const;
      res.json({ summary, history: rows, total, page, limit });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/payment", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const accs = await bankAccountsRepo.listForUser(payload.sub);
      const def = accs.find(a => a.is_default) || accs[0];
      const payment = {
        bankName: def?.bank_name || undefined,
        bankAccountNumber: def?.account_number || undefined,
      };
      res.json(payment);
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.put("/me/payment", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const bankName = String(req.body?.bankName || '').trim();
      const accountNumber = String(req.body?.bankAccountNumber || '').trim();
      if (!bankName || !accountNumber) return res.status(400).json({ error: 'invalid request' });
      const created = await bankAccountsRepo.insert(payload.sub, bankName, accountNumber, true);
      const id = created.id;
      res.json({ ok: true, id });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/bank-accounts", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const rows = await bankAccountsRepo.listForUser(payload.sub);
      res.json(rows);
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/me/bank-accounts", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const bankName = String(req.body?.bankName || '').trim();
      const accountNumber = String(req.body?.bankAccountNumber || '').trim();
      if (!bankName || !accountNumber) return res.status(400).json({ error: 'invalid request' });
      const id = await bankAccountsRepo.insert(payload.sub, bankName, accountNumber, false);
      res.status(201).json({ id });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/me/bank-accounts/:id/default", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
      if (!(await bankAccountsRepo.existsForUser(payload.sub, id))) return res.status(404).json({ error: 'not found' });
      await bankAccountsRepo.setDefault(payload.sub, id);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.delete("/me/bank-accounts/:id", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
      if (!(await bankAccountsRepo.existsForUser(payload.sub, id))) return res.status(404).json({ error: 'not found' });
      await bankAccountsRepo.remove(payload.sub, id);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/me/notifications", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const prof = await usersRepo.getProfile(payload.sub);
      if (!prof) return res.status(404).json({ error: 'not found' });
      res.json({ productUpdates: Boolean(prof.notify_product_updates), payouts: Boolean(prof.notify_payouts) });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.put("/me/notifications", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      const productUpdates = Boolean(req.body?.productUpdates);
      const payouts = Boolean(req.body?.payouts);
      await usersRepo.updateNotifications(payload.sub, productUpdates, payouts);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.get("/me/withdrawals", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const page = Math.max(1, Number(req.query?.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
      const offset = (page - 1) * limit;
      const status = req.query?.status ? String(req.query.status) : undefined;
      const { rows, total } = await withdrawalsRepo.listForUser(payload.sub, limit, offset, status);
      res.json({ withdrawals: rows, total, page, limit });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/me/payouts/withdraw", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const amount = Number(req.body?.amount || 0);
      const bankAccountId = req.body?.bankAccountId ? Number(req.body.bankAccountId) : undefined;
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "invalid amount" });
      if (bankAccountId && !(await bankAccountsRepo.existsForUser(payload.sub, bankAccountId))) {
        return res.status(400).json({ error: "invalid bank account" });
      }
      const created = await withdrawalsRepo.insertPending(payload.sub, amount, bankAccountId);
      await ledgerRepo.insertWithdrawal(payload.sub, amount);
      res.json({ id: created.id, status: created.status });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/me/2fa/init", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const secret = base32Encode(randomBytes(20));
      await usersRepo.setTwofaTmpSecret(payload.sub, secret);
      const issuer = encodeURIComponent(process.env.TOTP_ISSUER || 'SpeedXPay');
      const label = encodeURIComponent(`${process.env.TOTP_LABEL_PREFIX || 'SpeedXPay Affiliate'}:${await usersRepo.getUsernameById(payload.sub) || 'user'}`);
      const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
      res.json({ otpauth });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/me/2fa/enable", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const code = String(req.body?.code || "");
      const tmpSecret = await usersRepo.getTwofaTmpSecret(payload.sub);
      if (!tmpSecret) return res.status(400).json({ error: "no pending 2fa setup" });
      if (!verifyTotp(tmpSecret, code)) return res.status(400).json({ error: "invalid code" });
      await usersRepo.enableTwofa(payload.sub, tmpSecret);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/me/2fa/disable", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      await usersRepo.disableTwofa(payload.sub);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.get("/me/2fa", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const user = await usersRepo.findUserById(payload.sub);
      const enabled = Boolean(user?.twofa_enabled);
      const issuer = String(process.env.TOTP_ISSUER || 'SpeedXPay');
      const username = (await usersRepo.getUsernameById(payload.sub)) || 'user';
      const labelPrefix = String(process.env.TOTP_LABEL_PREFIX || 'SpeedXPay Affiliate');
      const label = `${labelPrefix}:${username}`;
      res.json({ enabled, issuer, label, digits: 6, period: 30 });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/me/tour/seen", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      await usersRepo.setWelcomeTourSeen(payload.sub);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });
}
