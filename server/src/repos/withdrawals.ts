import { pool } from "../db";

export async function insertPending(userId: number, amount: number, bankAccountId?: number) {
  const { rows } = await pool.query(
    `INSERT INTO withdrawal_requests (user_id, amount, status, bank_account_id) VALUES ($1,$2,'pending',$3) RETURNING id, status`,
    [userId, amount, bankAccountId || null]
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

export async function listAll(limit: number, offset: number, status?: string) {
  const values: any[] = [];
  let where = `1=1`;
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    values.push(status);
    where += ` AND w.status = $${values.length}`;
  }
  const q = `
    SELECT w.id, w.user_id, u.username, w.amount, w.status, w.reviewer_note, w.created_at, w.updated_at, w.reviewed_at,
           COUNT(*) OVER() AS total
    FROM withdrawal_requests w
    JOIN users u ON u.id = w.user_id
    WHERE ${where}
    ORDER BY w.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  values.push(limit, offset);
  const { rows } = await pool.query(q, values);
  const total = Number(rows[0]?.total || 0);
  return { rows: rows.map(({ total, ...r }: any) => r), total };
}

export async function updateStatus(id: number, status: 'pending' | 'approved' | 'rejected', reviewerNote?: string) {
  await pool.query(`UPDATE withdrawal_requests SET status=$1, reviewer_note=$2, reviewed_at=NOW(), updated_at=NOW() WHERE id=$3`, [status, reviewerNote || null, id]);
}

export async function getById(id: number) {
  const { rows } = await pool.query(`SELECT id, user_id, amount, status FROM withdrawal_requests WHERE id=$1`, [id]);
  return rows[0] || null;
}
