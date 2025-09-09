import express from "express";
import { verifyToken } from "../auth";
import * as bankAccountsRepo from "../repos/bank-accounts";
import { verifyTwofaIfEnabledOrSend } from "./helpers";

export function registerBankAccountRoutes(app: express.Express) {
  app.get("/bank-accounts", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const rows = await bankAccountsRepo.listForUser(payload.sub);
      res.json(rows);
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/bank-accounts", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const bankName = String(req.body?.bankName || '').trim();
      const accountNumber = String(req.body?.bankAccountNumber || '').trim();
      if (!bankName || !accountNumber) return res.status(400).json({ error: 'invalid request' });
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      const makeDefault = Boolean(req.body?.makeDefault);
      const created = await bankAccountsRepo.insert(payload.sub, bankName, accountNumber, makeDefault);
      res.status(201).json({ id: created.id });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/bank-accounts/:id/default", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
      if (!(await bankAccountsRepo.existsForUser(payload.sub, id))) return res.status(404).json({ error: 'not found' });
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      await bankAccountsRepo.setDefault(payload.sub, id);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.delete("/bank-accounts/:id", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
      if (!(await bankAccountsRepo.existsForUser(payload.sub, id))) return res.status(404).json({ error: 'not found' });
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      await bankAccountsRepo.remove(payload.sub, id);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });
}
