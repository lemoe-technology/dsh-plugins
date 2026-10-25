import type {} from '@deepseek-ai/dsh-client-ui-chat/client';
import type { CodeHighlighter, HoverCard as HoverCardComponent, Tag as TagComponent } from '@deepseek-ai/dsh-client-ui-primitives';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type * as ReactNamespace from 'react';

import { CODE_HIGHLIGHT_EXTENSIONS, languageForPath } from '@deepseek-ai/dsh-util-code-language';

import type { RiskRecord, SegmentVerdict } from '../records.ts';
import type { Segment } from '../tokenizer.ts';
import type { CommandRecord } from './definition.ts';
import type { NS } from './locales.ts';

import { isRecord, riskRecordOf } from '../records.ts';
import { RISK_ROUTE } from '../routes.ts';
import { tokenize } from '../tokenizer.ts';
import css from './TurnCard.module.css';

const EMBEDDED_LANGUAGES: readonly string[] = [
  ...new Set(CODE_HIGHLIGHT_EXTENSIONS
    .map((extension) => languageForPath(`f.${extension}`))
    .filter((language): language is string => language !== undefined)),
];

export type ReactModule = typeof ReactNamespace;

export interface TurnCardDeps {
  useCodeHighlighter: (language: string | undefined) => CodeHighlighter;
  HoverCard: typeof HoverCardComponent;
  Tag: typeof TagComponent;
}

export function createTurnCard(React: ReactModule, deps: TurnCardDeps): {
  CommandsTurnCard: (props: PropsRuntime<'conversation.chat.turnTail'> & PropsLocale<typeof NS>) => ReactNamespace.ReactElement | null;
} {
  const { Fragment, useEffect, useMemo, useRef, useState } = React;
  const { useCodeHighlighter, HoverCard, Tag } = deps;

  const riskCache = new Map<string, RiskRecord>();
  const riskPending = new Set<string>();

  function CommandsTurnCard(props: PropsRuntime<'conversation.chat.turnTail'> & PropsLocale<typeof NS>): ReactNamespace.ReactElement | null {
    const commands = props.turn.data.get('commands')?.commands ?? [];
    if (commands.length === 0) {
      return null;
    }

    return <CommandCard {...props} commands={commands} />;
  }

  interface CommandCardProps extends PropsLocale<typeof NS>, PropsRuntime<'conversation.chat.turnTail'> {
    commands: readonly CommandRecord[];
  }

  interface ParsedCommand {
    readonly record: CommandRecord;
    readonly segments: readonly Segment[];
    readonly risk: readonly (SegmentVerdict | null)[] | undefined;
  }

  const riskOf = (record: CommandRecord, segments: readonly Segment[]): readonly (SegmentVerdict | null)[] | undefined => {
    const fetched = riskCache.get(record.callId);
    if (fetched === undefined || segments.length === 0 || fetched.verdicts.length !== segments.length) {
      return undefined;
    }

    return fetched.verdicts;
  };

  const hasSeverity = (item: ParsedCommand, severity: 'side-effect' | 'high'): boolean =>
    item.risk?.some((verdict) => verdict !== null && verdict.severity === severity) === true;

  function Chevron({ up }: { up: boolean }) {
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth={1} className={css.chevron} aria-hidden>
        <path
          d={up
            ? 'M12 10L8.70711 6.70711C8.31658 6.31658 7.68342 6.31658 7.29289 6.70711L4 10'
            : 'M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6'}
          stroke="currentColor"
        />
      </svg>
    );
  }

  function Highlighted({ text, highlight }: { text: string; highlight: CodeHighlighter }) {
    const lines = highlight(text);
    if (lines === undefined) {
      return <>{text}</>;
    }

    return (
      <>
        {lines.map((spans, lineIndex) => (
          <Fragment key={String(lineIndex)}>
            {lineIndex > 0 ? '\n' : null}
            {spans.map((span, spanIndex) => (
              <span key={String(spanIndex)} style={span.style}>{span.text}</span>
            ))}
          </Fragment>
        ))}
        {text.endsWith('\n') ? '\n' : null}
      </>
    );
  }

  function SegmentText({ segment, highlight, embedded }: {
    segment: Segment;
    highlight: CodeHighlighter;
    embedded: Readonly<Record<string, CodeHighlighter>>;
  }) {
    const lead = segment.prefix !== null ? `${segment.prefix} ` : '';
    const code = segment.code;
    if (code === undefined) {
      return <Highlighted text={`${lead}${segment.text}`} highlight={highlight} />;
    }

    return (
      <>
        <Highlighted text={`${lead}${code.head}`} highlight={highlight} />
        <Highlighted text={code.body} highlight={embedded[code.language] ?? highlight} />
        <Highlighted text={code.tail} highlight={highlight} />
      </>
    );
  }

  function CommandCard({ commands, t }: CommandCardProps): ReactNamespace.ReactElement {
    const [expanded, setExpanded] = useState(false);
    const [riskVersion, setRiskVersion] = useState(0);
    const cardRef = useRef<HTMLDivElement>(null);
    const highlight = useCodeHighlighter('bash');
    const embeddedHighlights = Object.fromEntries(
      EMBEDDED_LANGUAGES.map((language) => [language, useCodeHighlighter(language)]),
    );

    useEffect(() => {
      const missing = commands
        .map((record) => record.callId)
        .filter((callId) => !riskCache.has(callId) && !riskPending.has(callId));
      if (missing.length === 0) {
        return undefined;
      }

      for (const callId of missing) {
        riskPending.add(callId);
      }
      const controller = new AbortController();
      fetch(`${RISK_ROUTE}?callIds=${encodeURIComponent(missing.join(','))}`, {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }

          const payload: unknown = await response.json();
          if (!isRecord(payload)) {
            return;
          }

          for (const [callId, value] of Object.entries(payload)) {
            const record = riskRecordOf(value);
            if (record !== null) {
              riskCache.set(callId, record);
            }
          }
          setRiskVersion((version) => version + 1);
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            console.debug('client-ui-commands: risk fetch failed', error);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            for (const callId of missing) {
              riskPending.delete(callId);
            }
          }
        });

      return () => {
        controller.abort();
        for (const callId of missing) {
          riskPending.delete(callId);
        }
      };
    }, [commands, riskVersion]);

    const parsed = useMemo(
      () => commands.map((record): ParsedCommand => {
        const segments = tokenize(record.command);
        const risk = riskOf(record, segments);

        return { record, segments, risk };
      }),
      [commands, riskVersion],
    );

    const failed = commands.filter((record) => record.failed === true).length;
    const sideEffects = parsed.filter((item) => hasSeverity(item, 'side-effect')).length;
    const high = parsed.filter((item) => hasSeverity(item, 'high')).length;

    return (
      <section ref={cardRef} className={css.root}>
        <button type="button" className={css.header} aria-expanded={expanded} onClick={() => { setExpanded((value) => !value); }}>
          <span className={css.title}>{t(commands.length === 1 ? 'card.title.one' : 'card.title.other', { count: commands.length })}</span>
          {failed > 0 ? <Tag tone="danger">{t('meta.failed', { count: failed })}</Tag> : null}
          {sideEffects > 0 ? <Tag tone="warning">{t(sideEffects === 1 ? 'meta.riskSide.one' : 'meta.riskSide.other', { count: sideEffects })}</Tag> : null}
          {high > 0 ? <Tag tone="danger">{t('meta.riskHigh', { count: high })}</Tag> : null}
          <Chevron up={expanded} />
        </button>

        {expanded
          ? (
              <ul className={css.list}>
                {parsed.map(({ record, segments, risk }) => {
                  if (segments.length === 0) {
                    return null;
                  }

                  const mark = record.failed === true ? '✘' : '$';
                  const lines = (
                    <div className={css.lines}>
                      {segments.map((segment, index) => {
                        const verdict = risk?.[index];
                        const severity = verdict?.severity;
                        const reason = (severity === 'side-effect' || severity === 'high')
                          && segment.prefix !== '|' && segment.prefix !== '|&'
                          ? verdict?.reason
                          : undefined;

                        return (
                          <div key={String(index)} className={css.line} data-level={String(segment.level)} data-severity={severity}>
                            <span className={css.prompt} aria-hidden>{index === 0 ? mark : ''}</span>
                            <span className={css.command}>
                              <SegmentText segment={segment} highlight={highlight} embedded={embeddedHighlights} />
                              {reason !== undefined && reason.length > 0 ? <span className={css.reason}>{reason}</span> : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );

                  return (
                    <li key={record.callId} className={css.row} data-failed={record.failed === true || undefined}>
                      {record.errorText !== undefined
                        ? (
                            <HoverCard
                              variant="preview"
                              widthAnchorRef={cardRef}
                              anchor={lines}
                              content={<pre className={css.errorText}><Highlighted text={record.errorText} highlight={highlight} /></pre>}
                            />
                          )
                        : lines}
                    </li>
                  );
                })}
              </ul>
            )
          : null}
      </section>
    );
  }

  return { CommandsTurnCard };
}
