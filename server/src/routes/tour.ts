import express from "express";
import { verifyToken } from "../auth";
import * as usersRepo from "../repos/users";

export function registerTourRoutes(app: express.Express) {
  app.post("/tour/seen", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      await usersRepo.setWelcomeTourSeen(payload.sub);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });
}

