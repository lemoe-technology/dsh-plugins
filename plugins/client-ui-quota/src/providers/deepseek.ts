import type { BaseResponseBody } from '../request.ts';
import type { QuotaBalanceResult } from '../types.ts';

import { request } from '../request.ts';

const BASE_URL = 'https://api.deepseek.com';

export interface DeepseekBalanceBody extends BaseResponseBody {
  readonly balance_infos?: readonly {
    readonly currency: 'CNY' | 'USD';
    readonly total_balance: string;
  }[];
}

export async function deepseekBalance(key: string): Promise<QuotaBalanceResult> {
  const body = await request<DeepseekBalanceBody>(`${BASE_URL}/user/balance`, key);
  if (body === undefined || body.error != null) {
    return {
      id: 'deepseek',
      error: body?.error?.message ?? 'request failed',
    };
  }

  const info = body.balance_infos?.[0];
  if (info === undefined) {
    return {
      id: 'deepseek',
      error: 'no data',
    };
  }

  return {
    id: 'deepseek',
    balance: {
      amount: Number(info.total_balance),
      currency: info.currency,
    },
  };
}
