import express from "express";
import { verifyToken } from "../auth";
import * as usersRepo from "../repos/users";
import { verifyTwofaIfEnabledOrSend } from "./helpers";

export function registerProfileRoutes(app: express.Express) {
  app.get("/profile", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const prof = await usersRepo.getProfile(payload.sub);
      if (!prof) return res.status(404).json({ error: "not found" });
      const profile = {
        username: prof.username || undefined,
        email: prof.email || undefined,
        phone: prof.phone || undefined,
        twofaEnabled: Boolean(prof.twofa_enabled),
        welcomeTourSeen: Boolean(prof.welcome_tour_seen),
      };
      res.json(profile);
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.put("/profile", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const username = String(req.body?.username || "").trim();
      const email = String(req.body?.email || "").trim();
      const phone = req.body?.phone ? String(req.body.phone).trim() : "";
      if (!username || !email) return res.status(400).json({ error: "invalid request" });
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      const exists = await usersRepo.usernameExists(username, payload.sub);
      if (exists) return res.status(409).json({ error: "username already taken" });
      await usersRepo.updateProfileWithUsername(payload.sub, email, phone, username);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });
}

