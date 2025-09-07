import express from "express";
import { verifyToken } from "../auth";
import * as usersRepo from "../repos/users";
import { verifyTotp } from "./helpers";
import { randomBytes } from "crypto";

export function registerTwofaRoutes(app: express.Express) {
  app.post("/2fa/init", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const b = randomBytes(20);
      // Base32 encode using helper decode in reverse (small helper inline)
      const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      function base32Encode(buf: Buffer) {
        let bits = 0, value = 0, output = "";
        for (const byte of buf) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += B32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; } }
        if (bits > 0) output += B32_ALPHABET[(value << (5 - bits)) & 31];
        while (output.length % 8 !== 0) output += "=";
        return output;
      }
      const secretStr = base32Encode(b);
      await usersRepo.setTwofaTmpSecret(payload.sub, secretStr);
      const issuer = encodeURIComponent(process.env.TOTP_ISSUER || 'SpeedXPay');
      const label = encodeURIComponent(`${process.env.TOTP_LABEL_PREFIX || 'SpeedXPay Affiliate'}:${await usersRepo.getUsernameById(payload.sub) || 'user'}`);
      const otpauth = `otpauth://totp/${label}?secret=${secretStr}&issuer=${issuer}&digits=6&period=30`;
      res.json({ otpauth });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/2fa/enable", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const code = String(req.body?.code || "");
      const tmpSecret = await usersRepo.getTwofaTmpSecret(payload.sub);
      if (!tmpSecret) return res.status(400).json({ error: "no pending 2fa setup" });
      if (!verifyTotp(tmpSecret, code)) return res.status(400).json({ error: "invalid code" });
      await usersRepo.enableTwofa(payload.sub, tmpSecret);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.post("/2fa/disable", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const user = await usersRepo.findUserById(payload.sub);
      if (!user?.twofa_enabled) return res.json({ ok: true });
      const hdr = (req.headers['x-2fa-code'] as string | undefined) || '';
      if (!hdr || !verifyTotp(user.twofa_secret || '', hdr)) return res.status(400).json({ error: 'invalid 2fa code' });
      await usersRepo.disableTwofa(payload.sub);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });

  app.get("/2fa", async (req, res) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing token" });
      const payload = verifyToken(token);
      const user = await usersRepo.findUserById(payload.sub);
      const enabled = Boolean(user?.twofa_enabled);
      const issuer = String(process.env.TOTP_ISSUER || 'SpeedXPay');
      const username = (await usersRepo.getUsernameById(payload.sub)) || 'user';
      const labelPrefix = String(process.env.TOTP_LABEL_PREFIX || 'SpeedXPay Affiliate');
      const label = `${labelPrefix}:${username}`;
      res.json({ enabled, issuer, label, digits: 6, period: 30 });
    } catch (e) { res.status(400).json({ error: "Invalid request" }); }
  });
}
