// The packaged worker must not introduce another serial module download.
// Run with: node --experimental-vm-modules .github/scripts/check-effects-build.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule } from 'node:vm';

const worker = new URL(process.argv[2] || '../../assets/runtime/graphics-worker.js', import.meta.url);
const module = new SourceTextModule(await readFile(worker, 'utf8'));
assert.deepEqual(module.dependencySpecifiers, [], 'The graphics worker must load without fetching a second JavaScript module');
console.log('Pass: graphics worker is self-contained.');
