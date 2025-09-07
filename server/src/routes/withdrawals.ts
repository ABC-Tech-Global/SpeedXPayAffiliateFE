import express from "express";
import { verifyToken } from "../auth";
import * as withdrawalsRepo from "../repos/withdrawals";

export function registerWithdrawalRoutes(app: express.Express) {
  app.get("/withdrawals", async (req, res) => {
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
}

