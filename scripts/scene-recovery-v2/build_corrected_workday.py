"""Replace exterior mesh data inside the owner's corrected, baked scene.
All existing object transforms, animation, collections, contact rigs, and cameras remain owned by that scene.
"""
import bpy,json,hashlib,struct
from pathlib import Path
from mathutils import Matrix
W=Path('/scratch/marvel-scene-recovery-20261109');SOURCE=Path('/scratch/marvel-package-update-20261105/workday-package-v2.blend');MODELS=Path('/home/jaxon/trailer-site-theme-rebuild-20261108/models')
bpy.ops.wm.open_mainfile(filepath=str(SOURCE),use_scripts=False);s=bpy.context.scene
# Record every original animation curve, not just the visible proof frames.
def animation_hash():
 h=hashlib.sha256()
 for a in sorted(bpy.data.actions,key=lambda x:x.name):
  h.update(a.name.encode())
  for layer in a.layers:
   for strip in layer.strips:
    for bag in strip.channelbags:
     for fc in bag.fcurves:
      h.update((fc.data_path+str(fc.array_index)).encode())
      for k in fc.keyframe_points:h.update(struct.pack('<2f',*k.co))
 return h.hexdigest()
before=animation_hash();rows=[];unchanged_types=[];extras=[]
originals=list(s.objects)
for feet in (16,20):
 path=MODELS/f'trailer-{feet}-hybrid-native.blend'
 with bpy.data.libraries.load(str(path),link=False) as (src,dst):names=tuple(src.objects);dst.objects=list(names)
 refs=dict(zip(names,dst.objects))
 # Model authoring truncated two long decal object names; map their canonical equivalents.
 aliases={'Wrap / Marvel full-height stripe Near.002 / extended factory section':'Wrap / Marvel full-height stripe Near.002 / extended factory se','Wrap / Marvel full-height stripe Near.002 / extended factory section (curbside)':'Wrap / Marvel full-height stripe Near.002 / extended factor'}
 prefix=f'Shared intro {feet} / '
 for o in originals:
  canonical=o.get('editor_source_name',o.name)
  if not canonical.startswith(prefix):continue
  name=canonical[len(prefix):];ref=refs.get(aliases.get(name,name))
  if ref is None or ref.type=='EMPTY':continue
  if o.type!=ref.type:
   # Tire text stays on its existing animated wheel. Its lettering is unchanged.
   assert o.type=='FONT' and ref.type=='MESH',(o.name,o.type,ref.type)
   unchanged_types.append(o.name);continue
  o.data=ref.data
  for m in list(o.modifiers):o.modifiers.remove(m)
  o['exteriorRevision']='realism-v2-preserved-animation'
  rows.append(o.name)
 for chapter in ['01-Grass-delivery-phone','02-Route-equipment-mowing']:
  by_source={o.get('editor_source_name',o.name):o for o in originals if o.get('editor_chapter')==chapter}
  for name,ref in refs.items():
   if not name.startswith('Tread /'):continue
   parent=by_source[prefix+ref.parent.name]
   o=ref.copy();o.animation_data_clear();o.parent=parent;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=ref.matrix_basis.copy();o.name=prefix+name+' / '+chapter
   parent.users_collection[0].objects.link(o);o['editor_chapter']=chapter;o['exteriorRevision']='realism-v2-preserved-animation'
   # Hidden chapter and off-screen trailer decisions follow the same original wheel.
   for prop in ['hide_render','hide_viewport']:
    drv=o.driver_add(prop).driver;drv.type='SCRIPTED';v=drv.variables.new();v.name='hidden';v.type='SINGLE_PROP';v.targets[0].id=parent;v.targets[0].data_path=prop;drv.expression='hidden'
   extras.append(o.name)
 for ref in refs.values():bpy.data.objects.remove(ref,do_unlink=True)
assert animation_hash()==before,'Existing animation changed'
s['exteriorRevision']='realism-v2-preserved-animation';s['recoverySource']=str(SOURCE)
bpy.context.preferences.filepaths.save_version=0;s.frame_set(1948);bpy.ops.file.pack_all();dest=W/'workday-corrected-realism-v2.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
report={'source':str(SOURCE),'output':str(dest),'originalAnimationSHA256':before,'finalOriginalAnimationSHA256':animation_hash(),'replacedMeshCount':len(rows),'preservedTireTextCount':len(unchanged_types),'addedTreads':extras,'sceneCorrections':{k:v for k,v in s.items() if k in ['collection_visibility_repaired','releasePackageFix','releasePhoneFix','grassContactRevision','approvedPackageRevision','neighborhood_route']}}
(W/'workday-recovery-audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
