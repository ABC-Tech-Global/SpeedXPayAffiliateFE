import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { migrate, pool } from "./db";
import { loginUser, registerUser, verifyToken, changePassword } from "./auth";
import * as kycRepo from "./repos/kyc";
import * as usersRepo from "./repos/users";
import * as referralsRepo from "./repos/referrals";
import * as ledgerRepo from "./repos/ledger";
import * as historyRepo from "./repos/history";
import * as withdrawalsRepo from "./repos/withdrawals";
import { createHmac, randomBytes } from "crypto";
import { openapiSpec } from "./openapi";
import swaggerUi from "swagger-ui-express";

config();

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: corsOrigin, credentials: false }));
app.use(express.json());

// OpenAPI spec and Swagger UI (served via CDN, no extra deps)
app.get("/openapi.json", (_req, res) => {
  res.json(openapiSpec);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/db/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/users", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, created_at FROM users ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/auth/register", async (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  try {
    const user = await registerUser(username, password);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

app.post("/auth/login", async (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  try {
    const result = await loginUser(username, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

// Map kind to DB column
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
  // Fallback to generic domain if base not configured
  return `https://blob.vercel-storage.com/${clean}`;
}

// --- Minimal Base32 (RFC 4648) + TOTP helpers ---
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
  // Pad to multiple of 8 chars using '=' per RFC 4648
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
    if (idx === -1) continue; // skip invalid
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
  let tmp = step >>> 0; // lower 32
  let hi = Math.floor(step / 0x100000000); // upper 32
  for (let i = 7; i >= 0; i--) {
    msg[i] = tmp & 0xff;
    tmp >>>= 8;
    if (i === 4) tmp = hi;
  }
  const h = createHmac('sha1', key).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const bin = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16) | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
  const code = (bin % 1_000_000).toString().padStart(6, '0');
  return code;
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

    // Attempt to delete the blob from Vercel Blob (best-effort)
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
    // Augment with convenience booleans for client display
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

// Save/Update basic KYC info (full name, dob, gender)
app.post("/me/kyc", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);

    const fullName = String(req.body?.fullName || "").trim();
    const dob = req.body?.dob ? String(req.body.dob) : undefined; // expected YYYY-MM-DD
    const gender = req.body?.gender ? String(req.body.gender) : undefined; // 'male' | 'female' | ''

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

// Profile (basic details + payment + notifications)
app.get("/me/profile", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);

    const prof = await usersRepo.getProfile(payload.sub);
    if (!prof) return res.status(404).json({ error: "not found" });

    const profile = {
      username: prof.username || undefined,
      email: prof.email || undefined,
      phone: prof.phone || undefined,
      twofaEnabled: Boolean(prof.twofa_enabled),
      welcomeTourSeen: Boolean(prof.welcome_tour_seen),
    };
    const payment = {
      bankName: prof.bank_name || undefined,
      bankAccountNumber: prof.bank_account_number || undefined,
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

// --- New grouped route aliases (Users): mirror existing "/me/*" ---
app.get("/users/me", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me${q}` } as any, res, () => undefined);
});

app.get("/users/me/profile", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me/profile${q}` } as any, res, () => undefined);
});
app.put("/users/me/profile", async (req, res) => {
  (req as any).url = "/me/profile";
  return app._router.handle(req as any, res, () => undefined);
});

app.get("/users/me/payment", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me/payment${q}` } as any, res, () => undefined);
});
app.put("/users/me/payment", async (req, res) => {
  (req as any).url = "/me/payment";
  return app._router.handle(req as any, res, () => undefined);
});

app.get("/users/me/notifications", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me/notifications${q}` } as any, res, () => undefined);
});
app.put("/users/me/notifications", async (req, res) => {
  (req as any).url = "/me/notifications";
  return app._router.handle(req as any, res, () => undefined);
});

app.post("/users/me/change-password", async (req, res) => {
  (req as any).url = "/me/change-password";
  return app._router.handle(req as any, res, () => undefined);
});

app.post("/users/me/tour/seen", async (req, res) => {
  (req as any).url = "/me/tour/seen";
  return app._router.handle(req as any, res, () => undefined);
});

// 2FA grouped
app.get("/users/me/2fa", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me/2fa${q}` } as any, res, () => undefined);
});
app.post("/users/me/2fa/init", async (req, res) => {
  (req as any).url = "/me/2fa/init";
  return app._router.handle(req as any, res, () => undefined);
});
app.post("/users/me/2fa/enable", async (req, res) => {
  (req as any).url = "/me/2fa/enable";
  return app._router.handle(req as any, res, () => undefined);
});
app.post("/users/me/2fa/disable", async (req, res) => {
  (req as any).url = "/me/2fa/disable";
  return app._router.handle(req as any, res, () => undefined);
});

// --- KYC grouped ---
app.get("/kyc/me", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me/kyc${q}` } as any, res, () => undefined);
});
app.post("/kyc/me", async (req, res) => {
  (req as any).url = "/me/kyc";
  return app._router.handle(req as any, res, () => undefined);
});
app.post("/kyc/me/upload", async (req, res) => {
  (req as any).url = "/me/kyc/upload";
  return app._router.handle(req as any, res, () => undefined);
});
app.post("/kyc/me/submit", async (req, res) => {
  (req as any).url = "/me/kyc/submit";
  return app._router.handle(req as any, res, () => undefined);
});
app.delete("/kyc/me/upload/:kind", async (req, res) => {
  (req as any).url = `/me/kyc/upload/${req.params.kind}`;
  return app._router.handle(req as any, res, () => undefined);
});
app.get("/kyc/me/image/:kind", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  (req as any).url = `/me/kyc/image/${req.params.kind}${q}`;
  return app._router.handle(req as any, res, () => undefined);
});

// --- Referrals grouped ---
app.get("/referrals", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me/referrals${q}` } as any, res, () => undefined);
});
app.get("/referrals/:username", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  (req as any).url = `/me/referrals/${req.params.username}${q}`;
  return app._router.handle(req as any, res, () => undefined);
});
app.get("/referrals/:username/orders", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  (req as any).url = `/me/referrals/${req.params.username}/orders${q}`;
  return app._router.handle(req as any, res, () => undefined);
});

// --- Payouts & Withdrawals grouped ---
app.get("/payouts", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me/payouts${q}` } as any, res, () => undefined);
});
app.post("/payouts/withdraw", async (req, res) => {
  (req as any).url = "/me/payouts/withdraw";
  return app._router.handle(req as any, res, () => undefined);
});
app.get("/withdrawals", async (req, res) => {
  const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  return app._router.handle({ ...req, url: `/me/withdrawals${q}` } as any, res, () => undefined);
});

// Update profile
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

    // Ensure username is unique
    const exists = await usersRepo.usernameExists(username, payload.sub);
    if (exists) return res.status(409).json({ error: "username already taken" });

    await usersRepo.updateProfileWithUsername(payload.sub, email, phone, username);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// Referrals list for current user (with filters/pagination)
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

// Referral detail for specific referred username
app.get("/me/referrals/:username", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    const username = String(req.params?.username || "");
    if (!username) return res.status(400).json({ error: "invalid request" });

    const referred = await usersRepo.findUserByUsername(username);
    if (!referred?.id) return res.status(404).json({ error: "not found" });
    const linked = await referralsRepo.linkExists(payload.sub, referred.id);
    if (!linked) return res.status(404).json({ error: "not found" });

    const ov = await referralsRepo.getReferralOverview(payload.sub, referred.id);
    const q = await pool.query(
      `SELECT 
         COALESCE(r.onboarding_status,
           CASE WHEN EXISTS (
             SELECT 1 FROM kyc_submissions ks WHERE ks.user_id = r.referred_id AND ks.status = 'approved'
           ) THEN 'Completed KYC' ELSE 'Registered' END
         ) AS onboarding_status,
         u.account_status
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = $1 AND r.referred_id = $2
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [payload.sub, referred.id]
    );
    const row = q.rows[0] || {};
    res.json({
      referral: {
        onboarding_status: row.onboarding_status || 'Registered',
        account_status: row.account_status || 'active',
        amount_processed: ov.amountProcessed,
        orders_count: ov.ordersCount,
      },
    });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// Referral orders for a specific referred username
app.get("/me/referrals/:username/orders", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    const username = String(req.params?.username || "");
    if (!username) return res.status(400).json({ error: "invalid request" });
    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
    const offset = (page - 1) * limit;

    const referred = await usersRepo.findUserByUsername(username);
    if (!referred?.id) return res.status(404).json({ error: "not found" });
    const linked = await referralsRepo.linkExists(payload.sub, referred.id);
    if (!linked) return res.status(404).json({ error: "not found" });

    const { rows, total } = await ordersRepo.listReferralOrdersForUser(referred.id, { limit, offset });
    res.json({ orders: rows, total, page, limit });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// Payouts summary + history
app.get("/me/payouts", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);

    const type = req.query?.type ? String(req.query.type) : undefined; // 'referral_order' | 'bonus' | 'withdrawal'
    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
    const offset = (page - 1) * limit;

    // History (union of referral orders + commissions ledger)
    const { total, rows } = await historyRepo.getPayoutsHistory(payload.sub, type, limit, offset);

    // Balance = sum(referral earnings) + bonuses - withdrawals
    const [ordersSum, bonusSum, withdrawalSum] = await Promise.all([
      referralsRepo.sumReferralsProcessed(payload.sub),
      ledgerRepo.sumLedgerByType(payload.sub, 'bonus'),
      ledgerRepo.sumLedgerByType(payload.sub, 'withdrawal'),
    ]);
    const balance = Number(ordersSum) + Number(bonusSum) - Number(withdrawalSum);

    res.json({ balance, history: rows, total, page, limit });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// Payment info
app.get("/me/payment", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    const p = await usersRepo.getPayment(payload.sub);
    res.json({ bankName: p?.bank_name || null, bankAccountNumber: p?.bank_account_number || null });
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
    const bankName = String(req.body?.bankName || "").trim();
    const bankAccountNumber = String(req.body?.bankAccountNumber || "").trim();
    if (!bankName || !bankAccountNumber) return res.status(400).json({ error: "invalid request" });
    if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
    await usersRepo.updatePayment(payload.sub, bankName, bankAccountNumber);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// Notifications preferences
app.get("/me/notifications", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    const n = await usersRepo.getNotifications(payload.sub);
    res.json({ productUpdates: Boolean(n?.notify_product_updates), payouts: Boolean(n?.notify_payouts) });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

app.put("/me/notifications", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    const productUpdates = Boolean(req.body?.productUpdates);
    const payouts = Boolean(req.body?.payouts);
    if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
    await usersRepo.updateNotifications(payload.sub, productUpdates, payouts);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// Withdrawals list
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
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// Create a withdrawal request
app.post("/me/payouts/withdraw", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "invalid amount" });

    // Persist the withdrawal request
    const created = await withdrawalsRepo.insertPending(payload.sub, amount);
    // Record ledger entry to reserve funds
    await ledgerRepo.insertWithdrawal(payload.sub, amount);
    res.json({ id: created.id, status: created.status });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// 2FA: initialize (generate secret and return otpauth URI)
app.post("/me/2fa/init", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    const secret = base32Encode(randomBytes(20)); // 160-bit secret
    await usersRepo.setTwofaTmpSecret(payload.sub, secret);
    const issuer = encodeURIComponent(process.env.TOTP_ISSUER || 'SpeedXPay');
    const label = encodeURIComponent(`${process.env.TOTP_LABEL_PREFIX || 'SpeedXPay Affiliate'}:${await usersRepo.getUsernameById(payload.sub) || 'user'}`);
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
    res.json({ otpauth });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// 2FA: enable (verify code and persist secret)
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
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// 2FA: disable
app.post("/me/2fa/disable", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
    await usersRepo.disableTwofa(payload.sub);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// 2FA: details
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
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// Welcome tour
app.post("/me/tour/seen", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    const payload = verifyToken(token);
    await usersRepo.setWelcomeTourSeen(payload.sub);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Invalid request" });
  }
});

const port = Number(process.env.PORT || 4000);

async function main() {
  await migrate();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start API:", err);
  process.exit(1);
});
