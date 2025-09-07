import express from "express";
import { verifyToken } from "../auth";
import * as usersRepo from "../repos/users";
import { verifyTwofaIfEnabledOrSend } from "./helpers";

export function registerNotificationRoutes(app: express.Express) {
  app.get("/notifications", async (req, res) => {
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

  app.put("/notifications", async (req, res) => {
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
}

