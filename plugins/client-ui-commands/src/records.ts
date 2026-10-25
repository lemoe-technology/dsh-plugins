export const SEVERITIES = ['normal', 'side-effect', 'high'] as const;

export type Severity = typeof SEVERITIES[number];

export interface SegmentVerdict {
  readonly severity: Severity;
  readonly reason?: string;
}

export interface RiskRecord {
  readonly callId: string;
  readonly turn: number;
  readonly provider: string;
  readonly model: string;
  readonly verdicts: readonly (SegmentVerdict | null)[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function severityOf(value: unknown): Severity | null {
  if (typeof value !== 'string') {
    return null;
  }

  return (SEVERITIES as readonly string[]).includes(value) ? value as Severity : null;
}

function verdictOf(value: unknown): SegmentVerdict | null {
  if (!isRecord(value)) {
    return null;
  }

  const severity = severityOf(value.severity);
  if (severity === null) {
    return null;
  }

  const reason = value.reason;
  if (reason !== undefined && typeof reason !== 'string') {
    return null;
  }

  return { severity, ...(reason !== undefined ? { reason } : {}) };
}

export function commandOf(raw: string): string | null {
  let args: unknown;

  try {
    args = JSON.parse(raw);
  }
  catch {
    return null;
  }

  if (!isRecord(args) || typeof args.command !== 'string' || args.command.length === 0) {
    return null;
  }

  return args.command;
}

export function riskRecordOf(value: unknown): RiskRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const { callId, turn, provider, model, verdicts } = value;
  if (typeof callId !== 'string' || callId.length === 0
    || typeof turn !== 'number' || !Number.isSafeInteger(turn)
    || typeof provider !== 'string' || provider.length === 0
    || typeof model !== 'string' || model.length === 0
    || !Array.isArray(verdicts)) {
    return null;
  }

  const decoded: (SegmentVerdict | null)[] = [];
  for (const item of verdicts) {
    decoded.push(item === null ? null : verdictOf(item));
  }

  return { callId, turn, provider, model, verdicts: decoded };
}
