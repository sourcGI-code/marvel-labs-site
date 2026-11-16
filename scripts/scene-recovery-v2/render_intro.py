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
frames=[int(x) for x in opt('--frames','126').split(',')] if '--all' not in args else list(range(int(opt('--start','0')),int(opt('--end','840')),int(opt('--step','2'))))
width=int(opt('--width','1536'));samples=int(opt('--samples','32'));kind=opt('--kind','desktop');themes=opt('--themes','cyan,mono').split(',')
actor_only='--actor-only' in args and kind=='desktop'
background_only='--background-only' in args and kind=='desktop'
actor_border='--actor-border' in args and actor_only
soft_impact='--original-camera' not in args
out=Path('/scratch/marvel-scene-recovery-20261109')/opt('--out','intro-proof');out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'render-work/realism/package-access-v1/opening-{kind}-package-access-v1.blend'),use_scripts=False)
scene=bpy.context.scene;camera=scene.camera
bridge=bpy.data.objects['Hybrid trailer / aligned tow point']
old=list(bridge.children_recursive)
actions={o.name:(o.animation_data.action,o.animation_data.action_slot,o.rotation_mode) for o in old if o.animation_data and o.animation_data.action}
with bpy.data.libraries.load(str(TASK/'models/trailer-20-hybrid-native.blend'),link=False) as (src,dst):
 names=tuple(src.objects);dst.objects=list(names)
for name,o in zip(names,dst.objects):
 scene.collection.objects.link(o);o.name='Realism / '+name
 if o.parent is None:o.parent=bridge;o.matrix_parent_inverse=Matrix.Identity(4)
 if name in actions:
  action,slot,rotation_mode=actions[name]
  # Imported GLB empties use quaternions. The original wheel actions animate
  # Euler rotation, which otherwise changes values without turning any mesh.
  o.rotation_mode=rotation_mode
  o.animation_data_create();o.animation_data.action,o.animation_data.action_slot=action,slot
for o in old:
 if o.type=='MESH':o.data=bpy.data.meshes.new('Superseded / '+o.name)
if '--audit-wheels' in args:
 # Inspect real mesh positions in trailer coordinates. Euler values alone
 # cannot prove motion when a GLB object's active mode is quaternion rotation.
 report=[]
 for frame in [160,161,170,180,200,600,601]:
  scene.frame_set(frame+1);bpy.context.view_layer.update();rows=[]
  for n in range(1,5):
   wheel=bpy.data.objects[f'Realism / Film wheel {n}']
   lug=next(o for o in wheel.children_recursive if o.type=='MESH' and 'Lug nut' in o.name)
   point=bridge.matrix_world.inverted()@lug.matrix_world@(sum((Vector(v) for v in lug.bound_box),Vector())/8)
   center=bridge.matrix_world.inverted()@wheel.matrix_world.translation
   rows.append({'wheel':n,'mode':wheel.rotation_mode,'point':list(point),'radius':(point-center).length})
  report.append({'frame':frame,'wheels':rows})
 for n in range(4):
  first,second=[Vector(r['wheels'][n]['point']) for r in report[:2]]
  assert (second-first).length>.01,('Wheel mesh did not roll',n+1)
  assert max(r['wheels'][n]['radius'] for r in report)-min(r['wheels'][n]['radius'] for r in report)<1e-4,('Wheel did not orbit its axle',n+1)
  stopped=[Vector(r['wheels'][n]['point']) for r in report[-2:]]
  assert (stopped[1]-stopped[0]).length<1e-4,('Wheel keeps spinning after the trailer stops',n+1)
 (out/'wheel-motion-audit.json').write_text(json.dumps(report,indent=2)+'\n')
 print('All four wheel meshes roll around their axles and stop with the trailer.',flush=True)
 if '--audit-only' in args:sys.exit(0)
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
handoff_lights=json.loads((ACCEPTED/'00758.constant-stage.json').read_text())['truckLightPowers']
if kind=='desktop':
 # Explicit per-frame powers below replace the old animated on/off keys.
 for name in settings['originalTruckLights']:
  scene.objects[name].data.animation_data_clear()
  # Match the established separated-background lighting from the first frame.
  # The old two-pass loop only cleared these links after its first actor pass.
  scene.objects[name].light_linking.receiver_collection=None
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
scene.render.use_motion_blur=False;scene.render.use_persistent_data=actor_only or background_only or kind=='mobile';scene.render.use_compositing=False;scene.render.film_transparent=False;scene.render.threads_mode='FIXED';scene.render.threads=6
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
def impact_camera_time(frame):return 126+(frame-118)**2/32 if soft_impact and 118<=frame<134 else frame
mobile_camera_poses={}
if kind=='mobile' and soft_impact:
 original_camera=camera
 for frame in frames:
  target=impact_camera_time(frame);scene.frame_set(math.floor(target)+1,subframe=target%1)
  evaluated=original_camera.evaluated_get(bpy.context.evaluated_depsgraph_get())
  mobile_camera_poses[frame]=(evaluated.matrix_world.copy(),evaluated.data.lens)
 # The original mobile camera has animation/constraints; a clean camera holds
 # its sampled pose while the truck and trailer stay at their original time.
 camera=original_camera.copy();camera.data=original_camera.data.copy();camera.parent=None
 camera.animation_data_clear();camera.data.animation_data_clear()
 for constraint in list(camera.constraints):camera.constraints.remove(constraint)
 scene.collection.objects.link(camera);scene.camera=camera
def limit_actor_render():
 # Trace only pixels around the visible truck/trailer, retaining the complete
 # native-resolution canvas. This does not rescale geometry or alter cameras.
 scene.render.use_border=False;scene.render.use_crop_to_border=False
 if not actor_border:return
 bpy.context.view_layer.update()
 w,h=scene.render.resolution_x,scene.render.resolution_y
 projection=camera.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(),x=w,y=h)@camera.matrix_world.inverted()
 points=[]
 for o in actors:
  if o.hide_render or not o.visible_camera or not len(o.data.vertices):continue
  transform=projection@o.matrix_world
  corners=[transform@Vector((*corner,1)) for corner in o.bound_box]
  # Offscreen truck parts must not expand the border to the whole viewport
  # during the departure. They remain in the scene for lighting/reflections.
  if all(p.w<=0 for p in corners):continue
  if any(all(sign*p[axis]>p.w for p in corners) for axis in range(3) for sign in [-1,1]):continue
  for p in corners:
   if p.w<=0:return
   points.append(((p.x/p.w+1)/2,(p.y/p.w+1)/2))
 if not points:return
 left=max(0,min(p[0] for p in points)-40/w);right=min(1,max(p[0] for p in points)+40/w)
 bottom=max(0,min(p[1] for p in points)-40/h);top=min(1,max(p[1] for p in points)+40/h)
 if left>=right or bottom>=top:return
 scene.render.use_border=True
 scene.render.border_min_x=left;scene.render.border_max_x=right
 scene.render.border_min_y=bottom;scene.render.border_max_y=top
for i in frames:
 started=time.time();scene.frame_set(i+1)
 # Begin the existing sideways escape gently before the grille reaches the
 # camera. The remapped camera time has zero speed at 118 and rejoins the
 # original path at frame 134 with matching speed, without a held-frame cut.
 camera_time=impact_camera_time(i)
 if kind=='desktop':
  s=json.loads((ACCEPTED/f'{i:05}.constant-stage.json').read_text())
  if camera_time!=i:
   lo=math.floor(camera_time);t=camera_time-lo
   a=json.loads((ACCEPTED/f'{lo:05}.constant-stage.json').read_text());b=json.loads((ACCEPTED/f'{lo+1:05}.constant-stage.json').read_text())
   m=mat(a['cameraMatrix']).lerp(mat(b['cameraMatrix']),t)
   s['cameraMatrix']=[v for row in m for v in row]
   s['lens']=a['lens']*(1-t)+b['lens']*t
   s['shift']=[x*(1-t)+y*t for x,y in zip(a['shift'],b['shift'])]
  # The source switches every truck/studio lamp off at frame 760. Fade their
  # physical power as the camera settles instead of flashing to a darker set.
  if 732<=i<784:
   t=(i-732)/(784-732);fade=1-t*t*(3-2*t)
   s['truckLightPowers']={name:power*fade for name,power in handoff_lights.items()}
  for k,v in sensors.items():setattr(camera.data,k,v)
  camera.matrix_world=mat(s['cameraMatrix']);camera.data.lens=s['lens'];camera.data.shift_x,camera.data.shift_y=s['shift']
  for name,info in settings['stageLamps'].items():
   o=scene.objects[name];matrix=mat(info['matrix']);matrix.translation.x+=s['stageOffsetXM'];o.matrix_world=matrix;o.data.energy=info['power'];o.hide_render=False
  for name in settings['originalTruckLights']:
   scene.objects[name].hide_render=name not in s['truckLightPowers']
   if name in s['truckLightPowers']:scene.objects[name].data.energy=s['truckLightPowers'][name]
  for name in settings['disabledFloorOnlyOriginalLights']:scene.objects[name].hide_render=True
  floor=scene.objects[settings['floor']];matrix=mat(settings['floorMatrix']);matrix.translation.x+=s['stageOffsetXM'];floor.matrix_world=matrix;floor.hide_render=False;floor.visible_camera=True
  for o in scene.objects:
   if o.name=='Transient photographic haze':o.hide_render=True
  bpy.context.view_layer.update();overscan.apply(scene,camera,4608,2048,1328,224)
  scene.render.resolution_x=width;scene.render.resolution_y=round(width*2048/4608/2)*2
 else:
  if mobile_camera_poses:camera.matrix_world,camera.data.lens=mobile_camera_poses[i]
  scene.render.resolution_x=width;scene.render.resolution_y=width*2
 scene.render.resolution_percentage=100
 for theme in themes:
  dest=out/theme;dest.mkdir(exist_ok=True);path=dest/f'{i:05}.png'
  if (dest/f'{i:05}.actor.png' if actor_only else dest/f'{i:05}.background.png' if background_only else path).exists():continue
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
   limit_actor_render()
   scene.render.filepath=str(dest/f'{i:05}.actor.png')
   if not background_only:bpy.ops.render.render(write_still=True)
   if actor_only:continue
   actor_lamp_visibility={o:o.hide_render for o in actor_lights}
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
   if background_only:continue
   # Composite encoded display pixels with the original background lift.
   import subprocess
   subprocess.run(['/usr/bin/python3','/scratch/marvel-scene-recovery-20261109/compose_opening.py',str(dest),str(i)],check=True)
   for o,hidden in actor_lamp_visibility.items():o.hide_render=hidden
 (out/'progress.json').write_text(json.dumps({'frame':i,'total':len(frames),'seconds':time.time()-started,'themes':themes}))
 print('JETBLACK_FRAME',i,round(time.time()-started,2),flush=True)
