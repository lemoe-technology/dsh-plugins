import type { Context } from '@deepseek-ai/cordis';
import type { ClientModuleLoaderTarget, DshWindow } from '@deepseek-ai/dsh-client-modules/client';
import type {} from '@deepseek-ai/dsh-client-ui-theme/client';

import { definition } from './theme.ts';

declare global {
  interface Window extends DshWindow {
    __ModuleLoader__: ClientModuleLoaderTarget;
  }
}

const TYPOGRAPHY_CSS = `
:root {
  --ds-font-family-code: 'JetBrains Mono';
  --dsw-font-family: 'JetBrains Mono', 'MiSans';
}
::selection {
  background: var(--dsw-alias-bg-document-selection);
}
`;

window.__ModuleLoader__.load({
  id: '@lemoe-internal/dsh-client-theme-vscode-2026-dark',
  factory() {
    return {
      inject: ['theme'],
      apply(ctx: Context) {
        ctx.effect(() => ctx.theme.register(definition), 'vscode-2026-dark: theme registration');
        ctx.theme.setTheme(definition.id);
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.dataset.plugin = '@lemoe-internal/dsh-client-theme-vscode-2026-dark';
          tag.textContent = TYPOGRAPHY_CSS;
          document.head.append(tag);

          return () => {
            tag.remove();
          };
        }, 'vscode-2026-dark: typography');
      },
    };
  },
});
