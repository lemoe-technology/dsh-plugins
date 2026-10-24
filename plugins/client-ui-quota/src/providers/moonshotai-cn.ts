import type { BaseResponseBody } from '../request.ts';
import type { QuotaBalanceResult } from '../types.ts';

import { request } from '../request.ts';

const BASE_URL = 'https://api.moonshot.cn';

export interface MoonshotBalanceBody extends BaseResponseBody {
  readonly data?: {
    readonly available_balance: number;
  };
}

export async function moonshotaiCnBalance(key: string): Promise<QuotaBalanceResult> {
  const body = await request<MoonshotBalanceBody>(`${BASE_URL}/v1/users/me/balance`, key);
  if (body === undefined || body.error != null) {
    return {
      id: 'moonshotai-cn',
      error: body?.error?.message ?? 'request failed',
    };
  }

  if (body.data === undefined) {
    return {
      id: 'moonshotai-cn',
      error: 'no data',
    };
  }

  return {
    id: 'moonshotai-cn',
    balance: {
      amount: body.data.available_balance,
      currency: 'CNY',
    },
  };
}
