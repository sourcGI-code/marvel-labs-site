"""Extract phone crop anchors from the corrected animation; no frames are rendered."""
import bpy, json, sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

scene = bpy.context.scene
actor = bpy.data.objects['Operator MX / Ch17_Vest']
carton = bpy.data.objects['Claude operator / sealed product carton']
segments = []
for start, end, operator in [(0, 299, True), (624, 803, False), (804, 1133, False)]:
    points = []
    for frame in sorted(set(range(start, end + 1, 12)) | {end}):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        def project(obj):
            evaluated = obj.evaluated_get(graph)
            centre = sum((Vector(c) for c in evaluated.bound_box), Vector()) / 8
            return world_to_camera_view(scene, scene.camera, evaluated.matrix_world @ centre)
        person, box = project(actor), project(carton)
        x = person.x + (.06 if operator else 0)
        if not operator and not carton.hide_render and box.z > 0 and abs(box.x-person.x) < .2:
            x = (person.x+box.x)/2
        points.append([frame, round(max(.15, min(.85, x)), 5)])
    segments.append({'start': start, 'end': end, 'points': points})
output = Path(sys.argv[sys.argv.index('--') + 1])
output.write_text('// Projected from the corrected workday camera and operator. Generated without rendering.\n'
                  + 'export const workdaySubjects = ' + json.dumps(segments, separators=(',', ':')) + ';\n')
print('Saved', output, sum(len(s['points']) for s in segments), 'camera anchors')
