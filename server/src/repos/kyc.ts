import { pool } from "../db";

export async function getLatest(userId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM kyc_submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function getLatestDraftOrRejected(userId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM kyc_submissions WHERE user_id = $1 AND status IN ('draft','rejected') ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function updateDraftBasic(id: number, fullName: string, dob?: string, gender?: string) {
  await pool.query(
    `UPDATE kyc_submissions SET full_name=$1, dob=$2, gender=$3, updated_at=NOW() WHERE id=$4`,
    [fullName, dob || null, gender || null, id]
  );
}

export async function insertNew(userId: number, fullName: string, dob?: string, gender?: string) {
  const ins = await pool.query(
    `INSERT INTO kyc_submissions (user_id, full_name, dob, gender) VALUES ($1,$2,$3,$4) RETURNING id`,
    [userId, fullName, dob || null, gender || null]
  );
  return ins.rows[0]?.id as number;
}

export async function selectLatestIdStatus(userId: number) {
  const latest = await pool.query(
    `SELECT id, status FROM kyc_submissions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return latest.rows[0] || null;
}

const allowedUploadCols = new Set(["id_front_path", "id_back_path", "selfie_path"]);
export async function setUploadPathById(id: number, column: string, filepath: string) {
  if (!allowedUploadCols.has(column)) throw new Error("invalid column");
  await pool.query(
    `UPDATE kyc_submissions SET ${column}=$1, updated_at=NOW() WHERE id=$2`,
    [filepath, id]
  );
}

export async function submit(userId: number, draftId: number) {
  await pool.query(`UPDATE kyc_submissions SET status='pending', updated_at=NOW() WHERE id=$1`, [draftId]);
}

export async function getById(id: number) {
  const { rows } = await pool.query(`SELECT * FROM kyc_submissions WHERE id=$1`, [id]);
  return rows[0] || null;
}

export async function getLatestWithPath(userId: number, column: string) {
  const allowed = new Set(["id_front_path", "id_back_path", "selfie_path"]);
  if (!allowed.has(column)) throw new Error("invalid column");
  const { rows } = await pool.query(
    `SELECT id, ${column} AS p, status FROM kyc_submissions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function setLatestStatus(userId: number, status: 'approved' | 'rejected', reviewerNote?: string) {
  const { rows } = await pool.query(`SELECT id FROM kyc_submissions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [userId]);
  const id = rows[0]?.id as number | undefined;
  if (!id) return false;
  await pool.query(`UPDATE kyc_submissions SET status=$1, reviewer_note=$2, reviewed_at=NOW(), updated_at=NOW() WHERE id=$3`, [status, reviewerNote || null, id]);
  return true;
}

export async function clearUploadPathById(id: number, column: string) {
  const allowed = new Set(["id_front_path", "id_back_path", "selfie_path"]);
  if (!allowed.has(column)) throw new Error("invalid column");
  await pool.query(`UPDATE kyc_submissions SET ${column} = NULL, updated_at = NOW() WHERE id = $1`, [id]);
}

export async function getLatestPath(userId: number, column: string) {
  const allowed = new Set(["id_front_path", "id_back_path", "selfie_path"]);
  if (!allowed.has(column)) throw new Error("invalid column");
  const { rows } = await pool.query(
    `SELECT ${column} AS p FROM kyc_submissions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0]?.p as string | undefined;
}
