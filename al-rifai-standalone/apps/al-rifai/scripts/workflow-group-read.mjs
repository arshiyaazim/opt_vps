import {createHash} from 'node:crypto';
const awaitHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
// Read-only, existing account-scoped MCP credential; no message bodies in output.
import {readFileSync} from 'node:fs';
import {connect} from 'node:net';
const config={socket:'/broker.sock',token:'/run/secrets/reader'};
const socket=connect(config.socket);let buffer='',next=0;const waits=new Map();
const timeout=setTimeout(()=>socket.destroy(Error('READ_DEADLINE')),45000);
socket.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))>=0){const message=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);const w=waits.get(message.id);if(w){waits.delete(message.id);if(message.error)w.reject(Error('BROKER_DENIED'));else w.resolve(message.result);}}});
socket.on('error',()=>{for(const w of waits.values())w.reject(Error('BROKER_UNAVAILABLE'));});
const rpc=(method,params)=>new Promise((resolve,reject)=>{const id=++next;waits.set(id,{resolve,reject});socket.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
const call=async(name,args)=>{const r=await rpc('tools/call',{name,arguments:args});if(r.isError)throw Error('TOOL_DENIED');return r.structuredContent??JSON.parse(r.content[0].text);};
try{
 await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});socket.write(readFileSync(config.token,'utf8').trim()+'\n');
 await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'alrifai-authorized-read-audit',version:'1'}});socket.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const chats=['120363426895117693@g.us','120363408741101070@g.us','120363428977781821@g.us'],groups=[];
 for(const chat of chats){
  const raw=await call('list_messages',{chat_jid:chat,limit:10,page:0,include_context:false,context_before:0,context_after:0,sort_by:'newest'});
  const messages=Array.isArray(raw)?raw:Array.isArray(raw?.result)?raw.result:[];
  const participants=[...new Set(messages.map(m=>m.sender_jid).filter(v=>typeof v==='string'&&v))];
  groups.push({chatJid:chat,observed:messages.length,participants,releaseRelevant:messages.filter(m=>/release|রিলিজ|ছাড়|ছাড়/i.test(m.content??'')).length,mediaReferences:messages.filter(m=>m.media_type&&!['reaction','text'].includes(m.media_type)).length,bodyHashes:messages.map(m=>({messageHash:(awaitHash([chat,m.id])),senderRef:m.sender_jid,sourceTime:m.timestamp})),completeHistory:false});
 }
 console.log(JSON.stringify({at:new Date().toISOString(),scope:'EXISTING_OWNER_READER_THREE_NAMED_GROUPS',groups,rawBodiesLogged:false,mediaAcquired:false,dbWrites:0},null,2));

}finally{clearTimeout(timeout);socket.destroy();}
