import type { IconGaugeOutlineRegular as IconGaugeComponent } from '@deepseek-ai/dsh-client-ui-primitives';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type * as ReactNamespace from 'react';
import type { ReactElement } from 'react';

export type ReactModule = typeof ReactNamespace;

export interface SidebarIconFactory {
  SidebarIcon: (props: PropsRuntime<'sidebar.panellist'>) => ReactElement;
}

export function createSidebarIcon(
  React: ReactModule,
  IconGaugeOutlineRegular: typeof IconGaugeComponent,
): SidebarIconFactory {
  function SidebarIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactElement {
    return <IconGaugeOutlineRegular size={size} />;
  }

  return { SidebarIcon };
}
