import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';

import Schema from '@deepseek-ai/schemastery';

import type { AnalyzerConfig } from './analyzer.ts';

import { createRiskAnalyzer } from './analyzer.ts';
import { RISK_ROUTE } from './routes.ts';
import { openRiskStore } from './store.ts';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 4000;

export interface Config {
  readonly provider?: string;
  readonly model?: string;
  readonly reasoningEffort?: string;
  readonly timeoutMs?: number;
  readonly maxTokens?: number;
}

export const Config: Schema<Config> = Schema.object({
  provider: Schema.string(),
  model: Schema.string(),
  reasoningEffort: Schema.string(),
  timeoutMs: Schema.number()
    .default(DEFAULT_TIMEOUT_MS),
  maxTokens: Schema.number()
    .default(DEFAULT_MAX_TOKENS),
});

export const inject = ['llm', 'sessions', 'storageDomain', 'webServer', 'connection'] as const;

export async function apply(ctx: Context, config: Config): Promise<void> {
  const provider = config.provider ?? '';
  const model = config.model ?? '';
  if ((provider.length > 0) !== (model.length > 0)) {
    throw new Error('client-ui-commands: provider and model must be supplied together');
  }

  const store = await openRiskStore(ctx.storageDomain);

  const route: WebRoute = {
    kind: 'exact',
    path: RISK_ROUTE,
    handler: (req, res) => {
      const admission = ctx.connection.admit(req);
      if ('rejection' in admission) {
        res.writeHead(admission.rejection);
        res.end();

        return;
      }

      const ids = new URLSearchParams(req.url?.split('?')[1])
        .get('callIds')
        ?.split(',')
        .filter((id) => id.length > 0) ?? [];
      res.writeHead(200, {
        'content-type': 'application/json',
      });
      res.end(JSON.stringify(store.read(ids)));
    },
  };

  ctx.effect(() => ctx.webServer.register(route), 'client-ui-commands: risk route');

  ctx.effect(() => async () => store.close(), 'client-ui-commands: risk store');

  if (provider.length === 0 || model.length === 0) {
    ctx.logger.info('client-ui-commands: risk analysis disabled, provider and model are not configured');

    return;
  }

  const resolved: AnalyzerConfig = {
    provider,
    model,
    ...config.reasoningEffort !== undefined ? { reasoningEffort: config.reasoningEffort } : {},
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
  const analyzer = createRiskAnalyzer(ctx, resolved, { write: async (record) => store.write(record) });

  ctx.effect(() => {
    const stop = ctx.on('session/event', (session, event) => {
      analyzer.observe(session, event);
    }, { global: true });

    return () => {
      stop();
      analyzer.dispose();
    };
  }, 'client-ui-commands: risk analysis');
}
