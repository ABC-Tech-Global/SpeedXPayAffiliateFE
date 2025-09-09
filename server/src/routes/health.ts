import express from "express";
import { pool } from "../db";

export function registerHealthRoutes(app: express.Express) {
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/db/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Simple users list (public)
  app.get("/users", async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, username, created_at FROM users ORDER BY id DESC"
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
}

