import { pool } from "../db";

export type BasicUser = { id: number; username: string };

export async function createUser(username: string, passwordHash: string) {
  const { rows } = await pool.query(
    `INSERT INTO users(username, password_hash)
     VALUES($1, $2)
     ON CONFLICT (username) DO NOTHING
     RETURNING id, username, password_hash, created_at`,
    [username, passwordHash]
  );
  return rows[0] || null;
}

export async function findUserByUsername(username: string) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE username = $1 LIMIT 1`, [username]);
  return rows[0] || null;
}

export async function findUserById(id: number) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function listUsersBasic() {
  const { rows } = await pool.query(`SELECT id, username, created_at FROM users ORDER BY id DESC`);
  return rows as Array<{ id: number; username: string; created_at: string }>;
}

export async function getUserMe(id: number) {
  const { rows } = await pool.query(
    `SELECT id, username, password_reset_required FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getProfile(id: number) {
  const { rows } = await pool.query(
    `SELECT id, username, email, phone, bank_name, bank_account_number, notify_product_updates, notify_payouts, twofa_enabled, welcome_tour_seen FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function usernameExists(username: string, excludeId: number) {
  const { rows } = await pool.query(`SELECT id FROM users WHERE username = $1 AND id <> $2`, [username, excludeId]);
  return Boolean(rows[0]);
}

export async function updateProfileWithUsername(id: number, email: string, phone: string, username: string) {
  await pool.query(`UPDATE users SET email = $1, phone = $2, username = $3 WHERE id = $4`, [email, phone, username, id]);
}

export async function updateProfile(id: number, email: string, phone: string) {
  await pool.query(`UPDATE users SET email = $1, phone = $2 WHERE id = $3`, [email, phone, id]);
}

export async function getPayment(id: number) {
  const { rows } = await pool.query(`SELECT bank_name, bank_account_number FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function updatePayment(id: number, bankName: string, bankAccountNumber: string) {
  await pool.query(`UPDATE users SET bank_name = $1, bank_account_number = $2 WHERE id = $3`, [bankName, bankAccountNumber, id]);
}

export async function getNotifications(id: number) {
  const { rows } = await pool.query(`SELECT notify_product_updates, notify_payouts FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function updateNotifications(id: number, productUpdates: boolean, payouts: boolean) {
  await pool.query(`UPDATE users SET notify_product_updates = $1, notify_payouts = $2 WHERE id = $3`, [productUpdates, payouts, id]);
}

export async function setWelcomeTourSeen(id: number) {
  await pool.query(`UPDATE users SET welcome_tour_seen=true WHERE id=$1`, [id]);
}

export async function setTwofaTmpSecret(id: number, secret: string) {
  await pool.query(`UPDATE users SET twofa_tmp_secret=$1 WHERE id=$2`, [secret, id]);
}

export async function getUsernameById(id: number) {
  const u = await pool.query(`SELECT username FROM users WHERE id=$1`, [id]);
  return u.rows[0]?.username as string | undefined;
}

export async function getTwofaTmpSecret(id: number) {
  const r = await pool.query(`SELECT twofa_tmp_secret FROM users WHERE id=$1`, [id]);
  return r.rows[0]?.twofa_tmp_secret as string | undefined;
}

export async function enableTwofa(id: number, secret: string) {
  await pool.query(`UPDATE users SET twofa_secret=$1, twofa_enabled=true, twofa_tmp_secret=NULL WHERE id=$2`, [secret, id]);
}

export async function getTwofaSecret(id: number) {
  const r = await pool.query(`SELECT twofa_secret FROM users WHERE id=$1`, [id]);
  return r.rows[0]?.twofa_secret as string | undefined;
}

export async function disableTwofa(id: number) {
  await pool.query(`UPDATE users SET twofa_secret=NULL, twofa_enabled=false WHERE id=$1`, [id]);
}

export async function updatePassword(userId: number, passwordHash: string, clearResetRequired = true) {
  if (clearResetRequired) {
    await pool.query(`UPDATE users SET password_hash = $1, password_reset_required = false WHERE id = $2`, [passwordHash, userId]);
  } else {
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
  }
}
