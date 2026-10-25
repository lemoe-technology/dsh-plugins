import type { AndOr, Command, DoubleQuotedPart, HereDoc, PipelineNode, Redirect, SingleQuotedPart, SyntaxNode } from 'unbash';

import { languageForPath } from '@deepseek-ai/dsh-util-code-language';
import { forEachChild, parse } from 'unbash';

export type SegmentPrefix = '&&' | '||' | '|' | '|&';

export interface EmbeddedCode {
  readonly head: string;
  readonly body: string;
  readonly tail: string;
  readonly language: string;
}

export interface Segment {
  readonly text: string;
  readonly prefix: SegmentPrefix | null;
  readonly level: number;
  readonly code?: EmbeddedCode;
}

const languageOfCommand = (command: string): string | null => {
  if (command.startsWith('python')) {
    return 'python';
  }

  if (command === 'node') {
    return 'typescript';
  }

  return null;
};

interface Span {
  start: number;
  end: number;
  prefix: SegmentPrefix | null;
  level: number;
  code?: EmbeddedCode;
}

interface Walk {
  readonly line: string;
  readonly spans: Span[];
}

// unbash's SyntaxNode union omits HereDoc.
interface NodeWithClosing {
  readonly closing?: { readonly end: number };
}

function heredocExtent(node: SyntaxNode): number {
  let end = node.end;
  forEachChild(node, (child) => {
    const closing = (child as NodeWithClosing).closing?.end;
    const childEnd = closing === undefined ? child.end : Math.max(child.end, closing);
    if (childEnd > end) {
      end = childEnd;
    }
    if (!('script' in child)) {
      const nested = heredocExtent(child);
      if (nested > end) {
        end = nested;
      }
    }
  });

  return end;
}

function codeArgumentOf(leaf: Command): SingleQuotedPart | DoubleQuotedPart | undefined {
  const args = leaf.args;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg?.type !== 'Word') {
      continue;
    }

    if (arg.text === '-e' || arg.text === '-c') {
      const next = args[index + 1];
      const part = next?.type === 'Word' ? next.parts?.[0] : undefined;
      if (part?.type === 'SingleQuoted' || part?.type === 'DoubleQuoted') {
        return part;
      }
    }
  }

  return undefined;
}

function languageOfTarget(leaf: Command): string | null {
  const target = leaf.suffix.find((item): item is Redirect => item.type === 'Redirect')?.target;

  return languageForPath(target?.text ?? '') ?? null;
}

function embeddedOf(leaf: SyntaxNode, start: number, end: number, walk: Walk): EmbeddedCode | undefined {
  if (leaf.type !== 'Command') {
    return undefined;
  }

  const hereDoc = leaf.suffix.find((item): item is HereDoc => item.type === 'HereDoc');
  if (hereDoc !== undefined) {
    const language = languageOfCommand(leaf.name?.text ?? '') ?? languageOfTarget(leaf);
    if (language === null) {
      return undefined;
    }

    const { body, closing } = hereDoc;
    if (closing === undefined || body.end - 1 <= body.pos) {
      return undefined;
    }

    return {
      head: walk.line.slice(start, body.pos),
      body: walk.line.slice(body.pos, body.end - 1),
      tail: walk.line.slice(body.end - 1, closing.end),
      language,
    };
  }

  const language = languageOfCommand(leaf.name?.text ?? '');
  if (language === null) {
    return undefined;
  }

  const codePart = codeArgumentOf(leaf);
  if (codePart === undefined) {
    return undefined;
  }

  let body = walk.line.slice(codePart.pos + 1, codePart.end - 1);
  if (body.includes('\n')) {
    if (!body.startsWith('\n')) {
      body = `\n${body}`;
    }
    if (!body.endsWith('\n')) {
      body += '\n';
    }
  }

  return {
    head: walk.line.slice(start, codePart.pos + 1),
    body,
    tail: walk.line.slice(codePart.end - 1, end),
    language,
  };
}

function collect(node: PipelineNode | AndOr, start: number, prefix: SegmentPrefix | null, level: number, walk: Walk): void {
  if (node.type === 'AndOr') {
    node.commands.forEach((child, index) => {
      const operator = index === 0 ? null : node.operators[index - 1] ?? null;
      collect(child, index === 0 ? start : child.pos, operator ?? prefix, operator === null ? level : 1, walk);
    });

    return;
  }

  if (node.type === 'Pipeline') {
    node.commands.forEach((child, index) => {
      const operator = index === 0 ? null : node.operators[index - 1] ?? null;
      collect(child, index === 0 ? start : child.pos, operator ?? prefix, index === 0 ? level : level + 1, walk);
    });

    return;
  }

  const end = heredocExtent(node);
  if (end <= start) {
    return;
  }

  const code = embeddedOf(node, start, end, walk);
  const span: Span = { start, end, prefix, level };
  walk.spans.push(code === undefined ? span : { ...span, code });
}

export function tokenize(line: string): Segment[] {
  let script;
  try {
    script = parse(line);
  }
  catch {
    const whole = line.trim();

    return whole.length === 0 ? [] : [{ text: whole, prefix: null, level: 0 }];
  }

  const parts: Segment[] = [];
  const statements = script.commands;
  for (const [index, statement] of statements.entries()) {
    const walk: Walk = { line, spans: [] };
    collect(statement.command, statement.command.pos, null, 0, walk);
    const tail = statements[index + 1]?.pos ?? line.length;
    for (const [at, span] of walk.spans.entries()) {
      const end = walk.spans[at + 1] === undefined ? tail : span.end;
      const text = line
        .slice(span.start, end)
        .replace(/\s+$/u, '')
        .trim();
      if (text.length > 0) {
        const segment: Segment = { text, prefix: span.prefix, level: span.level };
        parts.push(span.code === undefined ? segment : { ...segment, code: span.code });
      }
    }
  }

  return parts;
}
