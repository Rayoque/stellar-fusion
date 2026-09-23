// Runs a TypeScript dev script against the game's own source.
// Usage: node scripts/run.mjs scripts/<name>.ts [args...]
// Bundles with esbuild (installed as part of Vite) so the scripts import src/
// exactly as the app does, then executes the bundle with Node.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [entry, ...args] = process.argv.slice(2);
if (!entry) {
  console.error('Usage: node scripts/run.mjs scripts/<name>.ts [args...]');
  process.exit(1);
}

const outDir = mkdtempSync(join(tmpdir(), 'stellar-script-'));
const outFile = join(outDir, 'script.mjs');
try {
  await build({
    entryPoints: [resolve(entry)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: outFile,
    logLevel: 'warning',
    define: { 'import.meta.env.BASE_URL': '"./"' },
  });
  process.argv = [process.argv[0], outFile, ...args];
  await import(pathToFileURL(outFile).href);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
