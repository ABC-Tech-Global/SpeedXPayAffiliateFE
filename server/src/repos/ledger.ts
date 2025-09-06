import { pool } from "../db";

export async function sumLedgerByType(userId: number, type: 'bonus' | 'withdrawal') {
  const r = await pool.query(`SELECT COALESCE(SUM(amount),0) AS s FROM commissions_ledger WHERE user_id=$1 AND type=$2`, [userId, type]);
  return Number(r.rows[0]?.s || 0);
}

export async function insertWithdrawal(userId: number, amount: number) {
  await pool.query(
    `INSERT INTO commissions_ledger (user_id, type, amount, description) VALUES ($1,'withdrawal',$2,'Withdrawal request')`,
    [userId, amount]
  );
}

export async function insertEntry(userId: number, type: 'bonus' | 'withdrawal', amount: number, description?: string, createdAt?: Date) {
  await pool.query(
    `INSERT INTO commissions_ledger (user_id, type, amount, description, created_at)
     VALUES ($1,$2,$3,$4, COALESCE($5, NOW()))`,
    [userId, type, amount, description || type, createdAt || null]
  );
}
