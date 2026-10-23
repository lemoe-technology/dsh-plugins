
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationTurnDataMap {
    commands: CommandsTurnData;
  }
}

export interface CommandRecord {
  readonly callId: string;
  readonly command: string;
  readonly failed?: true;
  readonly errorText?: string;
}

export interface CommandsTurnData {
  readonly commands: readonly CommandRecord[];
}

interface CommandsState extends CommandsTurnData {
  readonly turn: number;
}

const SIGNAL_MARKER = /\n\[killed by signal: [^\]\n]+\]$/u;
const EXIT_MARKER = /\n\[exit code: (-?\d+|null)\]$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function commandOf(raw: string): string | null {
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

function resultTextOf(message: { readonly content: readonly unknown[] }): string | null {
  const first = message.content[0];
  if (!isRecord(first) || first.type !== 'text' || typeof first.text !== 'string') {
    return null;
  }

  return first.text;
}

function isFailedResult(message: { readonly isError?: boolean; readonly content: readonly unknown[] }): boolean {
  if (message.isError === true) {
    return true;
  }

  const first = message.content[0];
  if (!isRecord(first) || first.type !== 'text' || typeof first.text !== 'string') {
    return false;
  }

  const text = first.text;
  if (SIGNAL_MARKER.test(text)) {
    return true;
  }

  const exit = EXIT_MARKER.exec(text);
  if (exit !== null) {
    return exit[1] === 'null' || Number(exit[1]) !== 0;
  }

  return false;
}

export const commandsDefinition: ConversationNodeDefinition<CommandsState> = {
  kind: 'commands',
  match: (event) => {
    if (event.type === 'turn/start') {
      return { id: String(event.data.turn), role: 'start' };
    }
    if (event.type === 'tool/call'
      && (event.data.name === 'bash' || event.data.name === 'pwsh')
      && commandOf(event.data.arguments) !== null) {
      return { id: String(event.data.turn), role: 'update' };
    }
    if (event.type === 'tool/result' && event.surfaceOp === 'append') {
      return { id: String(event.data.turn), role: 'update' };
    }

    return null;
  },
  start: (_context, match) => {
    if (match.event.type !== 'turn/start') {
      throw new Error('commands start requires turn/start');
    }

    return { turn: match.event.data.turn, commands: [] };
  },
  update: (context, match) => {
    if (match.event.type === 'tool/call') {
      const command = commandOf(match.event.data.arguments);
      if (command === null) {
        return context.state;
      }

      return {
        ...context.state,
        commands: [...context.state.commands, { callId: String(match.event.data.callId), command }],
      };
    }

    if (match.event.type === 'tool/result') {
      const callId = String(match.event.data.message.source.callId);
      const index = context.state.commands.findIndex((record) => record.callId === callId);
      if (index === -1 || !isFailedResult(match.event.data.message)) {
        return context.state;
      }

      const rawError = resultTextOf(match.event.data.message);
      return {
        ...context.state,
        commands: context.state.commands.map((record, at) => at === index
          ? { ...record, failed: true, ...(rawError !== null ? { errorText: rawError } : {}) }
          : record),
      };
    }

    return context.state;
  },
  buildLocationData: (context, scope, previous) => {
    if (scope !== 'turn' || context.state === undefined) {
      return null;
    }

    if (previous?.kind === 'turn'
      && previous.turn === context.state.turn
      && previous.key === 'commands'
      && previous.value.commands === context.state.commands) {
      return previous;
    }

    return {
      kind: 'turn',
      turn: context.state.turn,
      key: 'commands',
      value: { commands: context.state.commands },
    };
  },
};
