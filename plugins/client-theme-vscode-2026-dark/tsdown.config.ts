import type { UserConfig } from 'tsdown';

import { defineConfig } from 'tsdown';

const config: UserConfig[] = [
  defineConfig({
    dts: false,
    entry: { index: 'src/index.ts' },
    fixedExtension: false,
    outDir: 'lib',
    sourcemap: true,
  }),
  defineConfig({
    clean: false,
    dts: false,
    entry: { client: 'src/client/index.ts' },
    fixedExtension: false,
    format: 'iife',
    outDir: 'lib',
    outputOptions: { entryFileNames: 'client.js' },
    sourcemap: true,
  }),
];

export default config;
