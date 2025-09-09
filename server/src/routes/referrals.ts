import express from "express";
import { verifyToken } from "../auth";
import * as referralsRepo from "../repos/referrals";

export function registerReferralRoutes(app: express.Express) {
  app.get("/referrals", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.get("/referrals/:username", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.get("/referrals/:username/orders", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });
}

