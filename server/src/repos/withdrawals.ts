import { pool } from "../db";

export async function insertPending(userId: number, amount: number) {
  const { rows } = await pool.query(
    `INSERT INTO withdrawal_requests (user_id, amount, status) VALUES ($1,$2,'pending') RETURNING id, status`,
    [userId, amount]
  );
  return rows[0] as { id: number; status: string };
}

export async function listForUser(userId: number, limit: number, offset: number, status?: string) {
  const values: any[] = [userId];
  let where = `user_id = $1`;
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    values.push(status);
    where += ` AND status = $${values.length}`;
  }
  const q = `
    SELECT id, amount, status, reviewer_note, created_at, updated_at, reviewed_at,
           COUNT(*) OVER() AS total
    FROM withdrawal_requests
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  values.push(limit, offset);
  const { rows } = await pool.query(q, values);
  const total = Number(rows[0]?.total || 0);
  return { rows: rows.map(({ total, ...r }: any) => r), total };
}
