import test from 'node:test';
import assert from 'node:assert/strict';
import {registerBrowserParams} from '../lib/vessel-url-state.ts';

const filters={
 q:'',motherVessel:'',lighterVessel:'',escortName:'',destination:'',
 status:'',shift:'',from:'',to:'',quality:'',
};

test('ordinary register entry does not serialize untouched defaults',()=>{
 const params=registerBrowserParams({
  source:'historical',page:1,sort:'newest',filters,explicit:new Set(),
 });
 assert.equal(params.toString(),'');
});

test('explicitly selected default state and non-default filters remain shareable',()=>{
 const params=registerBrowserParams({
  source:'historical',page:1,sort:'newest',
  filters:{...filters,motherVessel:'MV Alpha',from:'2026-10-01'},
  explicit:new Set(['source','page','sort']),
 });
 assert.equal(params.toString(),'source=historical&page=1&sort=newest&motherVessel=MV+Alpha&from=2026-10-01');
});

test('non-default source, page and sorting remain shareable',()=>{
 const params=registerBrowserParams({
  source:'live',page:3,sort:'oldest',filters,explicit:new Set(),
 });
 assert.equal(params.toString(),'source=live&page=3&sort=oldest');
});
