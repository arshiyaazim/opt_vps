// Build-time guard: every relative import in the runtime scripts and lib files must
// actually exist in the image.
//
// Twice a new lib module was added to the source but not to the Dockerfile runtime
// whitelist. TypeScript passed, the build succeeded, and the ingestion worker then
// crash-looped with ERR_MODULE_NOT_FOUND in production. This check runs inside the
// runtime stage, where only the copied files exist, so a missing module fails the
// build instead of the deployment.
//
// Scope: relative specifiers inside /app/scripts and /app/lib. Package imports and
// the '@/' alias are ignored — Next bundles those for the app, and they are not
// resolvable by plain node at runtime.

import {readFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {dirname, resolve, relative, join} from 'node:path';

const ROOT = '/app';
const SCAN_DIRS = ['scripts', 'lib'];
const EXTENSIONS = ['', '.ts', '.mjs', '.js', '.json', '/index.ts', '/index.mjs'];

const seen = new Set();
const missing = [];

function candidates(base) {
  return EXTENSIONS.map((ext) => `${base}${ext}`);
}

const SELF = resolve(process.argv[1] ?? '');

function scan(file) {
  // Skip this file: its own documentation quotes example specifiers.
  if (file === SELF) return;
  if (seen.has(file) || !existsSync(file)) return;
  seen.add(file);

  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    return;
  }

  // Static `from '...'` and dynamic `import('...')`, relative only.
  const specifiers = new Set();
  for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
    specifiers.add(match[1]);
  }

  for (const spec of specifiers) {
    const base = resolve(dirname(file), spec);
    const hit = candidates(base).find((p) => existsSync(p) && statSync(p).isFile());
    if (!hit) {
      missing.push(`${relative(ROOT, file)} -> ${spec}`);
      continue;
    }
    if (hit.endsWith('.ts') || hit.endsWith('.mjs') || hit.endsWith('.js')) scan(hit);
  }
}

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|mjs|js)$/.test(entry.name)) scan(full);
  }
}

for (const dir of SCAN_DIRS) walk(join(ROOT, dir));

if (missing.length) {
  console.error('\nRUNTIME IMPORT CHECK FAILED');
  console.error('These relative imports do not exist in the runtime image.');
  console.error('Add the missing file(s) to the Dockerfile runtime COPY whitelist:\n');
  for (const line of [...new Set(missing)].sort()) console.error(`  ${line}`);
  console.error('');
  process.exit(1);
}

console.log(`runtime import check OK (${seen.size} modules traversed)`);
