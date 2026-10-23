import type { ViteUserConfig } from 'vitest/config';

import { defineConfig } from 'vitest/config';

const config: ViteUserConfig = defineConfig({
  test: {
    testTimeout: 60_000,
  },
});

export default config;
