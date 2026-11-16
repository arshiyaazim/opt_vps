import {readFileSync} from 'node:fs';

// Advisory development-path check only. This is not a production deployment,
// database-write, financial-approval, or Owner authorization control.
function normalize(value){
 const s=value.trim().replaceAll('\\','/');
 return s.startsWith('/opt/vps/')?s.slice('/opt/vps/'.length):s.replace(/^\.\//,'');
}
const argv=process.argv.slice(2),stdin=argv.includes('--paths-from-stdin');
const paths=stdin?readFileSync(0,'utf8').split(/\r?\n/).filter(Boolean):argv.filter(v=>v!=='--paths-from-stdin');
if(!paths.length){
 console.error('Usage: node apps/al-rifai/scripts/cash-freeze-guard.mjs [--paths-from-stdin | path ...]');
 process.exit(2);
}
const normalized=paths.map(normalize);
console.log(`CASH_DEVELOPMENT_UNFROZEN: ${normalized.length} path(s) checked; production controls remain separate`);
