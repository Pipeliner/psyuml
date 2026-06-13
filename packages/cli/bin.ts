/**
 * Node entry for the `psyuml` CLI. Wires the injected `CliIO` to the real filesystem
 * and process streams, then exits with the code `run` returns. Bundled to a runnable
 * script by `scripts/build-cli.mjs` (the shebang is added by the bundler banner).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { run } from './index';

const nl = (s: string): string => (s.endsWith('\n') ? s : `${s}\n`);

process.exitCode = run(process.argv.slice(2), {
  readFile: (p) => readFileSync(p, 'utf8'),
  writeFile: (p, d) => writeFileSync(p, d),
  out: (s) => process.stdout.write(nl(s)),
  err: (s) => process.stderr.write(nl(s)),
});
