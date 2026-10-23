import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type { ClientModuleLoaderTarget, DshWindow } from '@deepseek-ai/dsh-client-modules/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { CodeHighlighter, HoverCard as HoverCardComponent } from '@deepseek-ai/dsh-client-ui-primitives';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';

import type { CommandsKey } from './locales.ts';
import type { ReactModule } from './TurnCard.tsx';

import { commandsDefinition } from './definition.ts';
import { en, NS, zh } from './locales.ts';
import { createTurnCard } from './TurnCard.tsx';

declare global {
  interface Window extends DshWindow {
    __ModuleLoader__: ClientModuleLoaderTarget;
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    commands: CommandsKey;
  }
}

window.__ModuleLoader__.load({
  id: '@lemoe-internal/dsh-client-ui-commands',
  factory(require) {
    const { HoverCard, useCodeHighlighter } = require('@deepseek-ai/dsh-client-ui-primitives') as {
      HoverCard: typeof HoverCardComponent;
      useCodeHighlighter: (language: string | undefined) => CodeHighlighter;
    };
    const { CommandsTurnCard } = createTurnCard(require('react') as ReactModule, { HoverCard, useCodeHighlighter });

    return {
      inject: ['slots', 'locale', 'uiConversation'],
      apply(ctx: Context) {
        ctx.uiConversation.events.register(commandsDefinition);

        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'commands: dictionaries');

        ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
          name: 'conversation.chat.turnTail',
          id: '@lemoe-internal/dsh-client-ui-commands',
          locale: NS,
        }, CommandsTurnCard));
      },
    };
  },
});
