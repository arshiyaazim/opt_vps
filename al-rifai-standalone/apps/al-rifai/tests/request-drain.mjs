import test from 'node:test';import assert from 'node:assert/strict';
import {discardUnreadBody} from '../lib/request-drain.mjs';
test('unused early-denial body is drained without interpreting JSON',async()=>{const r=new Request('https://fixture.invalid',{method:'POST',body:'not-json'});await discardUnreadBody(r);assert.equal(r.bodyUsed,true);});
test('already-consumed accepted body is not read twice',async()=>{const r=new Request('https://fixture.invalid',{method:'POST',body:'{}'});await r.json();await discardUnreadBody(r);});
test('discard budget cancels oversized source transport',async()=>{let cancelled=false;const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(100));},cancel(){cancelled=true;}});await discardUnreadBody(new Request('https://fixture.invalid',{method:'POST',body,duplex:'half'}),50);assert.equal(cancelled,true);});
test('client disconnect during discard is contained at request boundary',async()=>{const body=new ReadableStream({pull(c){c.error(Error('Synthetic disconnected client'));}});await discardUnreadBody(new Request('https://fixture.invalid',{method:'POST',body,duplex:'half'}));});
