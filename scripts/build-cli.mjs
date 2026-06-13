// Bundle the psyuml CLI into a single runnable Node script.
// esbuild is present in the toolchain (Vite uses it); we bundle the workspace TS
// packages it imports so the result runs on plain `node` with no loader.
import { build } from 'esbuild';

await build({
  entryPoints: ['packages/cli/bin.ts'],
  outfile: 'dist/cli/psyuml.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
});

console.log('built dist/cli/psyuml.mjs — run: node dist/cli/psyuml.mjs lint examples/*.psyuml');
