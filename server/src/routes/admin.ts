import express from "express";
import { registerUser } from "../auth";
import * as usersRepo from "../repos/users";
import * as kycRepo from "../repos/kyc";
import * as referralsRepo from "../repos/referrals";
import * as withdrawalsRepo from "../repos/withdrawals";
import * as ledgerRepo from "../repos/ledger";

export function registerAdminRoutes(app: express.Express) {
  app.post("/admin/users", async (req, res) => {
    try {
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '').trim();
      if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
      const user = await registerUser(username, password);
      res.status(201).json({ user });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid request' });
    }
  });

  app.post("/admin/seed", async (req, res) => {
    try {
      const count = Math.max(1, Math.min(100, Number(req.body?.count || 10)));
      const prefix = (req.body?.prefix ? String(req.body.prefix) : 'user').toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 20) || 'user';
      const password = String(req.body?.password || 'password123');
      const created: Array<{ id: number; username: string }> = [];
      for (let i = 0; i < count; i++) {
        const uname = `${prefix}${i}`;
        try {
          const u = await registerUser(uname, password);
          created.push({ id: (u as any).id, username: u.username });
        } catch {}
      }
      res.json({ createdCount: created.length, users: created });
    } catch (e) {
      res.status(400).json({ error: 'Invalid request' });
    }
  });

  app.post("/admin/kyc/:username/approve", async (req, res) => {
    try {
      const uname = String(req.params.username || '').toLowerCase();
      const user = await usersRepo.findUserByUsername(uname);
      if (!user?.id) return res.status(404).json({ error: 'user not found' });
      const ok = await kycRepo.setLatestStatus(user.id, 'approved');
      if (!ok) return res.status(404).json({ error: 'kyc not found' });
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: 'Invalid request' }); }
  });

  app.post("/admin/kyc/:username/reject", async (req, res) => {
    try {
      const uname = String(req.params.username || '').toLowerCase();
      const user = await usersRepo.findUserByUsername(uname);
      if (!user?.id) return res.status(404).json({ error: 'user not found' });
      const reason = req.body?.reason ? String(req.body.reason) : undefined;
      const ok = await kycRepo.setLatestStatus(user.id, 'rejected', reason);
      if (!ok) return res.status(404).json({ error: 'kyc not found' });
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: 'Invalid request' }); }
  });

  app.post("/admin/referrals/link", async (req, res) => {
    try {
      const referrer = String(req.body?.referrer || '').toLowerCase();
      const referred = String(req.body?.referred || '').toLowerCase();
      if (!referrer || !referred) return res.status(400).json({ error: 'referrer and referred are required' });
      const ur = await usersRepo.findUserByUsername(referrer);
      const ue = await usersRepo.findUserByUsername(referred);
      if (!ur?.id || !ue?.id) return res.status(404).json({ error: 'user not found' });
      await referralsRepo.insertReferral(ur.id, ue.id, 0, 'Registered');
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: 'Invalid request' }); }
  });

  app.post("/admin/referral-orders", async (req, res) => {
    try {
      const username = String(req.body?.referred || '').toLowerCase();
      const amount = Number(req.body?.amount || 0);
      const orderId = req.body?.orderId ? String(req.body.orderId) : '';
      if (!username || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid input' });
      const u = await usersRepo.findUserByUsername(username);
      if (!u?.id) return res.status(404).json({ error: 'user not found' });
      const id = await (await import('../repos/orders')).insertOrder(u.id, orderId || `ord_${Date.now()}`, amount);
      res.json({ id });
    } catch (e) { res.status(400).json({ error: 'Invalid request' }); }
  });

  app.post("/admin/users/:username/status", async (req, res) => {
    try {
      const uname = String(req.params.username || '').toLowerCase();
      const status = String(req.body?.status || '').trim();
      if (!status) return res.status(400).json({ error: 'status required' });
      const u = await usersRepo.findUserByUsername(uname);
      if (!u?.id) return res.status(404).json({ error: 'user not found' });
      await usersRepo.setAccountStatus(u.id, status);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: 'Invalid request' }); }
  });

  app.get("/admin/withdrawals", async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query?.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
      const offset = (page - 1) * limit;
      const status = req.query?.status ? String(req.query.status) : undefined;
      const { rows, total } = await withdrawalsRepo.listAll(limit, offset, status);
      res.json({ withdrawals: rows, total, page, limit });
    } catch (e) { res.status(400).json({ error: 'Invalid request' }); }
  });

  app.post("/admin/withdrawals/:id/status", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '').trim();
      const note = req.body?.note ? String(req.body.note) : undefined;
      if (!Number.isFinite(id) || !['pending','approved','rejected'].includes(status)) return res.status(400).json({ error: 'invalid input' });
      if (status === 'rejected') {
        const w = await withdrawalsRepo.getById(id);
        if (w?.user_id && w?.amount) {
          await ledgerRepo.insertEntry(Number(w.user_id), 'bonus', Number(w.amount), 'Withdrawal rejected refund');
        }
      }
      await withdrawalsRepo.updateStatus(id, status as any, note);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: 'Invalid request' }); }
  });
}

