import os,sys
from pathlib import Path
TASK=Path('/home/jaxon/trailer-site-theme-rebuild-20261108')
ROOT=Path('/home/jaxon/marvel_site/marvel-labs-integration')
source=ROOT/'render-work/realism/intro-trailer-master-v1/tools/render-fleet-master-v2.py'
os.environ['MARVEL_GPU_BACKEND']='OPTIX';os.environ['MARVEL_DRAFT_PERCENT']='100'
args=sys.argv[sys.argv.index('--')+1:]
if args[args.index('--frames')+1]=='all':args[args.index('--frames')+1]=','.join(map(str,range(0,541,2)))
theme=args[args.index('--theme')+1] if '--theme' in args else 'cyan'
dual='--dual' in args
if dual:args.remove('--dual');theme='mono'
if '--theme' in args:
 i=args.index('--theme');del args[i:i+2]
sys.argv=sys.argv[:sys.argv.index('--')+1]+args
text=source.read_text()
text=text.replace("Path(__file__).with_name('shared_intro_master_trailer_v2.py')",repr(str(TASK/'shared_clean_trailer.py')))
# Path() is required by fingerprint reads; imported module accepts either form.
text=text.replace("files = ["+repr(str(TASK/'shared_clean_trailer.py')), "files = [Path("+repr(str(TASK/'shared_clean_trailer.py'))+")")
text=text.replace("output = PROOF_DIR / run / 'cargo' / kind", "output = Path("+repr(str(Path(os.environ.get('RECOVERY_FLEET_OUT','/scratch/marvel-scene-recovery-20261109/fleet-proof'))/theme))+")")
text=text.replace("    namespace['_two_beauty'].calibrate(index)", "    shared.theme("+repr(theme)+")\n    namespace['_two_beauty'].calibrate(index)")
if dual:
 text=text.replace("    shared.theme('mono')","    shared.theme('mono')\n    _jetblack_compositor(index,namespace,output)")
 text=text.replace("    benchmarks.append({","    _jetblack_compose(index,output)\n    benchmarks.append({")

def _jetblack_compositor(index,ns,output):
 import importlib.util
 proof=ns['_two_beauty']
 if not hasattr(proof,'_cyan'):
  spec=importlib.util.spec_from_file_location('ink_compositor',TASK/'theme_compositor.py');proof._ink=importlib.util.module_from_spec(spec);spec.loader.exec_module(proof._ink)
  proof._cyan=proof._ink.setup(ns['scene'],proof.actor_compositor);proof._cyan.format.color_mode='RGBA'
 proof._ink.frame(proof._cyan,output,index)

def _jetblack_compose(index,output):
 import subprocess
 subprocess.run(['/usr/bin/python3',str(TASK/'compose_fleet.py'),str(output),str(index)],check=True)


def fix_actor_lights(ns):
 import bpy
 from mathutils import Vector
 proof=ns['_two_beauty'];scene=ns['scene']
 for o in list(proof.lights):
  if not o.name.startswith('Jet black / studio light /'):o.hide_render=True
 for name,pos,power,size in [('key',(-12,10,9),1800,8),('fill',(-23,5,7),1400,6),('rim',(-17,-4,8),2000,6)]:
  label='Jet black / studio light /'+name
  obj=bpy.data.objects.get(label)
  if obj is None:
   data=bpy.data.lights.new(label,'AREA');data.energy=power;data.shape='DISK';data.size=size;obj=bpy.data.objects.new(label,data);scene.collection.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector((-17,4,1.5))-obj.location).to_track_quat('-Z','Y').to_euler();proof.lights.add(obj)
  obj.hide_render=False
 bpy.context.view_layer.update()

text=text.replace("    namespace['_two_beauty'].calibrate(index)","    _fix_actor_lights(namespace)\n    namespace['_two_beauty'].calibrate(index)")

import importlib.util
spec=importlib.util.spec_from_file_location('recovery_camera','/scratch/marvel-scene-recovery-20261109/fleet_camera.py');recovery=importlib.util.module_from_spec(spec);spec.loader.exec_module(recovery)
text=text.replace("    namespace['_two_beauty'].calibrate(index)","    _layout_camera(namespace,index,output)\n    namespace['_two_beauty'].calibrate(index)")
text=text.replace("    benchmarks.append({","    _compose_recovery(index,output)\n    benchmarks.append({")
def compose_recovery(index,output):
 import subprocess
 subprocess.run(['/usr/bin/python3','/scratch/marvel-scene-recovery-20261109/compose_fleet.py',str(output),str(index)],check=True)
exec(compile(text,str(source),'exec'),{'__file__':str(source),'__name__':'__main__','_layout_camera':recovery.adjust,'_compose_recovery':compose_recovery,'_fix_actor_lights':fix_actor_lights,'_jetblack_compositor':_jetblack_compositor,'_jetblack_compose':_jetblack_compose})
