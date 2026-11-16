import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const route=readFileSync(new URL('../app/api/escort-register/route.ts',import.meta.url),'utf8');

assert.match(route,/export async function GET\(request:Request\)/);
assert.match(route,/dataset_epoch=\$1/,"the register API must read one provenance epoch only");
assert.match(route,/scope:archive\?'archive':'current'/,"the API must report the scope it read");
assert.match(route,/reviewClass/,"review rows must be classified for presentation");
assert.match(route,/actionableReview/,"actionable review must exclude confirmed evidence");
assert.match(route,/get\('summary'\)==='1'/,"a lightweight summary read must be available");
assert.match(route,/latestSourceTime/,"the summary must expose the latest register activity");
assert.match(route,/export const POST=denied;export const PUT=denied;export const PATCH=denied;export const DELETE=denied;/);
assert.match(route,/escort_order_events/);
assert.match(route,/readOnly:true/);
assert.match(route,/WHERE r\.account_id=\\?'wa-01/);
assert.match(route,/o\.wa_account='wa-01'/);
assert.doesNotMatch(route,/INSERT INTO public\.escort_order_register|UPDATE public\.escort_order_register|DELETE FROM public\.escort_order_register/);

console.log('PASS: escort register API remains read-only and returns source events');
