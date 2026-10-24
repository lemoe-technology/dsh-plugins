import type {
  Button as ButtonComponent,
  IconRefreshOutlineRegular as IconRefreshComponent,
  relativeTime as relativeTimeFunction,
} from '@deepseek-ai/dsh-client-ui-primitives';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type * as ReactNamespace from 'react';
import type { ReactElement } from 'react';

import type { QuotaBalanceResult, QuotaPlanResult, QuotaResponse } from '../types.ts';
import type { QuotaKey } from './locales.ts';

import { fetchQuotaResponse } from './api.ts';
import { createBalanceCard } from './BalanceCard.tsx';
import shell from './CardShell.module.css';
import css from './QuotaPanelPage.module.css';
import { createUsageCard } from './UsageCard.tsx';

export type ReactModule = typeof ReactNamespace;

export interface QuotaPageDeps {
  readonly Button: typeof ButtonComponent;
  readonly IconRefreshOutlineRegular: typeof IconRefreshComponent;
  readonly relativeTime: typeof relativeTimeFunction;
}

export interface QuotaPanelPageFactory {
  QuotaPanelPage: (props: PropsRuntime<'main'> & PropsLocale<'quota'>) => ReactElement;
}

const PROVIDER_TITLE_KEYS: Readonly<Record<string, QuotaKey>> = {
  deepseek: 'provider.deepseek',
  'minimax-cn': 'provider.minimax-cn',
  'moonshotai-cn': 'provider.moonshotai-cn',
  'zai-coding-cn': 'provider.zai-coding-cn',
};

export function createQuotaPanelPage(
  React: ReactModule,
  deps: QuotaPageDeps,
): QuotaPanelPageFactory {
  const { Button, IconRefreshOutlineRegular, relativeTime }
    = deps;
  const { useState, useEffect, useCallback } = React;
  const { BalanceCard } = createBalanceCard(React);
  const { UsageCard } = createUsageCard(React);

  function QuotaPanelPage({ t }: PropsRuntime<'main'> & PropsLocale<'quota'>): ReactElement {
    const [response, setResponse] = useState<QuotaResponse | undefined>(undefined);
    const [failed, setFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
      setRefreshing(true);
      setFailed(false);
      try {
        setResponse(await fetchQuotaResponse());
      }
      catch {
        setFailed(true);
      }
      finally {
        setRefreshing(false);
      }
    }, []);

    useEffect(() => {
      void load();
    }, [load]);

    const relativeText = (at: string): string => {
      const bucket = relativeTime(Date.parse(at), Date.now());

      return t(`time.${bucket.unit}`, { n: bucket.n });
    };

    const titleOf = (id: string): string => {
      const key = PROVIDER_TITLE_KEYS[id];

      return key === undefined ? id : t(key);
    };

    const renderFailedCard = (id: string, error: string | undefined): ReactElement => (
      <li key={id} className={shell.card}>
        <div className={shell.cardHead}>
          <span className={shell.cardTitle}>{titleOf(id)}</span>
        </div>
        <p className={css.notice} role="alert">{error}</p>
      </li>
    );

    const renderBalance = (entry: QuotaBalanceResult): ReactElement => {
      if (entry.balance !== undefined) {
        return <BalanceCard key={entry.id} title={titleOf(entry.id)} balance={entry.balance} />;
      }

      return renderFailedCard(entry.id, entry.error);
    };

    const renderPlan = (entry: QuotaPlanResult): ReactElement => {
      if (entry.usages !== undefined && entry.usages.length > 0) {
        return <UsageCard key={entry.id} title={titleOf(entry.id)} usages={entry.usages} t={t} />;
      }

      return renderFailedCard(entry.id, entry.error);
    };

    return (
      <div className={css.page}>
        <div className={css.pageScroll}>
          <div className={css.pageContent}>
            <div className={css.pageHeading}>
              <span className={css.headingTitle}>{t('page.title')}</span>
              <div className={css.headingActions}>
                {response !== undefined
                  && <span className={css.updated}>{t('page.updated', { time: relativeText(response.refreshedAt) })}</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={refreshing}
                  icon={<IconRefreshOutlineRegular size={16} />}
                  onClick={() => { void load(); }}
                >
                  {refreshing ? t('page.refreshing') : t('page.refresh')}
                </Button>
              </div>
            </div>

            {failed && <p className={css.notice} role="alert">{t('page.loadFailed')}</p>}
            {response !== undefined && response.balances.length > 0 && (
              <ul className={css.cardsBalance}>
                {response.balances.map(renderBalance)}
              </ul>
            )}
            {response !== undefined && response.plans.length > 0 && (
              <ul className={css.cards}>
                {response.plans.map(renderPlan)}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  return { QuotaPanelPage };
}
