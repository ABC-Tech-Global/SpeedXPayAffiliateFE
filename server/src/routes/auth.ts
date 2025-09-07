import express from "express";
import { loginUser, registerUser } from "../auth";

export function registerAuthRoutes(app: express.Express) {
  app.post("/auth/register", async (req, res) => {
    const username = String(req.body?.username || "");
    const password = String(req.body?.password || "");
    try {
      const user = await registerUser(username, password);
      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ error: String(err instanceof Error ? err.message : err) });
    }
  });

  app.post("/auth/login", async (req, res) => {
    const username = String(req.body?.username || "");
    const password = String(req.body?.password || "");
    try {
      const result = await loginUser(username, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: "Invalid username or password" });
    }
  });
}

