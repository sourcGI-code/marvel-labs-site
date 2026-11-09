import subprocess,time,json
from pathlib import Path
W=Path('/scratch/marvel-scene-recovery-20261109');B='/home/jaxon/Downloads/blender-5.1.1-linux-x64/blender';worker='/home/jaxon/marvel-render-20261108/tools/render_worker.py'
status={'phase':'rendering','source':'workday-corrected-realism-v2.blend','resolution':[1920,1200],'sourceFrameStep':2,'outputFPS':30,'started':time.time(),'completed':[]}
for label,start,end in [('head',0,1414),('tail',1416,3086)]:
 status['chapter']=label;(W/'workday-queue.json').write_text(json.dumps(status,indent=2))
 frames=','.join(map(str,range(start,end+1,2)))
 cmd=[B,'--factory-startup','-b',str(W/'workday-corrected-realism-v2.blend'),'--disable-autoexec','-t','6','--python-exit-code','1','--python',worker,'--','--out',str(W/'workday-frames'),'--frames',frames,'--width','1920','--height','1200','--samples','16','--label',label]
 with (W/('render-workday-'+label+'.log')).open('w') as log:r=subprocess.run(cmd,stdout=log,stderr=log)
 if r.returncode:status.update(phase='failed',returncode=r.returncode);break
 status['completed'].append(label)
else:status.update(phase='rendered',finished=time.time())
(W/'workday-queue.json').write_text(json.dumps(status,indent=2))
