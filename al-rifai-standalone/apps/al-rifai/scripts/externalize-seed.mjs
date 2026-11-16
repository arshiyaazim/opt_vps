import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {blankProgram} from '../lib/programs.ts';
const dir=process.env.ALRIFAI_EVIDENCE_DIR || '/var/lib/vps/al-rifai/evidence';
const source=readFileSync(dir+'/seed-source.ts','utf8');
const expression=source.split('export const seed:Program[]=')[1].trim().replace(/;$/, '');
// This evaluates only the checksum-verified audited seed expression during one-time preparation.
const manifest=JSON.parse(readFileSync('docs/evidence-checksums.json','utf8'));
if(createHash('sha256').update(source).digest('hex')!==manifest['seed-source.ts'].sha256)throw new Error('Seed source differs');
const seed=Function('blankProgram','return ('+expression+')')(blankProgram);
const bytes=JSON.stringify(seed);writeFileSync(dir+'/recovered-programs.json',bytes,{flag:'wx'});
manifest['recovered-programs.json']={bytes:Buffer.byteLength(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};
writeFileSync('docs/evidence-checksums.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Five original recovered programs externalized without changing their values.');
