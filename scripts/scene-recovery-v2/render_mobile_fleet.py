"""Portrait version of the recovered neutral trailer on the original blue stage."""
import importlib.util,sys,os,json
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path('/home/jaxon/marvel_site/marvel-labs-integration')
TASK=Path('/home/jaxon/trailer-site-theme-rebuild-20261108')
OUT=Path(os.environ.get('RECOVERY_MOBILE_FLEET_OUT','/scratch/marvel-scene-recovery-20261109/fleet-mobile-proof'))/'mono'
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
shared=module('shared_mobile_recovery',TASK/'shared_clean_trailer.py')
camera=module('camera_recovery','/scratch/marvel-scene-recovery-20261109/fleet_camera.py')
if '--frames' in sys.argv and sys.argv[sys.argv.index('--frames')+1]=='all':sys.argv[sys.argv.index('--frames')+1]=','.join(map(str,range(0,541,2)))
source=ROOT/'scripts/render-supplied-films.py'
text=source.read_text()
text=text.replace("out=ROOT/'render-work/realism/supplied-film-replacement'/a.run/a.scene/a.kind;out.mkdir(parents=True,exist_ok=True)","out=Path("+repr(str(OUT))+");out.mkdir(parents=True,exist_ok=True)")
anchor="scene=ns['scene'];scene.cycles.samples=a.samples;scene.cycles.adaptive_min_samples=min(32 if a.scene=='opening' else 16,a.samples)"
assert text.count(anchor)==1
text=text.replace(anchor,anchor+"\n_shared_trailers=_shared.install(ns)\n_setup(scene)\n")
anchor="    prep_started=time.time();prepare(i)"
assert text.count(anchor)==1
text=text.replace(anchor,anchor+"\n    [t.update(0.) for t in _shared_trailers.values()]\n    _adjust(ns,_shared_trailers,i,out)\n")
def labels(scene,rigs,index,out):
 result={}
 for size,t in rigs.items():
  v=world_to_camera_view(scene,scene.camera,t.base.matrix_world@Vector((t.rear-size*.3048/2,0,t.ground+105*.0254)))
  result['large' if size==20 else 'small']={'x':round(v.x*540,4),'y':round((1-v.y)*1080,4)}
 (out/f'{index:05}.shared-labels.json').write_text(json.dumps(result))
def adjust(ns,rigs,index,out):
 scene=ns['scene']
 camera.adjust({'scene':scene,'_shared_trailers':rigs,'recoveryViewport':(540,1080),'recoveryShift':(-18,-16),'_shared_labels':lambda _,i:labels(scene,rigs,i,out)},index,out)
def setup(scene):
 shared.theme('mono')
 pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
 for d in pref.devices:d.use=d.type=='OPTIX'
 scene.cycles.device='GPU';scene.cycles.denoiser='OPENIMAGEDENOISE';scene.cycles.denoising_use_gpu=True
 scene.render.use_motion_blur=False;scene.render.use_persistent_data=True;scene.render.image_settings.compression=10
 for o in scene.objects:
  if o.type=='LIGHT' and not o.name.startswith('Recovery / studio /'):o.hide_render=True
 for name,pos,power,size in [('key',(-12,10,9),1800,8),('fill',(-23,5,7),1400,6),('rim',(-17,-4,8),2000,6)]:
  label='Recovery / studio /'+name;data=bpy.data.lights.new(label,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=(.78,.9,1) if name=='rim' else (1,1,1)
  o=bpy.data.objects.new(label,data);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((-17,4,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
 floor=scene.objects['Fabrication / studio contact floor'];receivers=bpy.data.collections.new('Recovery / blue stage receivers');receivers.objects.link(floor)
 data=bpy.data.lights.new('Recovery / blue stage wash','AREA');data.energy=1800;data.shape='DISK';data.size=8;data.color=(.10,.66,1.)
 o=bpy.data.objects.new(data.name,data);scene.collection.objects.link(o);o.location=(-19,-3,6);o.rotation_euler=(Vector((-19,4,0))-o.location).to_track_quat('-Z','Y').to_euler();o.light_linking.receiver_collection=receivers
 bpy.context.view_layer.update()
exec(compile(text,str(source),'exec'),{'__file__':str(source),'__name__':'__main__','_shared':shared,'_setup':setup,'_adjust':adjust})
