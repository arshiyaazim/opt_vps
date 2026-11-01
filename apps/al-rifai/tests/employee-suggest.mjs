import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSuggestions,normalizeSearchText,SUGGESTION_LIMIT} from '../lib/employee-suggest.ts';

const source=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Comments name the fields that must stay out of the suggestion surface; only
// executable code is checked so the guard cannot be satisfied by deleting the
// explanation instead of the leak.
const code=(text)=>text.replace(/\/\*[\s\S]*?\*\//g,'').split('\n').map(line=>line.replace(/\/\/.*$/,'')).join('\n');
const rows=[
  {name:'Karim Uddin',employeePhone:'+8801710000001'},
  {name:'Karim Uddin (newest)',employeePhone:'+8801710000001'},
  {name:'Abdul Karim',employeePhone:'+8801710000002'},
  {name:'Karima Akter',employeePhone:'+8801810000003'},
  {name:'Rahim',employeePhone:'+8801910000004'},
  {name:'No Phone',employeePhone:null},
  {name:'No Phone Either',employeePhone:''},
];

test('empty or whitespace-only queries return no suggestions',()=>{
  assert.deepEqual(buildSuggestions(rows,''),[]);
  assert.deepEqual(buildSuggestions(rows,'   '),[]);
});

test('a phone dedupes to the newest name because rows arrive newest-first',()=>{
  const [first]=buildSuggestions(rows,'+8801710000001');
  assert.equal(first.phone,'+8801710000001');
  assert.equal(first.name,'Karim Uddin');
});

test('rows without an employee ID are never suggested',()=>{
  const suggestions=buildSuggestions(rows,'No Phone');
  assert.equal(suggestions.length,0);
});

test('suggestions order by bucket: exact phone, phone prefix, name prefix, name contains',()=>{
  // Query "karim": the two names starting with "karim" rank above the one that
  // only contains it, and ties inside a bucket sort by name then phone.
  const ordered=buildSuggestions(rows,'karim').map(s=>s.phone);
  assert.deepEqual(ordered,['+8801710000001','+8801810000003','+8801710000002']);
  const exact=buildSuggestions(rows,'+8801910000004');
  assert.equal(exact[0].name,'Rahim');
});

test('matching is case-insensitive and collapses whitespace',()=>{
  assert.equal(normalizeSearchText('  Karim   UDDIN '),'karim uddin');
  assert.equal(buildSuggestions(rows,'KARIM UDDIN').length,1);
  assert.equal(buildSuggestions(rows,'karim  uddin').length,1);
});

test('display text is exactly "name · phone" and carries no other field',()=>{
  const [suggestion]=buildSuggestions(rows,'Rahim');
  assert.equal(suggestion.display,'Rahim · +8801910000004');
  assert.deepEqual(Object.keys(suggestion).sort(),['display','name','phone']);
});

test('the default cap is ten suggestions and an explicit cap is honoured',()=>{
  assert.equal(SUGGESTION_LIMIT,10);
  const many=Array.from({length:25},(_,index)=>({name:`Synthetic ${String(index).padStart(2,'0')}`,employeePhone:`+8801000${String(index).padStart(5,'0')}`}));
  assert.equal(buildSuggestions(many,'synthetic').length,10);
  assert.equal(buildSuggestions(many,'synthetic',3).length,3);
  assert.equal(buildSuggestions(many,'synthetic',0).length,1);
});

test('deterministic ordering for identical buckets',()=>{
  const ties=[
    {name:'Beta',employeePhone:'+8801000000002'},
    {name:'Beta',employeePhone:'+8801000000001'},
  ];
  assert.deepEqual(buildSuggestions(ties,'beta').map(s=>s.phone),['+8801000000001','+8801000000002']);
});

/* ---------------- static guards: one implementation, identity-only surface ---------------- */

test('buildSuggestions has exactly one definition in the application source',()=>{
  const lib=source('lib/employee-suggest.ts');
  assert.match(lib,/export function buildSuggestions\(/);
  for(const path of ['app/transactions/view.tsx','app/platform/ui.tsx','app/cash/page.tsx','app/platform/employee-typeahead.tsx']){
    assert.doesNotMatch(source(path),/function buildSuggestions\(/,`${path} must not re-implement suggestion ranking`);
  }
});

test('every employee picker uses the single shared typeahead component',()=>{
  for(const path of ['app/transactions/view.tsx','app/platform/ui.tsx','app/cash/page.tsx']){
    assert.match(source(path),/from ["']@\/app\/platform\/employee-typeahead["']/);
    assert.match(source(path),/<EmployeeTypeahead/);
  }
  const component=source('app/platform/employee-typeahead.tsx');
  assert.match(component,/role="combobox"/);
  assert.match(component,/role="listbox"/);
  assert.match(component,/aria-activedescendant/);
  assert.match(component,/SUGGESTION_DEBOUNCE_MS/);
});

test('the suggestion surface never carries payout, amount, sender or source text',()=>{
  const lib=code(source('lib/employee-suggest.ts'));
  const component=code(source('app/platform/employee-typeahead.tsx'));
  for(const forbidden of [/payoutPhone/,/payout_mobile/,/amountCents/,/amount_minor/,/sourceText/,/sender/]){
    assert.doesNotMatch(lib,forbidden);
    assert.doesNotMatch(component,forbidden);
  }
});

test('the Add Transaction drawer fills employee ID from a suggestion and never the payout number',()=>{
  const ui=source('app/platform/ui.tsx');
  const start=ui.indexOf('export function AddTransactionDrawer(');
  assert.ok(start>0);
  const drawer=ui.slice(start,ui.indexOf('export function AddEmployeeDrawer('));
  assert.match(drawer,/onSelect=\{suggestion=>setForm\(\{\.\.\.form,employeeName:suggestion\.name,employeeMobile:suggestion\.phone\}\)\}/);
  assert.doesNotMatch(drawer,/onSelect=\{[^}]*payoutMobile/);
  assert.match(drawer,/Picking a suggestion fills the employee ID only/);
});
