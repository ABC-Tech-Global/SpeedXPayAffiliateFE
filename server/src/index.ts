import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { migrate, pool } from "./db";
import { loginUser, registerUser, verifyToken } from "./auth";

config();

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: corsOrigin, credentials: false }));
app.use(express.json());

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

app.get("/me", (req, res) => {
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

const port = Number(process.env.PORT || 4000);

async function main() {
  await migrate();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start API:", err);
  process.exit(1);
});
