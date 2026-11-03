"""Repair the approved intro-derived models without re-encoding their meshes."""
from pathlib import Path
import hashlib,json,struct
SITE=Path(__file__).resolve().parents[1]
SOURCE=SITE/'assets/photographic-reserve-v1'
OUT=SITE/'assets/intro-trailer-master-v1';OUT.mkdir(exist_ok=True)
REV='intro-trailer-master-v1'
meta=json.loads((SOURCE/'viewer.json').read_text());report={}
for feet in (16,20):
 src=SOURCE/f'trailer-{feet}-photographic.glb';raw=src.read_bytes()
 length,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
 doc=json.loads(raw[20:20+length]);tail=raw[20+length:];nodes=doc['nodes']
 byname={n.get('name'):i for i,n in enumerate(nodes)}
 bridge=nodes[byname['Photographic / native alignment']];hinge=nodes[byname['ramp_door']]
 flat_front=bridge['translation'][0]-feet*.3048+.012
 rails=[]
 for n in nodes:
  if not n.get('name','').startswith(('Proof / Roof rail lower gasket','Proof / Lower rail gasket')):continue
  prim=doc['meshes'][n['mesh']]['primitives'][0];acc=doc['accessors'][prim['attributes']['POSITION']]
  lo,hi=acc['min'][0],acc['max'][0];scale=n.setdefault('scale',[1,1,1]);pos=n['translation']
  old_start=pos[0]+lo*scale[0];end=pos[0]+hi*scale[0]
  assert old_start<flat_front<end
  scale[0]=(end-flat_front)/(hi-lo);pos[0]=flat_front-lo*scale[0]
  assert abs(pos[0]+hi*scale[0]-end)<1e-8
  rails.append({'name':n['name'],'oldFront':old_start,'newFront':flat_front,'rear':end})
 assert len(rails)==4
 attached=[]
 for name in ('license_plate_bracket','license_plate_light'):
  i=byname[name];n=nodes[i];assert i in bridge['children'] and 'rotation' not in hinge and 'scale' not in hinge
  before=n.get('translation',[0,0,0]);n['translation']=[a-b for a,b in zip(before,hinge['translation'])]
  assert all(abs(n['translation'][k]+hinge['translation'][k]-before[k])<1e-9 for k in range(3))
  bridge['children'].remove(i);hinge.setdefault('children',[]).append(i);attached.append(name)
 doc.setdefault('asset',{}).setdefault('extras',{}).update(marvelMaster=REV,source='Approved photographic intro trailer',repair='Trim four flat-wall gaskets at V-nose shoulder; attach plate hardware to ramp')
 payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
 result=struct.pack('<III',0x46546c67,2,20+len(payload)+len(tail))+struct.pack('<II',len(payload),0x4e4f534a)+payload+tail
 dest=OUT/f'trailer-{feet}-master.glb';dest.write_bytes(result)
 entry=meta['trailers'][str(feet)];entry.update(file=dest.name,bytes=len(result),revision=REV,masterModel=REV)
 report[str(feet)]={'source':str(src.relative_to(SITE)),'sourceSha256':hashlib.sha256(raw).hexdigest(),'geometryBinaryUnchanged':True,'trimmedRails':rails,'rampAttachments':attached,'outputSha256':hashlib.sha256(result).hexdigest()}
meta['masterModel']=REV;meta['approvedReference']='intro-photographic-v1'
(OUT/'viewer.json').write_text(json.dumps(meta,indent=2)+'\n')
(OUT/'repairs.json').write_text(json.dumps(report,indent=2)+'\n')
print('Repaired 16 ft and 20 ft: four rails per model trimmed; plate and light attached to ramp. Geometry binary unchanged.')
