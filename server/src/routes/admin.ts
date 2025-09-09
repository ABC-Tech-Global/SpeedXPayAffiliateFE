import express from "express";
import { registerUser } from "../auth"; // used by /admin/users; seed no longer creates users
import * as usersRepo from "../repos/users";
import * as kycRepo from "../repos/kyc";
import * as referralsRepo from "../repos/referrals";
import * as withdrawalsRepo from "../repos/withdrawals";
import * as ledgerRepo from "../repos/ledger";
import * as ordersRepo from "../repos/orders";
import { pool } from "../db";

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

  // Enhanced seed: link random existing users as referrals to the specified user
  // (does NOT create any users), create referral orders for those referees,
  // and insert commissions ledger entries for the referrer.
  app.post("/admin/seed", async (req, res) => {
    try {
      const body = req.body || {};
      const user = body.user || {};
      const referralsCfg = body.referrals || {};
      const ledgerCfg = body.ledger || {};

      const username = String(user.username || '').trim().toLowerCase();
      const password = String(user.password || 'password123');
      if (!username) return res.status(400).json({ error: 'user.username is required' });

      // Find or create the referrer user (to allow random new usernames)
      let referrer = await usersRepo.findUserByUsername(username);
      if (!referrer) {
        const created = await registerUser(username, password);
        referrer = await usersRepo.findUserByUsername(created.username);
      }
      if (!referrer?.id) return res.status(500).json({ error: 'failed to load referrer user' });

      // Referral generation config
      const referralCount = Math.max(0, Math.min(100, Number(referralsCfg.count ?? 3)));
      const ordersPerReferral = Math.max(0, Math.min(50, Number(referralsCfg.ordersPerReferral ?? 1)));
      let amountMin = Number.isFinite(Number(referralsCfg.amountMin)) ? Math.max(0, Number(referralsCfg.amountMin)) : 10;
      let amountMax = Number.isFinite(Number(referralsCfg.amountMax)) ? Math.max(0, Number(referralsCfg.amountMax)) : 100;
      if (amountMax < amountMin) [amountMin, amountMax] = [amountMax, amountMin];
      const onboardingOptions = ['Registered', 'active', 'deactivated'] as const;
      const randomizeOnboarding = Boolean(referralsCfg.randomizeOnboarding ?? true);
      const providedOnboarding = referralsCfg.onboardingStatus ? String(referralsCfg.onboardingStatus) : undefined;
      const sampleExisting = Boolean(referralsCfg.sampleExisting ?? false);
      const createMissing = Boolean(referralsCfg.createMissing ?? (!sampleExisting));

      function randInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      function randAmount(min: number, max: number) {
        const cents = randInt(Math.round(min * 100), Math.round(max * 100));
        return cents / 100;
      }
      function randSuffix(n = 6) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let out = '';
        for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      }

      const referredUsers: Array<{ id: number; username: string }> = [];
      let totalOrdersAmount = 0;
      let totalOrdersCount = 0;

      // Fetch random existing users (excluding referrer)
      let candidates: Array<{ id: number; username: string }> = [];
      if (sampleExisting) {
        const rs = await pool.query(
          `SELECT id, username FROM users WHERE id <> $1 ORDER BY random() LIMIT $2`,
          [referrer.id, referralCount]
        );
        candidates = rs.rows.map((r: any) => ({ id: Number(r.id), username: String(r.username) }));
      }
      // Create referred users (either to fill missing when sampling, or all when not sampling)
      const needToCreate = sampleExisting ? Math.max(0, referralCount - candidates.length) : referralCount;
      for (let k = 0; k < needToCreate; k++) {
        let uname = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        // ensure uniqueness
        for (let attempts = 0; attempts < 5; attempts++) {
          const exists = await usersRepo.findUserByUsername(uname);
          if (!exists) break;
          uname = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
        const pwd = Math.random().toString(36).slice(2, 10);
        const created = await registerUser(uname, pwd);
        const row = await usersRepo.findUserByUsername(created.username);
        if (row?.id) candidates.push({ id: Number(row.id), username: String(row.username) });
      }

      for (let i = 0; i < candidates.length; i++) {
        const referredRow = candidates[i];
        referredUsers.push({ id: Number(referredRow.id), username: String(referredRow.username) });

        // Determine onboarding status
        const onboardingStatus = randomizeOnboarding
          ? onboardingOptions[Math.floor(Math.random() * onboardingOptions.length)]
          : (providedOnboarding || 'Registered');

        // Create orders only for 'active' or 'deactivated'
        let sumForReferral = 0;
        if (onboardingStatus === 'active' || onboardingStatus === 'deactivated') {
          for (let j = 0; j < ordersPerReferral; j++) {
            const amt = randAmount(amountMin, amountMax);
            const oid = `ord_${Date.now()}_${i}_${j}_${randSuffix(4)}`;
            await ordersRepo.insertOrder(Number(referredRow.id), oid, amt);
            sumForReferral += amt;
            totalOrdersAmount += amt;
            totalOrdersCount += 1;
          }
        }
        // Insert referral link with amount_processed equal to sum of orders (skip if exists)
        const exists = await referralsRepo.linkExists(referrer.id, Number(referredRow.id));
        if (!exists) {
          await referralsRepo.insertReferral(referrer.id, Number(referredRow.id), sumForReferral, onboardingStatus);
        }
      }

      // Ledger entries for referrer (support randomization)
      const randomizeBonus = Boolean(ledgerCfg.randomizeBonus ?? false);
      const randomizeWithdrawal = Boolean(ledgerCfg.randomizeWithdrawal ?? false);
      let bonusAmount = 0;
      if (randomizeBonus) {
        const bMin = Math.max(0, Number(ledgerCfg.bonusMin ?? 1));
        const bMax = Math.max(bMin, Number(ledgerCfg.bonusMax ?? Math.max(1, Math.round(totalOrdersAmount))))
        bonusAmount = randAmount(bMin, bMax);
      } else if (ledgerCfg.bonusAmount != null && Number(ledgerCfg.bonusAmount) > 0) {
        bonusAmount = Number(ledgerCfg.bonusAmount);
      } else {
        bonusAmount = Number(((ledgerCfg.bonusPercentOfOrders ?? 10) / 100) * totalOrdersAmount);
      }
      let withdrawalAmount = 0;
      if (randomizeWithdrawal) {
        const wMin = Math.max(0, Number(ledgerCfg.withdrawalMin ?? 0));
        const wMax = Math.max(wMin, Number(ledgerCfg.withdrawalMax ?? Math.max(1, Math.round(totalOrdersAmount / 2))));
        withdrawalAmount = randAmount(wMin, wMax);
      } else if (ledgerCfg.withdrawalAmount != null && Number(ledgerCfg.withdrawalAmount) > 0) {
        withdrawalAmount = Number(ledgerCfg.withdrawalAmount);
      } else {
        withdrawalAmount = 0;
      }
      if (Number.isFinite(bonusAmount) && bonusAmount > 0) {
        await ledgerRepo.insertEntry(referrer.id, 'bonus', bonusAmount, String(ledgerCfg.description || 'Seed bonus'));
      }
      if (Number.isFinite(withdrawalAmount) && withdrawalAmount > 0) {
        await ledgerRepo.insertEntry(referrer.id, 'withdrawal', withdrawalAmount, 'Seed withdrawal');
      }

      res.json({
        user: { id: referrer.id, username: referrer.username },
        requestedReferrals: referralCount,
        referralsCreated: referredUsers.length,
        referredUsers,
        orders: { count: totalOrdersCount, totalAmount: Number(totalOrdersAmount.toFixed(2)) },
        ledger: {
          bonusInserted: bonusAmount > 0 ? Number(bonusAmount.toFixed(2)) : 0,
          withdrawalInserted: withdrawalAmount > 0 ? Number(withdrawalAmount.toFixed(2)) : 0,
        },
        note: (sampleExisting && !createMissing && candidates.length < referralCount) ? `Only ${candidates.length} referrals created due to limited existing users` : undefined,
      });
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
