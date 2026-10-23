import { defineConfig } from '@lemoe-technology/eslint-config';

export default defineConfig(
  {
    node: { ignores: ['plugins/*/src/client/**'] },
    test: true,
  },
  { ignores: ['tsdown.client.ts'] },
);
