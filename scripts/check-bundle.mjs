#!/usr/bin/env node
// Guards the white-label packaging of upag-js:
// 1. The 3D Secure browser module must be bundled into dist (never imported at runtime).
// 2. It must not be declared as a runtime dependency of the published package.
// 3. dist must not require any package that is not a declared runtime dependency.
import { readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join } from 'node:path';

const HIDDEN = 'marlim-sdk-3ds';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const runtimeDeps = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);
const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

const errors = [];

if (runtimeDeps.has(HIDDEN)) {
  errors.push(`"${HIDDEN}" must be a devDependency (it is bundled), not a runtime dependency.`);
}

const files = readdirSync('dist').filter((f) => /\.(c|m)?js$/.test(f));
if (files.length === 0) errors.push('dist is empty. Run the build first.');

// The script-tag build must exist and be a plain script: any top-level import/export
// would make it fail without type="module".
const SCRIPT_BUILD = 'upag.js';
if (!files.includes(SCRIPT_BUILD)) {
  errors.push(`dist/${SCRIPT_BUILD} is missing (the script-tag build).`);
} else {
  const code = readFileSync(join('dist', SCRIPT_BUILD), 'utf8');
  if (/(^|[;}\n])\s*(import\s*[{*\w"']|export\s*[{*\w])/.test(code)) {
    errors.push(`dist/${SCRIPT_BUILD} has a top-level import/export; it must be a plain script.`);
  }
  if (/\brequire\(\s*["']/.test(code)) {
    errors.push(`dist/${SCRIPT_BUILD} calls require(), which does not exist in a browser.`);
  }
  if (!code.includes('UpagJs')) {
    errors.push(`dist/${SCRIPT_BUILD} does not expose UpagJs.`);
  }
}

const specifier = /(?:require\(\s*|from\s+|import\(\s*|import\s+)["']([^"'./][^"']*)["']/g;

for (const file of files) {
  const code = readFileSync(join('dist', file), 'utf8');
  for (const [, spec] of code.matchAll(specifier)) {
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (builtins.has(spec) || builtins.has(name)) continue;
    if (!runtimeDeps.has(name)) {
      errors.push(`dist/${file} imports "${spec}", which is not a runtime dependency (bundle it or declare it).`);
    }
  }
}

if (errors.length) {
  console.error('❌ Bundle check failed:\n' + [...new Set(errors)].map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('✅ Bundle check passed');
