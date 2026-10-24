import type { QuotaResponse } from '../types.ts';

import { USAGE_ROUTE } from '../routes.ts';

export async function fetchQuotaResponse(): Promise<QuotaResponse> {
  const response = await fetch(USAGE_ROUTE, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`quota route failed: HTTP ${String(response.status)}`);
  }

  return await response.json() as QuotaResponse;
}
