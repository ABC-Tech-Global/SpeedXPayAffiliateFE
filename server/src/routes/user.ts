import express from "express";
import { verifyToken } from "../auth";

export function registerUserRoutes(app: express.Express) {
  app.get("/user", (req, res) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing token" });
    try {
      const payload = verifyToken(token);
      res.json({ ok: true, user: { id: payload.sub, username: payload.username } });
    } catch {
      res.status(401).json({ error: "invalid token" });
    }
  });
}
