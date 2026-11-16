"""Build immutable candidates only. Does not recreate or change running services."""
from pathlib import Path
import subprocess,json,os,shutil
r=Path('/opt/vps/apps/al-rifai');d=r/'data'
before=json.loads(subprocess.check_output(['docker','inspect','al-rifai-app-1','vps-whatsapp-wa-01-cap4-20261011','vps-whatsapp-wa-02-cap4-20261011','vps-infra-postgres-1']))
(d/'Dockerfile.workflow-app').write_text('FROM sha256:4af25e4a934ff921c239c05c80a92b4c822d5f676065e02b2736033d3d0736c2\nWORKDIR /app\nCOPY --chown=10001:10001 standalone/ ./\nCOPY --chown=10001:10001 static/ ./.next/static/\nUSER 10001:10001\nCMD ["node","server.js"]\n')
# Use canonical build output as context, no source-copy qualification tree.
with (d/'workflow-app-image.log').open('w') as log:
 subprocess.run(['docker','build','--network','none','--pull=false','-f',str(d/'Dockerfile.workflow-app'),'-t','alrifai:business-workflows-20261015',str(r/'.next')],check=True,env={**os.environ,'DOCKER_BUILDKIT':'0'},stdout=log,stderr=subprocess.STDOUT)
# Small source-only context for the two changed native modules.
context=d/'history-mcp'
shutil.copyfile('/opt/vps/services/whatsapp/source/whatsapp-mcp-server/consumer_broker.py',context/'consumer_broker.py')
(context/'Dockerfile.workflow').write_text('FROM sha256:199a9fd56f077190966110684129b530d5011a892adcb7cdfe7a9a0614a7b2a1\nCOPY --chown=10002:10002 stored_history_reader.py consumer_broker.py /app/whatsapp-mcp-server/\nUSER 10002:10002\n')
with (d/'workflow-wa01-image.log').open('w') as log:
 subprocess.run(['docker','build','--network','none','--pull=false','-f',str(context/'Dockerfile.workflow'),'-t','alrifai-whatsapp:business-workflows-20261015',str(context)],check=True,env={**os.environ,'DOCKER_BUILDKIT':'0'},stdout=log,stderr=subprocess.STDOUT)
pins={k:subprocess.check_output(['docker','image','inspect',tag,'--format','{{.Id}}'],text=True).strip() for k,tag in [('app','alrifai:business-workflows-20261015'),('wa01','alrifai-whatsapp:business-workflows-20261015')]}
after=json.loads(subprocess.check_output(['docker','inspect',*[v['Name'].lstrip('/') for v in before]]))
assert [(v['Id'],v['Image'],v['State']['StartedAt']) for v in before]==[(v['Id'],v['Image'],v['State']['StartedAt']) for v in after]
(d/'workflow-images.json').write_text(json.dumps({'status':'BUILT_NOT_DEPLOYED','images':pins,'runningServicesUnchanged':True},indent=2)+'\n')
print(json.dumps(pins))
