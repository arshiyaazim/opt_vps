import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const panel=readFileSync(new URL('../app/escort-register-panel.tsx',import.meta.url),'utf8');

assert.match(panel,/CONFIRMED · Assignment recorded/);
assert.match(panel,/neither confirmation nor assignment creates an actual duty-start fact/i);
assert.match(panel,/Actual duty start: not recorded/);
assert.match(panel,/sourceEvents\(r\)\.map/);
assert.match(panel,/source\.payload\?\.source\?\.chatJid/);
assert.doesNotMatch(panel,/CONFIRMED · Duty starts/);

console.log('PASS: escort confirmation is not presented as actual duty start');
