import type { Domain, DomainSpec, DomainTableSpec } from '@deepseek-ai/dsh-storage-domain';

import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';

import type { RiskRecord, Severity } from './records.ts';

import { riskRecordOf, SEVERITIES } from './records.ts';

interface StoredVerdict {
  readonly severity: Severity;
  readonly reason?: string | undefined;
}

interface StoredRiskRecord {
  readonly callId: string;
  readonly turn: number;
  readonly provider: string;
  readonly model: string;
  readonly verdicts: readonly (StoredVerdict | null)[];
}

const segmentVerdictSchema: z.ZodType<StoredVerdict> = z.object({
  severity: z.enum(SEVERITIES),
  reason: z.string()
    .optional(),
});

const storedRecordSchema: z.ZodType<StoredRiskRecord> = z.object({
  callId: z.string()
    .min(1),
  turn: z.number()
    .int(),
  provider: z.string()
    .min(1),
  model: z.string()
    .min(1),
  verdicts: z.array(z.union([segmentVerdictSchema, z.null()])),
});

type VerdictTableSpec = DomainTableSpec<string, StoredRiskRecord>;

type RiskDomainSpec = DomainSpec & { readonly tables: { readonly verdicts: VerdictTableSpec } };

export const riskDomainSpec: RiskDomainSpec = defineDomain({
  name: 'client_ui_commands_risk',
  version: 1,
  layout: 'per-record',
  invalidRecords: 'backup-and-skip',
  tables: {
    verdicts: domainTable<string, StoredRiskRecord>(storedRecordSchema),
  },
});

export interface RiskStore {
  read: (callIds: readonly string[]) => Record<string, RiskRecord>;
  write: (record: RiskRecord) => Promise<void>;
  close: () => Promise<void>;
}

type RiskDomain = Domain<typeof riskDomainSpec>;

interface StorageDomainFacility {
  open: (spec: typeof riskDomainSpec) => Promise<RiskDomain>;
}

export async function openRiskStore(storage: StorageDomainFacility): Promise<RiskStore> {
  const domain = await storage.open(riskDomainSpec);
  const table = domain.table('verdicts');

  return {
    read(callIds: readonly string[]): Record<string, RiskRecord> {
      const found: Record<string, RiskRecord> = {};
      for (const callId of callIds) {
        const record = riskRecordOf(table.get(callId));
        if (record !== null) {
          found[callId] = record;
        }
      }

      return found;
    },
    async write(record: RiskRecord): Promise<void> {
      await table.put(record.callId, storedRecordSchema.parse(record));
    },
    async close(): Promise<void> {
      await domain.close();
    },
  };
}
