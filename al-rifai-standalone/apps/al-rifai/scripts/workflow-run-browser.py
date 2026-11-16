from pathlib import Path
import subprocess,json,time,uuid
r=Path('/opt/vps/apps/al-rifai');d=r/'data';image=json.loads((d/'workflow-images.json').read_text())['images']['app'];name='alrifai-workflow-ui-'+uuid.uuid4().hex[:8]
fixture=Path('/tmp/alrifai-workflow-validation-fixture');fixture.write_text('Synthetic browser validation fixture only 2026');fixture.chmod(0o644)
try:
 subprocess.run(['docker','run','-d','--name',name,'--network','none','--read-only','--user','10001:10001','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','512m','--pids-limit','128','--tmpfs','/tmp:rw,size=32m,uid=10001,gid=10001','-v',str(fixture)+':/run/secrets/validation_password:ro','-e','HOSTNAME=0.0.0.0','-e','PORT=3000','--entrypoint','node',image,'server.js'],check=True,stdout=subprocess.DEVNULL)
 for _ in range(40):
  p=subprocess.run(['docker','exec',name,'node','-e',"fetch('http://127.0.0.1:3000/review',{headers:{Authorization:'Basic '+Buffer.from('validator:Synthetic browser validation fixture only 2026').toString('base64')}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],capture_output=True)
  if p.returncode==0:break
  time.sleep(.25)
 else:raise RuntimeError('CANDIDATE_IMAGE_NOT_READY')
 with (d/'workflow-browser.log').open('w') as log:
  subprocess.run(['docker','run','--rm','--network','container:'+name,'--read-only','--cpus','1','--memory','1024m','--pids-limit','256','--tmpfs','/tmp:rw,size=128m','--tmpfs','/dev/shm:rw,size=64m','--tmpfs','/root/.config:rw,size=32m','--tmpfs','/root/.cache:rw,size=32m','-e','PYTHONDONTWRITEBYTECODE=1','-v',str(r/'scripts/workflow-browser.py')+':/test.py:ro','-v',str(d)+':/results','--entrypoint','/app/whatsapp-mcp-server/.venv/bin/python','alrifai-wf02-offline-tooling:20261013','/test.py'],check=True,stdout=log,stderr=subprocess.STDOUT,timeout=180)
 print((d/'workflow-browser.json').read_text())
finally:
 (d/'workflow-image-smoke.log').write_text(subprocess.run(['docker','logs',name],capture_output=True,text=True).stdout)
 subprocess.run(['docker','stop','-t','3',name],capture_output=True)
 subprocess.run(['docker','rm',name],capture_output=True)
