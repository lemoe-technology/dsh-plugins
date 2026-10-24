import type { BaseResponseBody } from '../request.ts';
import type { QuotaPlanResult } from '../types.ts';

import { request } from '../request.ts';

const BASE_URL = 'https://api.minimaxi.com';

interface ModelRemainsRow {
  readonly model_name: 'general' | 'video';
  readonly current_interval_remaining_percent: number;
  readonly end_time: number;
  readonly current_weekly_remaining_percent: number;
  readonly weekly_end_time: number;
}

export interface MinimaxCnPlanBody extends BaseResponseBody {
  readonly base_resp?: {
    readonly status_code?: number;
    readonly status_msg?: string;
  };
  readonly model_remains?: readonly ModelRemainsRow[];
}

export async function minimaxCnPlan(key: string): Promise<QuotaPlanResult> {
  const body = await request<MinimaxCnPlanBody>(`${BASE_URL}/v1/token_plan/remains`, key);
  if (body === undefined || body.base_resp?.status_code !== 0) {
    return {
      id: 'minimax-cn',
      error: body?.base_resp?.status_msg ?? 'request failed',
    };
  }

  const row = body.model_remains?.find((item) => item.model_name === 'general');
  if (row === undefined) {
    return {
      id: 'minimax-cn',
      error: 'no data',
    };
  }

  return {
    id: 'minimax-cn',
    usages: [
      {
        id: '5-hour',
        percent: 100 - row.current_interval_remaining_percent,
        used: undefined,
        total: undefined,
        resetsAt: new Date(row.end_time)
          .toISOString(),
      },
      {
        id: 'weekly',
        percent: 100 - row.current_weekly_remaining_percent,
        used: undefined,
        total: undefined,
        resetsAt: new Date(row.weekly_end_time)
          .toISOString(),
      },
    ],
  };
}
