import https from 'node:https';import http from 'node:http';import {readFileSync} from 'node:fs';import {isPathAllowed} from './entry-rules.mjs';
const simulated=process.env.ALRIFAI_REVIEW_PROFILE==='B01-B03-SIMULATED'&&/^alrifai_identity_qualification_[a-z0-9_]+$/.test(process.env.ALRIFAI_RELEASE_QUALIFICATION_DATABASE||'');
const root=simulated?'/qualification/disposable':'/etc/vps/apps/al-rifai',config=JSON.parse(readFileSync(root+'/review-host.json','utf8')),origin=new URL(config.origin),cashOrigin=new URL(process.env.ALRIFAI_CASH_ORIGIN||'https://alrifai.iamazim.com');
if(config.mode!==(simulated?'simulated-live':'live')||config.origin!==(simulated?'https://localhost:3443':'https://app.al-rifai.iamazim.com')||!/^[a-f0-9]{64}$/.test(config.peerSecret))throw Error('PRIVATE_ENTRY_CONFIG_DENIED');
if(!simulated&&(cashOrigin.protocol!=='https:'||cashOrigin.username||cashOrigin.password||cashOrigin.pathname!=='/'||cashOrigin.search||cashOrigin.hash||cashOrigin.host===origin.host))throw Error('CASH_ORIGIN_CONFIG_DENIED');
let active=0;
const server=https.createServer({key:readFileSync(simulated?root+'/key.pem':root+'/tls/private-entry.key'),cert:readFileSync(simulated?root+'/cert.pem':root+'/tls/private-entry.crt'),maxHeaderSize:16384},(req,res)=>{
 const host=String(req.headers.host||'').split(':')[0].toLowerCase(),cashHost=!simulated&&host===cashOrigin.hostname;
 if((host!==origin.hostname&&!cashHost)||!req.url?.startsWith('/')||req.url.length>8192){res.writeHead(403);return res.end();}
 // Boundary-exact allowlists (release/entry-rules.mjs). Workspace routes are
 // explicitly listed so no unrelated prefix is exposed.
 if(!isPathAllowed(req.url,cashHost?'cash':'main')){res.writeHead(404);return res.end();}
 if(active>=40){res.writeHead(503);return res.end();}active++;let finished=false;
 const headers={...req.headers};for(const k of Object.keys(headers))if(k.startsWith('x-forwarded-')||k.startsWith('oai-authenticated-')||['x-wf02-peer','x-alrifai-client-ip','x-middleware-subrequest'].includes(k))delete headers[k];
 headers.host=cashHost?cashOrigin.host:origin.host;headers['x-wf02-peer']=config.peerSecret;headers['x-alrifai-client-ip']=req.socket.remoteAddress;
 const upstream=http.request({hostname:'127.0.0.1',port:3000,path:req.url,method:req.method,headers,timeout:190000},reply=>{reply.on('error',()=>{if(!res.destroyed)res.destroy();});if(res.destroyed){reply.destroy();return;}res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
 upstream.on('error',()=>{if(res.destroyed)return;if(!res.headersSent)res.writeHead(503);res.end();});upstream.on('timeout',()=>upstream.destroy());res.on('close',()=>{if(!finished){active--;finished=true;}if(!res.writableFinished)upstream.destroy();});req.on('error',()=>upstream.destroy());res.on('error',()=>upstream.destroy());req.pipe(upstream);
});server.requestTimeout=180000;server.headersTimeout=15000;server.keepAliveTimeout=5000;server.listen(3443,'0.0.0.0');

export {server};
