import express from "express";
import { verifyToken } from "../auth";
import * as historyRepo from "../repos/history";
import * as ledgerRepo from "../repos/ledger";
import * as bankAccountsRepo from "../repos/bank-accounts";
import * as withdrawalsRepo from "../repos/withdrawals";

export function registerPayoutRoutes(app: express.Express) {
  app.get("/payouts", async (req, res) => {
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
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/payouts/withdraw", async (req, res) => {
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
}

