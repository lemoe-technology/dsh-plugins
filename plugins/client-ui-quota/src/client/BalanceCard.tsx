import type * as ReactNamespace from 'react';
import type { ReactElement } from 'react';

import type { QuotaAmount } from '../types.ts';

import shell from './CardShell.module.css';

export type ReactModule = typeof ReactNamespace;

export interface BalanceCardProps {
  readonly title: string;
  readonly balance: QuotaAmount;
}

export interface BalanceCardFactory {
  BalanceCard: (props: BalanceCardProps) => ReactElement;
}

export function createBalanceCard(React: ReactModule): BalanceCardFactory {
  function formatBalance(balance: QuotaAmount): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: balance.currency })
      .format(balance.amount);
  }

  function BalanceCard({ title, balance }: BalanceCardProps): ReactElement {
    return (
      <li className={shell.card}>
        <div className={shell.cardHead}>
          <span className={shell.cardTitle}>{title}</span>
          <span className={shell.value}>{formatBalance(balance)}</span>
        </div>
      </li>
    );
  }

  return { BalanceCard };
}
