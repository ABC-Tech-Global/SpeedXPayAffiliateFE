import { pool } from "../db";

export async function getReferralOverview(referrerId: number, referredId: number) {
  const sums = await pool.query(
    `SELECT COALESCE(SUM(amount_processed),0) AS processed FROM referrals WHERE referrer_id=$1 AND referred_id=$2`,
    [referrerId, referredId]
  );
  const ordersAgg = await pool.query(
    `SELECT COUNT(*) AS c, MAX(created_at) AS last_at FROM referral_orders WHERE referred_id=$1`,
    [referredId]
  );
  return {
    amountProcessed: Number(sums.rows[0]?.processed || 0),
    ordersCount: Number(ordersAgg.rows[0]?.c || 0),
    lastOrderAt: ordersAgg.rows[0]?.last_at || null,
  };
}

export async function listReferralsForUser(params: {
  userId: number;
  q?: string;
  onboarding?: string;
  account?: string;
  limit: number;
  offset: number;
}) {
  const { userId, q = "", onboarding = "", account = "", limit, offset } = params;
  const values: any[] = [userId];
  let where = `r.referrer_id = $1`;
  if (q) {
    values.push(`%${q}%`);
    where += ` AND u.username ILIKE $${values.length}`;
  }
  if (account) {
    values.push(account);
    where += ` AND u.account_status = $${values.length}`;
  }
  let onboardingJoin = `COALESCE(r.onboarding_status,
    CASE WHEN EXISTS (SELECT 1 FROM kyc_submissions ks WHERE ks.user_id = r.referred_id AND ks.status = 'approved') THEN 'Completed KYC' ELSE 'Registered' END
  )`;
  if (onboarding) {
    values.push(onboarding);
    where += ` AND ${onboardingJoin} = $${values.length}`;
  }

  const baseQuery = `
    SELECT u.username,
           r.amount_processed,
           ${onboardingJoin} AS onboarding_status,
           u.account_status,
           COUNT(*) OVER() AS total
    FROM referrals r
    JOIN users u ON u.id = r.referred_id
    WHERE ${where}
    ORDER BY r.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  values.push(limit, offset);
  const { rows } = await pool.query(baseQuery, values);
  const total = Number(rows[0]?.total || 0);
  return { referrals: rows.map(({ total, ...rest }: any) => rest), total } as any;
}

export async function sumReferralsProcessed(referrerId: number) {
  const ref = await pool.query(`SELECT COALESCE(SUM(amount_processed),0) AS s FROM referrals WHERE referrer_id=$1`, [referrerId]);
  return Number(ref.rows[0]?.s || 0);
}

export async function linkExists(referrerId: number, referredId: number) {
  const link = await pool.query(`SELECT 1 FROM referrals WHERE referrer_id=$1 AND referred_id=$2`, [referrerId, referredId]);
  return Boolean(link.rows[0]);
}

export async function insertReferral(referrerId: number, referredId: number, amountProcessed: number, onboardingStatus: string, createdAt?: Date) {
  const { rows } = await pool.query(
    `INSERT INTO referrals (referrer_id, referred_id, amount_processed, onboarding_status, created_at)
     VALUES ($1,$2,$3,$4, COALESCE($5, NOW())) RETURNING id`,
    [referrerId, referredId, amountProcessed, onboardingStatus, createdAt || null]
  );
  return rows[0]?.id as number;
}

// Detail + orders helpers used by routes
export async function getReferralDetail(referrerId: number, referredUsername: string, limit: number, offset: number) {
  const detailRes = await pool.query(
    `SELECT u.username,
            r.amount_processed,
            COALESCE(r.onboarding_status,
              CASE WHEN EXISTS (SELECT 1 FROM kyc_submissions ks WHERE ks.user_id = r.referred_id AND ks.status = 'approved') THEN 'Completed KYC' ELSE 'Registered' END
            ) AS onboarding_status,
            u.account_status,
            r.referred_id
     FROM referrals r
     JOIN users u ON u.id = r.referred_id
     WHERE r.referrer_id = $1 AND LOWER(u.username) = LOWER($2)
     LIMIT 1`,
    [referrerId, referredUsername]
  );
  const detailRow = detailRes.rows[0];
  if (!detailRow) return { detail: null, orders: [], totalOrders: 0 } as const;
  const referredId = Number(detailRow.referred_id);
  // Orders for referred user
  const countRes = await pool.query(`SELECT COUNT(*) AS c FROM referral_orders WHERE referred_id=$1`, [referredId]);
  const totalOrders = Number(countRes.rows[0]?.c || 0);
  const ordersRes = await pool.query(
    `SELECT id, order_id, amount, created_at FROM referral_orders WHERE referred_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [referredId, limit, offset]
  );
  const { referred_id, ...detail } = detailRow;
  return { detail, orders: ordersRes.rows, totalOrders } as const;
}

export async function getReferralOrders(referrerId: number, referredUsername: string, limit: number, offset: number) {
  const u = await pool.query(
    `SELECT r.referred_id AS id
     FROM referrals r JOIN users u ON u.id = r.referred_id
     WHERE r.referrer_id=$1 AND LOWER(u.username)=LOWER($2)
     LIMIT 1`,
    [referrerId, referredUsername]
  );
  const row = u.rows[0];
  if (!row) return { orders: [], total: 0 } as const;
  const referredId = Number(row.id);
  const countRes = await pool.query(`SELECT COUNT(*) AS c FROM referral_orders WHERE referred_id=$1`, [referredId]);
  const total = Number(countRes.rows[0]?.c || 0);
  const ordersRes = await pool.query(
    `SELECT id, order_id, amount, created_at FROM referral_orders WHERE referred_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [referredId, limit, offset]
  );
  return { orders: ordersRes.rows, total } as const;
}
