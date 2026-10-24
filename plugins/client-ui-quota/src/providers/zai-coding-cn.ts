import type { BaseResponseBody } from '../request.ts';
import type { QuotaPlanResult, QuotaUsage } from '../types.ts';

import { request } from '../request.ts';

const BASE_URL = 'https://open.bigmodel.cn';

interface LimitRow {
  readonly unit: number;
  readonly number: number;
  readonly usage: number;
  readonly currentValue: number;
  readonly nextResetTime?: number;
}

export interface ZaiCodingCnPlanBody extends BaseResponseBody {
  readonly code?: number;
  readonly msg?: string;
  readonly success?: boolean;
  readonly data?: {
    readonly limits?: readonly LimitRow[];
  };
}

const usageIdOf = (row: LimitRow): QuotaUsage['id'] | undefined => {
  if (row.unit === 3 && row.number === 5) {
    return '5-hour';
  }
  if (row.unit === 6 && row.number === 1) {
    return 'weekly';
  }

  return undefined;
};

export async function zaiCodingCnPlan(key: string): Promise<QuotaPlanResult> {
  const body = await request<ZaiCodingCnPlanBody>(`${BASE_URL}/api/monitor/usage/quota/limit`, key);
  if (body === undefined || body.success === false) {
    return {
      id: 'zai-coding-cn',
      error: body?.msg ?? 'request failed',
    };
  }

  const usages: QuotaUsage[] = [];
  for (const row of body.data?.limits ?? []) {
    const id = usageIdOf(row);
    if (id === undefined) {
      continue;
    }

    usages.push({
      id,
      percent: Math.round((row.currentValue / row.usage) * 100),
      used: row.currentValue,
      total: row.usage,
      resetsAt: row.nextResetTime === undefined
        ? undefined
        : new Date(row.nextResetTime)
            .toISOString(),
    });
  }

  if (usages.length === 0) {
    return {
      id: 'zai-coding-cn',
      error: 'no data',
    };
  }

  return {
    id: 'zai-coding-cn',
    usages,
  };
}
