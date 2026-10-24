export interface QuotaAmount {
  readonly amount: number;
  readonly currency: 'CNY' | 'USD';
}

export interface QuotaUsage {
  readonly id: '5-hour' | 'weekly' | 'monthly';
  readonly percent: number;
  readonly used: number | undefined;
  readonly total: number | undefined;
  readonly resetsAt: string | undefined;
}

export interface QuotaBalanceResult {
  readonly id: string;
  readonly balance?: QuotaAmount;
  readonly error?: string;
}

export interface QuotaPlanResult {
  readonly id: string;
  readonly usages?: readonly QuotaUsage[];
  readonly error?: string;
}

export interface QuotaResponse {
  readonly refreshedAt: string;
  readonly balances: readonly QuotaBalanceResult[];
  readonly plans: readonly QuotaPlanResult[];
}
