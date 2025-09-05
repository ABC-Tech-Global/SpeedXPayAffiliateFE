// Shared API response types used by both server and client code.

export type ProfileResponse = {
  profile?: { username?: string; email?: string; phone?: string; twofaEnabled?: boolean; welcomeTourSeen?: boolean };
  payment?: { bankName?: string; bankAccountNumber?: string };
  notifications?: { productUpdates?: boolean; payouts?: boolean };
};

export type KycResponse = {
  kyc?: { status?: string; rejection_reason?: string | null; full_name?: string; dob?: string; gender?: string };
};

export type HistoryItem = { type: string; amount: string | number; description: string; created_at: string };
export type PayoutsResponse = { balance?: number | string; history?: HistoryItem[]; total?: number | string };

export type Withdrawal = { id: number; amount: number | string; status: string; reviewer_note?: string | null; created_at?: string };
export type WithdrawalsResponse = { withdrawals?: Withdrawal[]; total?: number | string; page?: number | string; limit?: number | string };

export type Referral = { username: string; amount_processed?: string | number; onboarding_status?: string; account_status?: string };
export type ReferralsResponse = { referrals?: Referral[]; total?: number | string; page?: number | string; limit?: number | string };

export type ReferralDetailResponse = {
  referral?: {
    onboarding_status?: string;
    account_status?: string;
    amount_processed?: number | string;
    orders_count?: number | string;
  };
};

export type ReferralOrdersResponse = { orders?: { id?: string; amount?: number | string; created_at?: string }[]; total?: number | string; page?: number | string; limit?: number | string };

