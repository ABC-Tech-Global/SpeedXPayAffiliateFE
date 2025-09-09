import express from "express";
import { verifyToken } from "../auth";
import * as kycRepo from "../repos/kyc";
import { isAbsoluteUrl, kindToColumn, toPublicBlobUrl } from "./helpers";

async function getOrCreateDraftId(userId: number) {
  const latest = await kycRepo.getLatestDraftOrRejected(userId);
  if (latest?.id) return latest.id as number;
  return await kycRepo.insertNew(userId, '', undefined, undefined);
}

export function registerKycRoutes(app: express.Express) {
  app.get("/kyc", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/kyc", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const fullName = String(req.body?.fullName || "").trim();
      const dob = req.body?.dob ? String(req.body.dob) : undefined;
      const gender = req.body?.gender ? String(req.body.gender) : undefined;
      if (!fullName) return res.status(400).json({ error: "fullName is required" });
      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return res.status(400).json({ error: "dob must be YYYY-MM-DD" });
      const draftId = await getOrCreateDraftId(payload.sub);
      await kycRepo.updateDraftBasic(draftId, fullName, dob, gender);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/kyc/upload", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.delete("/kyc/upload/:kind", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.get("/kyc/image/:kind", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/kyc/submit", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const latest = await kycRepo.getLatest(payload.sub);
      if (!latest?.id) return res.status(404).json({ error: "not found" });
      await kycRepo.submit(payload.sub, latest.id as number);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });
}

