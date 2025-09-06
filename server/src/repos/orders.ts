import { pool } from "../db";

export async function countReferralOrdersForUser(referredId: number, from?: string, to?: string) {
  const whereParts: string[] = ['referred_id=$1'];
  const params: any[] = [referredId];
  if (from) { whereParts.push(`created_at >= $${params.length+1}`); params.push(new Date(from)); }
  if (to) { whereParts.push(`created_at <= $${params.length+1}`); params.push(new Date(to)); }
  const where = whereParts.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) AS c FROM referral_orders WHERE ${where}`, params);
  return { total: Number(countRes.rows[0]?.c || 0), where, params };
}

export async function listReferralOrdersForUser(referredId: number, opts: { from?: string; to?: string; limit: number; offset: number }) {
  const { from, to, limit, offset } = opts;
  const whereParts: string[] = ['referred_id=$1'];
  const params: any[] = [referredId];
  if (from) { whereParts.push(`created_at >= $${params.length+1}`); params.push(new Date(from)); }
  if (to) { whereParts.push(`created_at <= $${params.length+1}`); params.push(new Date(to)); }
  const where = whereParts.join(' AND ');
  const ordersRes = await pool.query(
    `SELECT id, order_id, amount, created_at FROM referral_orders WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  return ordersRes.rows;
}

export async function insertOrder(referredId: number, orderId: string, amount: number, createdAt?: Date) {
  const { rows } = await pool.query(
    `INSERT INTO referral_orders (referred_id, order_id, amount, created_at)
     VALUES ($1,$2,$3, COALESCE($4, NOW())) RETURNING id`,
    [referredId, orderId, amount, createdAt || null]
  );
  return rows[0]?.id as number;
}
