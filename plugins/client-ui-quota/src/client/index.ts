import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type { ClientModuleLoaderTarget, DshWindow } from '@deepseek-ai/dsh-client-modules/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {
  Button as ButtonComponent,
  IconGaugeOutlineRegular as IconGaugeComponent,
  IconRefreshOutlineRegular as IconRefreshComponent,
  relativeTime as relativeTimeFunction,
} from '@deepseek-ai/dsh-client-ui-primitives';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';

import type { QuotaKey } from './locales.ts';
import type { ReactModule as PageReactModule } from './QuotaPanelPage.tsx';
import type { ReactModule as IconReactModule } from './SidebarIcon.tsx';

import { en, NS, zh } from './locales.ts';
import { createQuotaPanelPage } from './QuotaPanelPage.tsx';
import { createSidebarIcon } from './SidebarIcon.tsx';

declare global {
  interface Window extends DshWindow {
    __ModuleLoader__: ClientModuleLoaderTarget;
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    quota: QuotaKey;
  }
}

const PANEL_ID = 'quota';
const PANEL_ORDER = -10;

window.__ModuleLoader__.load({
  id: '@lemoe-internal/dsh-client-ui-quota',
  factory(require) {
    const {
      Button, IconGaugeOutlineRegular, IconRefreshOutlineRegular, relativeTime,
    } = require('@deepseek-ai/dsh-client-ui-primitives') as {
      Button: typeof ButtonComponent;
      IconGaugeOutlineRegular: typeof IconGaugeComponent;
      IconRefreshOutlineRegular: typeof IconRefreshComponent;
      relativeTime: typeof relativeTimeFunction;
    };
    const React = require('react') as PageReactModule & IconReactModule;

    const { SidebarIcon } = createSidebarIcon(React, IconGaugeOutlineRegular);
    const { QuotaPanelPage } = createQuotaPanelPage(React, {
      Button, IconRefreshOutlineRegular, relativeTime,
    });

    return {
      inject: ['slots', 'locale'],
      apply(ctx: Context) {
        const t = ctx.locale.bind(NS);

        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'quota: dictionaries');

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: PANEL_ORDER,
            label: () => t('panel.label'),
          }, SidebarIcon));

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, QuotaPanelPage));
      },
    };
  },
});
