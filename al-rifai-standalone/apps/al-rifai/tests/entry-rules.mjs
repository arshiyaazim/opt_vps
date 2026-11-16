// Private-entry allowlist regressions: workspace routes must be reachable only
// through explicit entries, with segment-boundary matching (no prefix leaks).
import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKSPACE_PATHS, isPathAllowed} from '../release/entry-rules.mjs';

const hosts = ['cash', 'main'];

test('every approved workspace route is allowed on both production hosts', () => {
  for (const host of hosts) {
    for (const path of WORKSPACE_PATHS) {
      assert.equal(isPathAllowed(path, host), true, `${host} ${path}`);
      assert.equal(isPathAllowed(`${path}?x=1`, host), true, `${host} ${path}?x=1`);
    }
  }
});

test('segment-boundary matching never exposes prefix lookalikes', () => {
  for (const host of hosts) {
    assert.equal(isPathAllowed('/vesselx', host), false);
    assert.equal(isPathAllowed('/cashier', host), false);
    assert.equal(isPathAllowed('/dashboard-evil', host), false);
    assert.equal(isPathAllowed('/employee', host), false);
    assert.equal(isPathAllowed('/assistant/../../etc/passwd', host), false);
  }
  assert.equal(isPathAllowed('/api/cashx', 'cash'), false);
  assert.equal(isPathAllowed('/api/cash/../register', 'cash'), false);
});

test('existing routes and asset/API prefixes keep working', () => {
  assert.equal(isPathAllowed('/cash', 'cash'), true);
  assert.equal(isPathAllowed('/cash/archive', 'cash'), true);
  assert.equal(isPathAllowed('/cash/submissions', 'cash'), true);
  assert.equal(isPathAllowed('/vessel', 'cash'), true);
  assert.equal(isPathAllowed('/api/register?export=1', 'cash'), true);
  assert.equal(isPathAllowed('/api/operations?view=cash', 'cash'), true);
  assert.equal(isPathAllowed('/api/assistant', 'cash'), true);
  assert.equal(isPathAllowed('/api/vessel-programs', 'cash'), true);
  assert.equal(isPathAllowed('/_next/static/chunk.js', 'cash'), true);
  assert.equal(isPathAllowed('/review', 'main'), true);
  assert.equal(isPathAllowed('/register', 'main'), true);
  assert.equal(isPathAllowed('/api/anything', 'main'), true);
});

test('cash host does not inherit the main host API subtree', () => {
  assert.equal(isPathAllowed('/api/unknown', 'cash'), false);
  assert.equal(isPathAllowed('/candidate-api/anything', 'cash'), false);
  // /review is a workspace admin page since RBAC-2B (it was the identity-review panel
  // when this assertion was written). It now sits beside /admin, which the cash host
  // has always served, and the workspace sidebar is rendered on both hosts — so a 404
  // here was a dead navigation entry, not a protected boundary. Access still requires
  // a session (proxy) and the ADMIN role (PlatformPage).
  assert.equal(isPathAllowed('/review', 'cash'), true);
  assert.equal(isPathAllowed('/cash', 'main'), false);
});

test('malformed urls fail closed', () => {
  for (const host of hosts) {
    assert.equal(isPathAllowed(undefined, host), false);
    assert.equal(isPathAllowed(null, host), false);
    assert.equal(isPathAllowed('', host), false);
    assert.equal(isPathAllowed('dashboard', host), false);
    assert.equal(isPathAllowed('https://x/dashboard', host), false);
    assert.equal(isPathAllowed('/' + 'a'.repeat(9000), host), false);
  }
});
