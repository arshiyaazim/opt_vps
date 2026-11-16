import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as catalog from '../candidates/identity-review/catalog.ts';
const require=createRequire(import.meta.url);
// Resolve relative TSX dependencies recursively so the SSR gate exercises the current panel.
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const modules=new Map();
function load(filename){
 if(modules.has(filename))return modules.get(filename).exports;
 const compiledModule={exports:{}};modules.set(filename,compiledModule);
 const output=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',output)(id=>{
  if(!id.startsWith('.'))return require(id);
  const base=path.resolve(path.dirname(filename),id),target=[base,base+'.ts',base+'.tsx',base+'.mjs'].find(p=>existsSync(p));
  if(!target)throw Error('UI dependency missing: '+id);
  return load(target);
 },compiledModule,compiledModule.exports);return compiledModule.exports;
}
const compiledModule={exports:load(fileURLToPath(new URL('../candidates/identity-review/ui/IdentityReviewPanel.tsx',import.meta.url)))};
const html=renderToStaticMarkup(React.createElement(compiledModule.exports.default));
test('offline UI renders the current named login with password-manager attributes',()=>{assert.match(html,/aria-label="Username"/);assert.match(html,/aria-label="Password" type="password"/);assert.match(html,/autoComplete="username"/);assert.match(html,/autoComplete="current-password"/);assert.match(html,/>লগইন<\/button>/);});
test('initial UI reveals no private data or business navigation before login',()=>{assert.doesNotMatch(html,/<nav|Owner reconciliation|Full original message|Cash workspace|Escort roster workspace|New owner entry/);assert.match(html,/<form>/);assert.match(html,/required="" value=""/);});
test('browser catalog has no server imports or authorization grants',()=>{const s=readFileSync(new URL('../candidates/identity-review/catalog.ts',import.meta.url),'utf8');assert.doesNotMatch(s,/node:crypto|from 'zod'|password|token|VERIFIED_MESSAGE_ROLE/);assert.ok(catalog.GROUP_DISCOVERY.every(g=>g.status==='PENDING_OWNER_VERIFICATION'));});
