import { pool } from "../db";

export type BankAccount = { id: number; user_id: number; bank_name: string; account_number: string; is_default: boolean; created_at: string };

export async function listForUser(userId: number): Promise<BankAccount[]> {
  const { rows } = await pool.query(
    `SELECT id, user_id, bank_name, account_number, is_default, created_at
     FROM bank_accounts WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return rows as BankAccount[];
}

export async function insert(userId: number, bankName: string, accountNumber: string, makeDefault = false): Promise<BankAccount> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO bank_accounts (user_id, bank_name, account_number, is_default)
       VALUES ($1,$2,$3,$4) RETURNING id, user_id, bank_name, account_number, is_default, created_at`,
      [userId, bankName, accountNumber, makeDefault]
    );
    const created = rows[0] as BankAccount;
    if (makeDefault) {
      await client.query(`UPDATE bank_accounts SET is_default=false WHERE user_id=$1 AND id<>$2`, [userId, created.id]);
    }
    await client.query('COMMIT');
    return created;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function setDefault(userId: number, id: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query(`SELECT id FROM bank_accounts WHERE id=$1 AND user_id=$2`, [id, userId]);
    if (!owned.rowCount) throw new Error('not found');
    await client.query(`UPDATE bank_accounts SET is_default=false WHERE user_id=$1`, [userId]);
    await client.query(`UPDATE bank_accounts SET is_default=true WHERE id=$1 AND user_id=$2`, [id, userId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function remove(userId: number, id: number) {
  await pool.query(`DELETE FROM bank_accounts WHERE id=$1 AND user_id=$2`, [id, userId]);
}

export async function existsForUser(userId: number, id: number): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM bank_accounts WHERE id=$1 AND user_id=$2`, [id, userId]);
  return rows.length > 0;
}

