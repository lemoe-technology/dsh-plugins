import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type * as ReactNamespace from 'react';
import type { ReactElement } from 'react';

import dayjs from 'dayjs';

import type { QuotaUsage } from '../types.ts';
import type { QuotaKey } from './locales.ts';

import shell from './CardShell.module.css';
import css from './UsageCard.module.css';

export type ReactModule = typeof ReactNamespace;

export interface UsageCardProps {
  readonly title: string;
  readonly usages: readonly QuotaUsage[];
  readonly t: TranslateNS<'quota'>;
}

export interface UsageCardFactory {
  UsageCard: (props: UsageCardProps) => ReactElement;
}

const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact' });

const isoMinute = (at: string): string => dayjs(at)
  .format('YYYY-MM-DD HH:mm');

const USAGE_LABEL_KEYS: Readonly<Record<string, QuotaKey>> = {
  '5-hour': 'usage.5-hour',
  weekly: 'usage.weekly',
  monthly: 'usage.monthly',
};

export function createUsageCard(React: ReactModule): UsageCardFactory {
  function UsageCard({ title, usages, t }: UsageCardProps): ReactElement {
    const renderUsage = (usage: QuotaUsage): ReactElement => {
      const labelKey = USAGE_LABEL_KEYS[usage.id];
      return (
        <div className={css.usage}>
          <div className={css.usageHead}>
            <span className={shell.value}>{labelKey === undefined ? usage.id : t(labelKey)}</span>
            <span className={shell.value}>{t('usage.percent', { n: usage.percent })}</span>
          </div>
          <div className={css.bar}>
            <div className={css.barFill} style={{ width: `${String(usage.percent)}%` }} />
          </div>
          {(usage.resetsAt !== undefined || (usage.used !== undefined && usage.total !== undefined)) && (
            <div className={css.usageMeta}>
              {usage.resetsAt !== undefined && (
                <span>{t('usage.resets', { date: isoMinute(usage.resetsAt) })}</span>
              )}
              {usage.used !== undefined && usage.total !== undefined && (
                <span>
                  {t('usage.numbers', {
                    used: compactNumber.format(usage.used),
                    total: compactNumber.format(usage.total),
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      );
    };

    return (
      <li className={shell.card}>
        <div className={shell.cardHead}>
          <span className={shell.cardTitle}>{title}</span>
        </div>
        <div className={css.usages}>
          {usages.map(renderUsage)}
        </div>
      </li>
    );
  }

  return { UsageCard };
}
