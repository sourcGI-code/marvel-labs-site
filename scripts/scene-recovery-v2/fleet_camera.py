"""Move the 20 ft trailer up/left in the final composition through a gentle camera orbit.
The trailers stay parked and the incoming truck, hitch and tire tracks remain unchanged.
"""
import bpy,json,math
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view

def adjust(ns,index,out):
 scene=ns['scene'];camera=scene.camera;rigs=ns.get('_shared_trailers') or ns['ns']['_shared_trailers']
 u=max(0,min(1,(index-270)/240));u=u*u*(3-2*u)
 original=camera.matrix_world.copy()
 width,height=ns.get('recoveryViewport',(1600,1000));shift=ns.get('recoveryShift',(-55,-30))
 def point(size,z=1.5):
  t=rigs[size];return t.base.matrix_world@Vector((t.rear-size*.3048/2,0,t.ground+z))
 pivot=point(16);large=point(20)
 def project():
  bpy.context.view_layer.update();p=world_to_camera_view(scene,camera,large);return Vector((p.x*width,(1-p.y)*height))
 start=project();goal=start+Vector((shift[0]*u,shift[1]*u));right=original.to_3x3().col[0].normalized();angles=Vector((0.,0.))
 def place(a):
  rotation=Matrix.Rotation(a[0],4,'Z')@Matrix.Rotation(a[1],4,right)
  camera.matrix_world=Matrix.Translation(pivot)@rotation@Matrix.Translation(-pivot)@original
 for _ in range(6):
  place(angles);p=project();error=goal-p
  if error.length<.02:break
  columns=[]
  for j in range(2):
   a=angles.copy();a[j]+=.0001;place(a);columns.append((project()-p)/.0001)
  jac=Matrix(((columns[0].x,columns[1].x),(columns[0].y,columns[1].y)))
  angles+=jac.inverted()@error
  assert max(abs(x) for x in angles)<.4,('Camera orbit unexpectedly large',index,list(angles))
 place(angles);end=project()
 ns['_shared_labels'](ns.get('ns',ns),index)
 (out/f'{index:05}.layout-recovery.json').write_text(json.dumps({'frame':index,'cameraOrbitRadians':list(angles),'twentyNativePixelShift':list(end-start),'sixteenAnchorPreserved':True,'originalActorAnimationUnchanged':True}))
