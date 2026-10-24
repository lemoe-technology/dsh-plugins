import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';

import { credentialRef } from '@deepseek-ai/dsh-credentials';
import Schema from '@deepseek-ai/schemastery';

import type { QuotaBalanceResult, QuotaPlanResult, QuotaResponse } from './types.ts';

import { deepseekBalance, minimaxCnPlan, moonshotaiCnBalance, zaiCodingCnPlan } from './providers/index.ts';
import { USAGE_ROUTE } from './routes.ts';

export interface ProviderConfig {
  readonly credential: string;
}

export interface Config {
  readonly deepseek: ProviderConfig;
  readonly 'minimax-cn': ProviderConfig;
  readonly 'moonshotai-cn': ProviderConfig;
  readonly 'zai-coding-cn': ProviderConfig;
}

const provider = (credential: string) => Schema.object({
  credential: Schema.string()
    .default(credential),
});

export const Config: Schema<Config> = Schema.object({
  deepseek: provider('DEEPSEEK_API_KEY'),
  'minimax-cn': provider('MINIMAX_CN_API_KEY'),
  'moonshotai-cn': provider('MOONSHOTAI_CN_API_KEY'),
  'zai-coding-cn': provider('ZAI_CODING_CN_API_KEY'),
});

export const inject = ['webServer', 'connection', 'credentials'] as const;

interface ProviderEntry<T> {
  readonly id: keyof Config;
  readonly run: (key: string) => Promise<T>;
}

export function apply(ctx: Context, config: Config): void {
  const balanceEntries: readonly ProviderEntry<QuotaBalanceResult>[] = [
    { id: 'moonshotai-cn', run: moonshotaiCnBalance },
    { id: 'deepseek', run: deepseekBalance },
  ];
  const planEntries: readonly ProviderEntry<QuotaPlanResult>[] = [
    { id: 'minimax-cn', run: minimaxCnPlan },
    { id: 'zai-coding-cn', run: zaiCodingCnPlan },
  ];

  const resolveKey = async (id: keyof Config): Promise<string | undefined> => {
    const credential = await ctx.credentials.resolve(credentialRef(config[id].credential));

    return credential?.value;
  };

  const balanceResult = async (entry: ProviderEntry<QuotaBalanceResult>): Promise<QuotaBalanceResult> => {
    const key = await resolveKey(entry.id);
    if (key === undefined) {
      return { id: entry.id, error: 'credential missing' };
    }

    return entry.run(key);
  };

  const planResult = async (entry: ProviderEntry<QuotaPlanResult>): Promise<QuotaPlanResult> => {
    const key = await resolveKey(entry.id);
    if (key === undefined) {
      return { id: entry.id, error: 'credential missing' };
    }

    return entry.run(key);
  };

  const fetchResponse = async (): Promise<QuotaResponse> => {
    const refreshedAt = new Date()
      .toISOString();
    const [balances, plans] = await Promise.all([
      Promise.all(balanceEntries.map(balanceResult)),
      Promise.all(planEntries.map(planResult)),
    ]);

    return {
      refreshedAt,
      balances,
      plans,
    };
  };

  const route: WebRoute = {
    kind: 'exact',
    path: USAGE_ROUTE,
    handler: async (req, res) => {
      const admission = ctx.connection.admit(req);
      if ('rejection' in admission) {
        res.writeHead(admission.rejection);
        res.end();

        return;
      }

      const response = await fetchResponse();
      res.writeHead(200, {
        'content-type': 'application/json',
      });
      res.end(JSON.stringify(response));
    },
  };

  ctx.effect(() => ctx.webServer.register(route), 'quota: usage route');
}
