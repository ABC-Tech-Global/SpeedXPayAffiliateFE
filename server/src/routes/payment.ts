import express from "express";
import { verifyToken } from "../auth";
import * as bankAccountsRepo from "../repos/bank-accounts";

export function registerPaymentRoutes(app: express.Express) {
  app.get("/payment", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.put("/payment", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const bankName = String(req.body?.bankName || '').trim();
      const accountNumber = String(req.body?.bankAccountNumber || '').trim();
      if (!bankName || !accountNumber) return res.status(400).json({ error: 'invalid request' });
      const created = await bankAccountsRepo.insert(payload.sub, bankName, accountNumber, true);
      res.json({ ok: true, id: created.id });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });
}

