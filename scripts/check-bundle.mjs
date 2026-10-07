#!/usr/bin/env node
// Guards the white-label packaging of upag-js:
// 1. The script-tag build is a plain file that exposes UpagJs.
// 2. dist must not contain axios, zod, or marlim-sdk-3ds.
// 3. dist must not require any package that is not a declared runtime dependency.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join } from 'node:path';

const FORBIDDEN = ['axios', 'zod', 'marlim-sdk-3ds'];
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const runtimeDeps = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);
const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

const errors = [];

for (const name of FORBIDDEN) {
  if (runtimeDeps.has(name)) {
    errors.push(`"${name}" must not be a runtime dependency.`);
  }
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (/\.(c|m)?js$/.test(entry)) files.push(path);
  }
  return files;
}

const files = walk('dist');
if (files.length === 0) errors.push('dist is empty. Run the build first.');

const SCRIPT_BUILD = join('dist', 'v1', 'upag.min.js');
if (!files.includes(SCRIPT_BUILD)) {
  errors.push('dist/v1/upag.min.js is missing (the script-tag build).');
} else {
  const code = readFileSync(SCRIPT_BUILD, 'utf8');
  if (/(^|[;}\n])\s*(import\s*[{*\w"']|export\s*[{*\w])/.test(code)) {
    errors.push('dist/v1/upag.min.js has a top-level import/export; it must be a plain script.');
  }
  if (/\brequire\(\s*["']/.test(code)) {
    errors.push('dist/v1/upag.min.js calls require(), which does not exist in a browser.');
  }
  if (!code.includes('UpagJs')) {
    errors.push('dist/v1/upag.min.js does not expose UpagJs.');
  }
}

const specifier = /(?:require\(\s*|from\s+|import\(\s*|import\s+)["']([^"'./][^"']*)["']/g;

for (const file of files) {
  const code = readFileSync(file, 'utf8');
  for (const forbidden of FORBIDDEN) {
    if (code.includes(forbidden)) {
      errors.push(`${file} still contains "${forbidden}".`);
    }
  }
  for (const [, spec] of code.matchAll(specifier)) {
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (builtins.has(spec) || builtins.has(name)) continue;
    if (!runtimeDeps.has(name)) {
      errors.push(`${file} imports "${spec}", which is not a runtime dependency (bundle it or declare it).`);
    }
  }
}

if (errors.length) {
  console.error('❌ Bundle check failed:\n' + [...new Set(errors)].map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('✅ Bundle check passed');
