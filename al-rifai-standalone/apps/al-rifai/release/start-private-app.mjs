// One existing app container; no additional service/account/database.
import {spawn} from 'node:child_process';
const app=spawn(process.execPath,['/app/server.js'],{env:{...process.env,HOSTNAME:'0.0.0.0',PORT:'3000'},stdio:'inherit'});
const {server}=await import('./private-entry.mjs');
let stopping=false;
const workers=[];
function supervise(name,script){
 let child=null,restartTimer=null;
 const start=()=>{
  if(stopping)return;
  child=spawn(process.execPath,['--experimental-strip-types',script],{env:process.env,stdio:'inherit'});
  child.on('error',error=>{
   console.error(`${name} worker could not start: ${error.message}`);
   schedule();
  });
  child.on('exit',(code,signal)=>{
   if(!stopping)console.error(`${name} worker exited (${code??signal??'unknown'}); retrying.`);
   schedule();
  });
 };
 const schedule=()=>{
  if(stopping||restartTimer)return;
  restartTimer=setTimeout(()=>{restartTimer=null;start();},5000);
  restartTimer.unref();
 };
 start();
 workers.push(()=>{
  if(restartTimer)clearTimeout(restartTimer);
  child?.kill('SIGTERM');
 });
}
function stop(){
 if(stopping)return;
 stopping=true;
 server.close();
 for(const stopWorker of workers)stopWorker();
 app.kill('SIGTERM');
}
supervise('WhatsApp ingestion','/app/scripts/message-ingestion-worker.ts');
if(process.env.ALRIFAI_MESSAGE_MIRROR_ENABLED==='1'){
 supervise('WhatsApp Message Mirror','/app/scripts/message-mirror-worker.ts');
}
supervise('Cash review processor','/app/scripts/process-cash.ts');
supervise('Vessel processor','/app/scripts/process-vessel.ts');
process.on('SIGINT',stop);process.on('SIGTERM',stop);
app.on('error',error=>{console.error(`Application server could not start: ${error.message}`);stop();process.exitCode=1;});
app.on('exit',code=>{stop();process.exitCode=code??1;});
