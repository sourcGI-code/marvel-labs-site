import bpy,sys,json,math,time,importlib.util
from pathlib import Path
from mathutils import Matrix,Vector
TASK=Path('/home/jaxon/trailer-site-theme-rebuild-20261108')
ROOT=Path('/home/jaxon/marvel_site/marvel-labs-integration')
PKG=ROOT/'work/claude-takeover-20261027/opening-pkg'
WORK=PKG/'work/restore-yesterday-presentation-20261025'
ACCEPTED=PKG/'render-work/realism/supplied-film-replacement/yesterday-opening-20ft-preview-b/opening/desktop'
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
shared=module('shared',TASK/'shared_new_trailer.py')
args=sys.argv[sys.argv.index('--')+1:]
def opt(name,default):return args[args.index(name)+1] if name in args else default
frames=[int(x) for x in opt('--frames','126').split(',')] if '--all' not in args else list(range(0,840,2))
width=int(opt('--width','1536'));samples=int(opt('--samples','32'));kind=opt('--kind','desktop');themes=opt('--themes','cyan,mono').split(',')
out=Path('/scratch/marvel-scene-recovery-20261109')/opt('--out','intro-proof');out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'render-work/realism/package-access-v1/opening-{kind}-package-access-v1.blend'),use_scripts=False)
scene=bpy.context.scene;camera=scene.camera
bridge=bpy.data.objects['Hybrid trailer / aligned tow point']
old=list(bridge.children_recursive)
actions={o.name:o.animation_data.action for o in old if o.animation_data and o.animation_data.action}
with bpy.data.libraries.load(str(TASK/'models/trailer-20-hybrid-native.blend'),link=False) as (src,dst):
 names=tuple(src.objects);dst.objects=list(names)
for name,o in zip(names,dst.objects):
 scene.collection.objects.link(o);o.name='Realism / '+name
 if o.parent is None:o.parent=bridge;o.matrix_parent_inverse=Matrix.Identity(4)
 if name in actions:
  o.animation_data_create();o.animation_data.action=actions[name]
for o in old:
 if o.type=='MESH':o.data=bpy.data.meshes.new('Superseded / '+o.name)
# A fixed soft fill follows the trailer, so the decal remains lit through the reveal.
for side in [-1,1]:
 data=bpy.data.lights.new('Recovery / trailer fill '+str(side),'AREA');data.energy=650 if kind=='desktop' else 350;data.shape='DISK';data.size=6;data.color=(.78,.9,1)
 lamp=bpy.data.objects.new(data.name,data);scene.collection.objects.link(lamp);lamp.parent=bridge;lamp.matrix_parent_inverse=Matrix.Identity(4);lamp.location=(3.4,side*5,5.5);lamp.rotation_euler=(Vector((3.4,0,1.4))-lamp.location).to_track_quat('-Z','Y').to_euler()
if kind=='mobile':
 floor=scene.objects['Continuous physical road'];receivers=bpy.data.collections.new('Recovery / blue stage receivers');receivers.objects.link(floor)
 data=bpy.data.lights.new('Recovery / blue stage wash','AREA');data.energy=1300;data.shape='DISK';data.size=6;data.color=(.10,.66,1.)
 lamp=bpy.data.objects.new(data.name,data);scene.collection.objects.link(lamp);lamp.parent=bridge;lamp.matrix_parent_inverse=Matrix.Identity(4);lamp.location=(3.4,-4,4);lamp.rotation_euler=(Vector((3.4,-1,0))-lamp.location).to_track_quat('-Z','Y').to_euler();lamp.light_linking.receiver_collection=receivers
# Preserve the original stage, lights, and exact camera poses.
settings=json.loads((ACCEPTED/'constant-stage-settings.json').read_text())
overscan=module('overscan',WORK/'true-world-overscan-camera-v1.py')
sensors={key:getattr(camera.data,key) for key in ('sensor_fit','sensor_width','sensor_height')}
def mat(a):return Matrix([a[i:i+4] for i in range(0,16,4)])
transport=json.loads((PKG/'worker-assets.json').read_text())['assets'];mapping={e['original']:PKG/e['relative'] for e in transport}
for img in bpy.data.images:
 if img.packed_file or not img.filepath:continue
 p=Path(bpy.path.abspath(img.filepath))
 if not p.exists() and str(p) in mapping:img.filepath=str(mapping[str(p)]);img.reload()
 missing=[im.filepath for im in bpy.data.images if im.filepath and not im.packed_file and not Path(bpy.path.abspath(im.filepath)).exists()]
if missing:raise RuntimeError('Missing textures: '+str(missing))
pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
for d in pref.devices:d.use=d.type=='OPTIX'
scene.render.engine='CYCLES';scene.cycles.device='GPU';scene.cycles.samples=samples;scene.cycles.adaptive_min_samples=max(8,samples//2);scene.cycles.adaptive_threshold=.02
scene.cycles.use_denoising=True;scene.cycles.denoiser='OPENIMAGEDENOISE';scene.cycles.denoising_use_gpu=True
scene.render.use_motion_blur=False;scene.render.use_persistent_data=True;scene.render.use_compositing=False;scene.render.film_transparent=False;scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.compression=10
if kind=='desktop':
 actor_world=scene.world
 actor_view={k:getattr(scene.view_settings,k) for k in ('view_transform','look','exposure','gamma')}
 actor_lights=[o for o in scene.objects if o.type=='LIGHT']
 actor_floor=scene.objects[settings['floor']]
 actor_roots=[scene.objects['Supplied truck'],scene.objects['Sealed 20 ft trailer']]
 actors={o for root in actor_roots for o in root.children_recursive if o.type=='MESH'}
 actors.update(o for o in scene.objects if o.type=='MESH' and o.name.startswith('Physical truck hitch /'))
 camera_visibility={o:o.visible_camera for o in actors}
 background=module('original_stage',WORK/'old-opening-background-v2.py')
 env=background.append(scene,PKG/'render-work/realism/impact-opening-20261022/final-frames/Opening-desktop.blend')
 overscan.extend_background_floor(env['floor'])
 poses=json.loads((PKG/'render-work/film/desktop-poses.json').read_text())['frames']
for i in frames:
 started=time.time();scene.frame_set(i+1)
 if kind=='desktop':
  s=json.loads((ACCEPTED/f'{i:05}.constant-stage.json').read_text())
  for k,v in sensors.items():setattr(camera.data,k,v)
  camera.matrix_world=mat(s['cameraMatrix']);camera.data.lens=s['lens'];camera.data.shift_x,camera.data.shift_y=s['shift']
  for name,info in settings['stageLamps'].items():
   o=scene.objects[name];matrix=mat(info['matrix']);matrix.translation.x+=s['stageOffsetXM'];o.matrix_world=matrix;o.data.energy=info['power'];o.hide_render=False
  for name in settings['originalTruckLights']:scene.objects[name].hide_render=name not in s['truckLightPowers']
  for name in settings['disabledFloorOnlyOriginalLights']:scene.objects[name].hide_render=True
  floor=scene.objects[settings['floor']];matrix=mat(settings['floorMatrix']);matrix.translation.x+=s['stageOffsetXM'];floor.matrix_world=matrix;floor.hide_render=False;floor.visible_camera=True
  for o in scene.objects:
   if o.name=='Transient photographic haze':o.hide_render=True
  bpy.context.view_layer.update();overscan.apply(scene,camera,4608,2048,1328,224)
  scene.render.resolution_x=width;scene.render.resolution_y=round(width*2048/4608/2)*2
 else:
  scene.render.resolution_x=width;scene.render.resolution_y=width*2
 scene.render.resolution_percentage=100
 for theme in themes:
  dest=out/theme;dest.mkdir(exist_ok=True);path=dest/f'{i:05}.png'
  if path.exists():continue
  if kind=='mobile':
   shared.theme(theme);scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
  else:
   shared.theme(theme)
   scene.cycles.samples=samples;scene.cycles.adaptive_min_samples=max(8,samples//2)
   background.hide(env);scene.world=actor_world
   for k,v in actor_view.items():setattr(scene.view_settings,k,v)
   for o,v in camera_visibility.items():o.visible_camera=v
   actor_floor.hide_render=False;actor_floor.visible_camera=False
   scene.render.use_compositing=False;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
   # Lights are prepared above; restore their camera-independent visibility for each theme.
   for name,info in settings['stageLamps'].items():scene.objects[name].hide_render=False
   for o in actor_lights:
    if o.name.startswith('Recovery / trailer fill '):o.hide_render=False
   scene.render.filepath=str(dest/f'{i:05}.actor.png');bpy.ops.render.render(write_still=True)
   for o in actors:o.visible_camera=False
   actor_floor.hide_render=True
   for o in actor_lights:o.hide_render=True
   for name in s['truckLightPowers']:
    o=scene.objects[name];o.hide_render=False;o.light_linking.receiver_collection=None
   background.prepare(scene,env,poses[i]['x'],i/84,use_fog=True)
   # The soft floor and fog need fewer samples than the detailed trailer pass.
   scene.cycles.samples=12;scene.cycles.adaptive_min_samples=6
   scene.render.image_settings.color_mode='RGB';scene.render.compositor_device='GPU'
   scene.render.filepath=str(dest/f'{i:05}.background.png');bpy.ops.render.render(write_still=True)
   # Composite encoded display pixels with the original background lift.
   import subprocess
   subprocess.run(['/usr/bin/python3','/scratch/marvel-scene-recovery-20261109/compose_opening.py',str(dest),str(i)],check=True)
 (out/'progress.json').write_text(json.dumps({'frame':i,'total':len(frames),'seconds':time.time()-started,'themes':themes}))
 print('JETBLACK_FRAME',i,round(time.time()-started,2),flush=True)
