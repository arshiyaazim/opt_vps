// Read-only, existing account-scoped MCP credential; no message bodies in output.
import {readFileSync} from 'node:fs';
import {connect} from 'node:net';
const profile=JSON.parse(readFileSync('/etc/vps/apps/al-rifai/review-host.json','utf8'));
const config=profile.broker['wa-01'];
const socket=connect(config.socket);let buffer='',next=0;const waits=new Map();
const timeout=setTimeout(()=>socket.destroy(Error('READ_DEADLINE')),45000);
socket.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))>=0){const message=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);const w=waits.get(message.id);if(w){waits.delete(message.id);if(message.error)w.reject(Error('BROKER_DENIED'));else w.resolve(message.result);}}});
socket.on('error',()=>{for(const w of waits.values())w.reject(Error('BROKER_UNAVAILABLE'));});
const rpc=(method,params)=>new Promise((resolve,reject)=>{const id=++next;waits.set(id,{resolve,reject});socket.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
const call=async(name,args)=>{const r=await rpc('tools/call',{name,arguments:args});if(r.isError)throw Error('TOOL_DENIED');return r.structuredContent??JSON.parse(r.content[0].text);};
try{
 await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});socket.write(readFileSync(config.token,'utf8').trim()+'\n');
 await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'alrifai-authorized-read-audit',version:'1'}});socket.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const chats=['8801844836824@s.whatsapp.net','8801670535255@s.whatsapp.net'];const scopes=[];
 for(const chat of chats){let after='0',scanned=0,paymentBlocks=0,incoming=0,outgoing=0,vesselBlocks=0,releaseLabels=0,first=null,last=null,complete=false;
  for(let n=0;n<3;n++){const page=await call('list_stored_messages',{chat_jid:chat,after_rowid:after,limit:10});for(const r of page.records){scanned++;const m=r.message;if(!m)continue;first=first&&first<m.sourceTime?first:m.sourceTime;last=last&&last>m.sourceTime?last:m.sourceTime;if(m.direction==='OUTGOING')outgoing++;else incoming++;paymentBlocks+=(m.text.match(/^\s*(?:ID|Employee ID|আইডি)\s*[:=-]/gim)??[]).length;vesselBlocks+=(m.text.match(/lighter\s*vessel\s*:/gim)??[]).length;if(/release date\s*:/i.test(m.text))releaseLabels++;}after=page.nextAfter;complete=page.complete;if(complete)break;}
  scopes.push({chat,scanned,incoming,outgoing,paymentBlocks,vesselBlocks,releaseLabels,first,last,complete,nextAfter:after});
 }
 console.log(JSON.stringify({at:new Date().toISOString(),scope:'EXISTING_APP_READER_TWO_DIRECT_CHATS',scopes,rawBodiesLogged:false,dbWrites:0},null,2));
}finally{clearTimeout(timeout);socket.destroy();}
