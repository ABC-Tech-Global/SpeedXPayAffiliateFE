import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { migrate, pool } from "./db";
import { loginUser, registerUser, verifyToken, changePassword } from "./auth";
import * as kycRepo from "./repos/kyc";
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
    const blobPath = String(req.body?.blobPath || "");
    const col = kindToColumn(kind);
    if (!col || !blobPath) return res.status(400).json({ error: "invalid request" });
    const draftId = await getOrCreateDraftId(payload.sub);
    await kycRepo.setUploadPathById(draftId, col, blobPath);
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
        const fullUrl = `https://blob.vercel-storage.com/${String(p).replace(/^\//, '')}`;
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
    const url = `https://blob.vercel-storage.com/${p.replace(/^\//, '')}`;
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
    res.json({ kyc });
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
