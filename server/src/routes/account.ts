import express from "express";
import { verifyToken, changePassword } from "../auth";
import { verifyTwofaIfEnabledOrSend } from "./helpers";

export function registerAccountRoutes(app: express.Express) {
  app.post("/account/change-password", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const newPassword = String(req.body?.newPassword || "");
      if (newPassword.length < 6) return res.status(400).json({ error: "password must be at least 6 characters" });
      if (!(await verifyTwofaIfEnabledOrSend(payload.sub, req, res))) return;
      await changePassword(payload.sub, "", newPassword);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "Invalid request" });
    }
  });
}

