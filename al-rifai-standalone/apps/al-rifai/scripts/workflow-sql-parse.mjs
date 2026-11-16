// Extended protocol PARSE ONLY. No Bind/Execute, DDL, migration or ledger write.
import pg from 'pg';
import {createPool} from '../db/postgres.mjs';
const sql=process.env.WORKFLOW_SQL_BASE64?Buffer.from(process.env.WORKFLOW_SQL_BASE64,'base64').toString():'';
if(!sql)throw Error('SQL_INPUT_REQUIRED');
function statements(s){const parts=[];let start=0,quote=null,dollar=null,line=false,block=false;
 for(let i=0;i<s.length;i++){const c=s[i],next=s[i+1];if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&next==='/'){block=false;i++;}continue;}if(dollar){if(s.startsWith(dollar,i)){i+=dollar.length-1;dollar=null;}continue;}if(quote){if(c===quote){if(next===quote)i++;else quote=null;}continue;}if(c==='-'&&next==='-'){line=true;i++;continue;}if(c==='/'&&next==='*'){block=true;i++;continue;}if(c==='\''||c==='"'){quote=c;continue;}if(c==='$'){const m=/^\$[A-Za-z_0-9]*\$/.exec(s.slice(i));if(m){dollar=m[0];i+=dollar.length-1;continue;}}if(c===';'){const v=s.slice(start,i+1).trim();if(v)parts.push(v);start=i+1;}}
 if(s.slice(start).trim())parts.push(s.slice(start));return parts;
}
class ParseOnly extends pg.Query{submit(connection){this.connection=connection;connection.parse({text:this.text,name:this.name,types:[]});connection.sync();return null;}}
const pool=createPool({role:'review',max:1,applicationName:'alrifai-workflow-parse-only'});
const client=await pool.connect();
try{let parsed=0;for(const text of statements(sql)){await new Promise((resolve,reject)=>{client.query(new ParseOnly({text,name:'workflow_parse_'+parsed},(error)=>error?reject(Error('PARSE_FAILED_'+parsed+'_'+error.code)):resolve()));});parsed++;}console.log(JSON.stringify({status:'PARSE_ONLY_PASS',statements:parsed,ddlExecuted:0,plpgsqlBodiesExecuted:0,constraintsTested:false}));}finally{client.release();await pool.end();}
