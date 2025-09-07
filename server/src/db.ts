import { Pool } from "pg";

function createPool() {
  const isProd = process.env.NODE_ENV === "production";
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    // Allow DATABASE_URL (preferred) with optional sslmode=require
    const ssl = url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined;
    return new Pool({ connectionString: url, ssl, max: 10, idleTimeoutMillis: 10_000 });
  }

  // Support discrete DB_* variables as an alternative to DATABASE_URL
  const host = process.env.DB_HOST?.trim();
  const portStr = process.env.DB_PORT?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD?.trim();
  const database = process.env.DB_NAME?.trim();

  if (isProd) {
    // In production, avoid insecure defaults; require proper configuration
    const hasDiscrete = host && user && password && database;
    if (!hasDiscrete) {
      throw new Error(
        "Database configuration required: set DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME in production"
      );
    }
  }

  return new Pool({
    host: host || "localhost",
    port: portStr ? Number(portStr) : 5432,
    user: user || "app",
    password: password || "app",
    database: database || "app",
    max: 10,
    idleTimeoutMillis: 10_000,
  });
}

export const pool = createPool();

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // In case an older schema exists, ensure columns exist
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;`
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`
  );
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN NOT NULL DEFAULT false;`);
  // payout method/email deprecated; omitted
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_product_updates BOOLEAN DEFAULT true;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_payouts BOOLEAN DEFAULT true;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_secret TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_tmp_secret TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_tour_seen BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT false;`);
  // Ensure bank_accounts exists before migrating away from inline columns
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id);`);
  // Migrate existing inline bank fields to bank_accounts if present
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='bank_name'
      ) THEN
        INSERT INTO bank_accounts (user_id, bank_name, account_number, is_default)
        SELECT id, bank_name, bank_account_number, true FROM users
        WHERE COALESCE(bank_name,'') <> '' OR COALESCE(bank_account_number,'') <> '';
      END IF;
    END $$;
  `);
  // Migrate away from inline bank columns on users
  await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS bank_name;`);
  await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS bank_account_number;`);
  // Clean up deprecated payout fields
  await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS payout_method;`);
  await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS payout_email;`);
  await pool.query(
    `DO $$ BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_username_key'
       ) THEN
         BEGIN
           CREATE UNIQUE INDEX users_username_key ON users (username);
         EXCEPTION WHEN others THEN NULL; -- ignore if fails
         END;
       END IF;
     END $$;`
  );

  // Remove legacy column if present
  await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS name;`);

  // KYC submissions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kyc_submissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT,
      dob DATE,
      gender TEXT,
      id_front_path TEXT,
      id_back_path TEXT,
      selfie_path TEXT,
      status TEXT NOT NULL DEFAULT 'draft', -- draft | pending | approved | rejected
      rejection_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_submissions(user_id);`);
  await pool.query(`ALTER TABLE kyc_submissions DROP COLUMN IF EXISTS email;`);

  // Referrals
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_processed NUMERIC(12,2) NOT NULL DEFAULT 0,
      onboarding_status TEXT NOT NULL DEFAULT 'Registered',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);`);
  await pool.query(`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'Registered';`);

  // Commissions ledger for bonuses and withdrawals
  await pool.query(`
    CREATE TABLE IF NOT EXISTS commissions_ledger (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('bonus','withdrawal')),
      amount NUMERIC(12,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_commissions_user ON commissions_ledger(user_id);`);

  // Referral orders (per-referral successful transactions)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referral_orders (
      id SERIAL PRIMARY KEY,
      referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id TEXT,
      amount NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_referral_orders_referred ON referral_orders(referred_id);`);

  // Withdrawal requests (pending admin approval)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12,0) NOT NULL, -- VND, no decimals
      status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
      reviewer_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id);`);

  // Bank accounts (multiple per user)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id);`);

  // Link withdrawals to a bank account if provided
  await pool.query(`ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bank_account_id INTEGER REFERENCES bank_accounts(id);`);
}
