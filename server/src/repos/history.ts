import { pool } from "../db";

export async function getPayoutsHistory(userId: number, type: string | undefined, limit: number, offset: number) {
  const unionBase = `
    SELECT 'referral_order' AS type, r.amount_processed AS amount, CONCAT('Order by ', u.username) AS description, r.created_at
    FROM referrals r JOIN users u ON u.id = r.referred_id WHERE r.referrer_id=$1
    UNION ALL
    SELECT type, amount, COALESCE(description, type) AS description, created_at
    FROM commissions_ledger WHERE user_id=$1
  `;
  const filterClause = type ? ` WHERE type = $2` : '';
  const params: any[] = [userId];
  if (type) params.push(type);
  const countQuery = `SELECT COUNT(*) AS c FROM (${unionBase}) t${filterClause}`;
  const totalRes = await pool.query(countQuery, params);
  const total = Number(totalRes.rows[0]?.c || 0);
  const hist = await pool.query(`SELECT * FROM (${unionBase}) t${filterClause} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
  return { total, rows: hist.rows };
}

