import type { Context } from '@deepseek-ai/cordis';
import type { ClientModuleLoaderTarget, DshWindow } from '@deepseek-ai/dsh-client-modules/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';

import type { ReactModule } from './Brand.tsx';

import { createBrand } from './Brand.tsx';

declare global {
  interface Window extends DshWindow {
    __ModuleLoader__: ClientModuleLoaderTarget;
  }
}

window.__ModuleLoader__.load({
  id: '@lemoe-internal/dsh-client-ui-brand',
  factory(require) {
    const { BrandMark, BrandName } = createBrand(require('react') as ReactModule);

    return {
      inject: ['slots'],
      apply(ctx: Context) {
        ctx.slots.inject('sidebar.brand.mark', () =>
          ctx.slots.inject('sidebar.brand.name', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, BrandMark);
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, BrandName);
          }));
      },
    };
  },
});
