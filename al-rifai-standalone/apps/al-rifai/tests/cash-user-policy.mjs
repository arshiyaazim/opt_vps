// Cash Portal user-management authorization regression tests.
// Pure policy module: no database, sessions, or secrets involved.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCanCreateUser,
  assertCanManageUser,
  assertCanResetPassword,
  CashUserPolicyError,
} from '../lib/cash-user-policy.ts';

const SUPER = {id: 'a'.repeat(64), role: 'ADMIN'};
const ADMIN = {id: 'b'.repeat(64), role: 'ADMIN'};
const USER = {id: 'c'.repeat(64), role: 'USER'};
const denied = (code) => (error) => error instanceof CashUserPolicyError && error.code === code;

test('only a Super Admin may create an ADMIN account', () => {
  assert.doesNotThrow(() => assertCanCreateUser(SUPER, 'ADMIN', true));
  assert.throws(() => assertCanCreateUser(ADMIN, 'ADMIN', false), denied('SUPER_ADMIN_REQUIRED'));
  // A non-super ADMIN may still create ordinary USER accounts.
  assert.doesNotThrow(() => assertCanCreateUser(ADMIN, 'USER', false));
  // A USER can never use user management.
  assert.throws(() => assertCanCreateUser(USER, 'USER', false), denied('ADMIN_REQUIRED'));
});

test('only a Super Admin may reset ADMIN credentials', () => {
  const targetAdmin = {id: SUPER.id, role: 'ADMIN', active: true};
  assert.doesNotThrow(() => assertCanResetPassword(SUPER, targetAdmin, true));
  assert.throws(() => assertCanResetPassword(ADMIN, targetAdmin, false), denied('SUPER_ADMIN_REQUIRED'));
  // A non-super ADMIN keeps the existing ability to reset an ordinary user.
  assert.doesNotThrow(() => assertCanResetPassword(ADMIN, {id: USER.id, role: 'USER', active: true}, false));
});

test('only a Super Admin may edit, demote or deactivate an ADMIN', () => {
  const target = {id: ADMIN.id, role: 'ADMIN', active: true};
  const base = {actor: ADMIN, target, nextRole: 'ADMIN', nextActive: false, activeAdmins: 2, superAdmin: false};
  assert.throws(() => assertCanManageUser(base), denied('SUPER_ADMIN_REQUIRED'));
  assert.doesNotThrow(() => assertCanManageUser({...base, actor: SUPER, superAdmin: true}));
});

test('any ADMIN may still manage ordinary USER accounts', () => {
  const target = {id: USER.id, role: 'USER', active: true};
  assert.doesNotThrow(() => assertCanManageUser({
    actor: ADMIN, target, nextRole: 'USER', nextActive: false, activeAdmins: 1, superAdmin: false,
  }));
  // Non-super ADMIN cannot promote a USER to ADMIN.
  assert.throws(() => assertCanManageUser({
    actor: ADMIN, target, nextRole: 'ADMIN', nextActive: true, activeAdmins: 1, superAdmin: false,
  }), denied('SUPER_ADMIN_REQUIRED'));
});

test('the final active ADMIN can never be demoted or deactivated', () => {
  const target = {id: SUPER.id, role: 'ADMIN', active: true};
  assert.throws(() => assertCanManageUser({
    actor: SUPER, target, nextRole: 'ADMIN', nextActive: false, activeAdmins: 1, superAdmin: true,
  }), denied('LAST_ADMIN_PROTECTED'));
  assert.throws(() => assertCanManageUser({
    actor: SUPER, target, nextRole: 'USER', nextActive: true, activeAdmins: 1, superAdmin: true,
  }), denied('LAST_ADMIN_PROTECTED'));
  // With another active admin present the change is allowed.
  assert.doesNotThrow(() => assertCanManageUser({
    actor: SUPER, target, nextRole: 'ADMIN', nextActive: false, activeAdmins: 2, superAdmin: true,
  }));
});

test('a USER actor cannot manage anybody', () => {
  assert.throws(() => assertCanManageUser({
    actor: USER, target: {id: USER.id, role: 'USER', active: true}, nextRole: 'USER', nextActive: false, activeAdmins: 1, superAdmin: false,
  }), denied('ADMIN_REQUIRED'));
});
