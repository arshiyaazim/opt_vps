import test from 'node:test';import assert from 'node:assert/strict';
import {caseStatusTally} from '../lib/reconciliation-core.mjs';
test('replay reports persisted linked/owner decisions, without reclassifying them pending',()=>{assert.deepEqual(caseStatusTally('LINKED'),{linked:1,pending:0,decided:0});assert.deepEqual(caseStatusTally('APPROVED'),{linked:0,pending:0,decided:1});assert.deepEqual(caseStatusTally('CLARIFICATION'),{linked:0,pending:1,decided:0});});
