import type { Context } from '@deepseek-ai/cordis';
import type { RequestUserInput, TextBlock } from '@deepseek-ai/dsh-llm';
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session';

import { BlockAssembler, ReasoningEffortId } from '@deepseek-ai/dsh-llm';

import type { RiskRecord, SegmentVerdict, Severity } from './records.ts';
import type { Segment } from './tokenizer.ts';

import { commandOf, severityOf } from './records.ts';
import { tokenize } from './tokenizer.ts';

export interface AnalyzerConfig {
  readonly provider: string;
  readonly model: string;
  readonly reasoningEffort?: string;
  readonly timeoutMs: number;
  readonly maxTokens: number;
}

export interface RiskSink {
  write: (record: RiskRecord) => Promise<void>;
}

export interface AnalysisUnit {
  readonly text: string;
  readonly indices: readonly number[];
}

export function analysisUnits(segments: readonly Segment[]): AnalysisUnit[] {
  const units: AnalysisUnit[] = [];
  segments.forEach((segment, index) => {
    const pipe = segment.prefix === '|' || segment.prefix === '|&';
    const last = units.at(-1);
    if (pipe && last !== undefined) {
      units[units.length - 1] = {
        text: `${last.text} ${segment.prefix} ${segment.text}`,
        indices: [...last.indices, index],
      };

      return;
    }
    units.push({ text: segment.text, indices: [index] });
  });

  return units;
}

const SYSTEM_PROMPT = 'Classify shell command fragments by execution risk.\n'
  + '\n'
  + 'Levels:\n'
  + '- normal: reads or displays state only (ls, cat, grep, git status, echo, pwd).\n'
  + '- side-effect: writes files or repo state, installs or removes packages, builds, starts or stops processes (npm install, git commit, mkdir, pnpm build, systemctl restart).\n'
  + '- high: destructive, irreversible, or escalates privileges (rm -rf, sudo, dd, mkfs, kill -9, chmod 777, git push --force, curl | sh, writing outside the workspace).\n'
  + '\n'
  + 'For each numbered fragment return one JSON object: {"index": <number>, "severity": "<severity>", "reason": "<text>"}.\n'
  + 'The reason is simplified Chinese, at most 20 characters.\n'
  + 'Return only the JSON array, no prose, no code fence.';

interface SessionState {
  readonly cache: Map<string, SegmentVerdict>;
}

interface RiskCall {
  readonly callId: string;
  readonly turn: number;
  readonly command: string;
}

function userTextOf(units: readonly AnalysisUnit[]): string {
  return units.map((unit, index) => `${String(index + 1)}. ${unit.text}`)
    .join('\n');
}

function parseVerdicts(units: readonly AnalysisUnit[], text: string): Map<string, SegmentVerdict> {
  const parsed = JSON.parse(text) as { index: number; severity: Severity; reason?: unknown }[];
  const verdicts = new Map<string, SegmentVerdict>();
  for (const item of parsed) {
    const unit = units[item.index - 1];
    const reason = typeof item.reason === 'string' ? item.reason.trim() : '';
    if (unit === undefined || severityOf(item.severity) === null) {
      continue;
    }

    verdicts.set(unit.text, {
      severity: item.severity,
      ...(reason.length > 0 ? { reason: reason.slice(0, 200) } : {}),
    });
  }

  return verdicts;
}

export function createRiskAnalyzer(ctx: Context, config: AnalyzerConfig, sink: RiskSink): {
  observe: (session: Session, event: SessionEvent) => void;
  dispose: () => void;
} {
  const states = new WeakMap<Session, SessionState>();
  const lifetime = new AbortController();

  const stateFor = (session: Session): SessionState => {
    let state = states.get(session);
    if (state === undefined) {
      state = { cache: new Map() };
      states.set(session, state);
    }

    return state;
  };

  const classify = async (units: readonly AnalysisUnit[]): Promise<Map<string, SegmentVerdict>> => {
    const signal = AbortSignal.any([lifetime.signal, AbortSignal.timeout(config.timeoutMs)]);
    const call = await ctx.llm.prepareCall({
      provider: config.provider,
      model: config.model,
      maxTokens: config.maxTokens,
      ...config.reasoningEffort !== undefined ? { reasoningEffort: ReasoningEffortId(config.reasoningEffort) } : {},
    }, signal);
    const messages: RequestUserInput[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: userTextOf(units) }],
      },
    ];
    const assembler = new BlockAssembler();
    for await (const chunk of call.stream({ ...call.config, system: SYSTEM_PROMPT, messages, signal })) {
      assembler.push(chunk);
    }
    if (assembler.finish.kind !== 'stop') {
      throw new Error(`classification finished with ${JSON.stringify(assembler.finish)}`);
    }
    const text = assembler.blocks()
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return parseVerdicts(units, text);
  };

  const analyze = async (state: SessionState, call: RiskCall): Promise<void> => {
    const segments = tokenize(call.command);
    if (segments.length === 0) {
      return;
    }

    const units = analysisUnits(segments);
    const verdicts: (SegmentVerdict | null)[] = segments.map(() => null);
    const missing: AnalysisUnit[] = [];
    const apply = (unit: AnalysisUnit, verdict: SegmentVerdict): void => {
      for (const index of unit.indices) {
        verdicts[index] = verdict;
      }
    };
    for (const unit of units) {
      const cached = state.cache.get(unit.text);
      if (cached !== undefined) {
        apply(unit, cached);
      }
      else {
        missing.push(unit);
      }
    }

    if (missing.length > 0) {
      let classified: Map<string, SegmentVerdict>;
      try {
        classified = await classify(missing);
      }
      catch (error) {
        if (lifetime.signal.aborted) {
          return;
        }

        ctx.logger.warn(`client-ui-commands: risk classification failed for call ${call.callId}`);
        ctx.logger.warn(error);

        return;
      }
      for (const [text, verdict] of classified) {
        state.cache.set(text, verdict);
      }
      for (const unit of missing) {
        const verdict = classified.get(unit.text);
        if (verdict !== undefined) {
          apply(unit, verdict);
        }
      }
    }

    if (!verdicts.some((verdict): verdict is SegmentVerdict => verdict !== null)) {
      return;
    }

    const record: RiskRecord = {
      callId: call.callId,
      turn: call.turn,
      provider: config.provider,
      model: config.model,
      verdicts,
    };
    try {
      await sink.write(record);
    }
    catch (error) {
      ctx.logger.warn(`client-ui-commands: risk record storage failed for call ${call.callId}`);
      ctx.logger.warn(error);
    }
  };

  return {
    observe(session: Session, event: SessionEvent): void {
      if (event.type === 'tool/call' && (event.data.name === 'bash' || event.data.name === 'pwsh')) {
        const command = commandOf(event.data.arguments);
        if (command === null) {
          return;
        }

        const call: RiskCall = { callId: String(event.data.callId), turn: event.data.turn, command };
        void analyze(stateFor(session), call);
      }
    },
    dispose(): void {
      lifetime.abort(new Error('risk analyzer disposed'));
    },
  };
}
