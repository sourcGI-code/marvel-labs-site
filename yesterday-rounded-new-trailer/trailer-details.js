import * as THREE from './assets/three.module.js';
import {addTrailerFabrication} from './trailer-fabrication.js?v=2';

// Small manufacturing details for the existing supplied trailer, in metres.
// Call after finishTrailer/brandTrailer. Every added mesh belongs directly to
// an existing part so reveal() and the rear ramp hinge keep their own motion.
const VERSION=3;
const domedHead=new THREE.SphereGeometry(1,8,5);
let gripMap,vinylMap;
function finishTexture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
 let seed=kind==='grip'?137:733;
 for(let i=0;i<128*128;i++){
  seed=(1664525*seed+1013904223)>>>0;
  const x=i%128,y=Math.floor(i/128),noise=(seed>>>24)/255;
  // Fine, irregular rubber granules; no large repeated diamond-plate pattern.
  const value=kind==='grip'?Math.round(90+noise*90+18*Math.sin(x*1.7+y*.8)):Math.round(196+noise*18);
  pixels.data.set([value,value,value,255],i*4);
 }
 ctx.putImageData(pixels,0,0);
 const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;
 map.repeat.set(kind==='grip'?18:7,kind==='grip'?12:3);map.colorSpace=THREE.NoColorSpace;
 return map;
}
function rivets(parent,positions,{normal='z',radius=.0045,name='Panel fasteners'}={}){
 if(!positions.length)return null;
 const material=new THREE.MeshPhysicalMaterial({name:'Trailer detail / satin fasteners',color:0xa5afb2,metalness:.92,roughness:.29,envMapIntensity:.9});
 const scale=new THREE.Vector3(radius,radius,.0022);
 if(normal==='x')scale.set(.0022,radius,radius);
 // Merge each part's heads into one ordinary mesh. The film exporter can
 // read the same coordinates directly without special instance handling.
 const source=domedHead.attributes.position,normals=domedHead.attributes.normal,index=domedHead.index;
 const p=new Float32Array(positions.length*source.count*3),n=new Float32Array(p.length),indices=[];
 const vector=new THREE.Vector3();
 positions.forEach((position,head)=>{
  for(let i=0;i<source.count;i++){
   const offset=(head*source.count+i)*3;
   p.set([source.getX(i)*scale.x+position[0],source.getY(i)*scale.y+position[1],source.getZ(i)*scale.z+position[2]],offset);
   vector.set(normals.getX(i)/scale.x,normals.getY(i)/scale.y,normals.getZ(i)/scale.z).normalize();n.set(vector.toArray(),offset);
  }
  for(let i=0;i<index.count;i++)indices.push(index.getX(i)+head*source.count);
 });
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.BufferAttribute(n,3));geometry.setIndex(indices);geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name=name;mesh.userData.trailerDetail=true;mesh.castShadow=false;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
const vertexKey=(x,y,z)=>`${Math.round(x*1e4)},${Math.round(y*1e4)},${Math.round(z*1e4)}`;
function uncoverHardware(part){
 // The source branding pass projects onto every outward triangle, including
 // rails, seams and rivet heads. Remove only those projected hardware triangles.
 const hardware=new Set();
 for(const mesh of part.children){
  if(!mesh.isMesh||mesh.userData.fleetGraphic||mesh.userData.trailerDetail)continue;
  if(!/steel|aluminum|rubber|warm white print|marvel cyan/i.test(mesh.material?.name??''))continue;
  const p=mesh.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++)hardware.add(vertexKey(p.getX(i),p.getY(i),p.getZ(i)));
 }
 let removed=0;
 for(const mesh of [...part.children]){
  if(!mesh.userData.fleetGraphic)continue;
  const geometry=mesh.geometry,p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),keep=[];
  for(let i=0;i<p.count;i+=3){
   let metal=true;
   for(let j=0;j<3;j++){
    const k=i+j;
    if(!hardware.has(vertexKey(p.getX(k)-n.getX(k)*.0035,p.getY(k)-n.getY(k)*.0035,p.getZ(k)-n.getZ(k)*.0035))){metal=false;break;}
   }
   if(metal)removed++;else keep.push(i,i+1,i+2);
  }
  if(keep.length===p.count)continue;
  if(!keep.length){part.remove(mesh);geometry.dispose();mesh.material.dispose();continue;}
  const replacement=new THREE.BufferGeometry();
  for(const [name,attribute] of Object.entries(geometry.attributes)){
   const data=new attribute.array.constructor(keep.length*attribute.itemSize);
   keep.forEach((source,target)=>{for(let k=0;k<attribute.itemSize;k++)data[target*attribute.itemSize+k]=attribute.array[source*attribute.itemSize+k];});
   replacement.setAttribute(name,new THREE.BufferAttribute(data,attribute.itemSize,attribute.normalized));
  }
  replacement.computeBoundingSphere();mesh.geometry=replacement;geometry.dispose();
 }
 return removed;
}
function bodySurface(part,sign){
 let value=1.2075;
 for(const mesh of part.children){
  if(!mesh.isMesh||mesh.userData.fleetGraphic||!/graphite/i.test(mesh.material?.name??''))continue;
  const p=mesh.geometry.getAttribute('position'),n=mesh.geometry.getAttribute('normal');
  for(let i=0;i<p.count;i++)if(n.getZ(i)*sign>.95&&p.getY(i)>.95&&p.getY(i)<2.46)value=Math.max(value,p.getZ(i)*sign);
 }
 return value;
}
function finishExisting(root){
 vinylMap??=finishTexture('vinyl');
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.trailerDetail||!mesh.material)return;
  const old=mesh.material;
  // The old embossed lettering/accent sit in front of the new full wrap.
  // Their projected copies were filtered above; retain only the current art.
  if(/^(Warm white print|Marvel cyan)$/.test(old.name)&&/^(cargo|factory)(Near|Far)$/.test(mesh.parent?.name??'')){mesh.visible=false;return;}
  if(old.name==='Satin aluminum'&&mesh.parent?.name==='cargoNear'){
   mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
   // The source's small "MOBILE PRODUCTION" caption uses the aluminum
   // material too. Identify its actual narrow text band, not any trim.
   if(b.min.y>1.73&&b.max.y<1.79&&b.max.z-b.min.z<.005){mesh.visible=false;return;}
  }
  if(mesh.userData.fleetGraphic){
   const material=new THREE.MeshPhysicalMaterial({name:'Laminated trailer wrap',map:old.map,color:old.color,roughness:.41,roughnessMap:vinylMap,metalness:.04,clearcoat:.42,clearcoatRoughness:.25,envMapIntensity:1,side:old.side,transparent:old.transparent,opacity:old.opacity,alphaTest:old.alphaTest,depthWrite:old.depthWrite,polygonOffset:old.polygonOffset,polygonOffsetFactor:old.polygonOffsetFactor,polygonOffsetUnits:old.polygonOffsetUnits});
   mesh.material=material;material.userData.authoredTrailerFinish=true;
  }else if(/steel|aluminum/i.test(old.name)&&!/black anodized|partition/i.test(old.name)){
   const material=old.clone();material.roughness=.27;material.metalness=.9;material.envMapIntensity=1;
   if('clearcoat' in material)material.clearcoat=.08;
   material.userData.authoredTrailerFinish=true;mesh.material=material;
  }
 });
}

export function addTrailerDetails(model){
 const {root,parts,meta}=model;
 if(root.userData.trailerDetails?.version===VERSION)return root.userData.trailerDetails;
 if(!parts||!meta?.length)throw Error('Trailer details require trailer(feet) result');
 const report={version:VERSION,uncoveredHardwareTriangles:0,addedFasteners:0,addedMeshes:0};
 for(const part of Object.values(parts))report.uncoveredHardwareTriangles+=uncoverHardware(part);
 finishExisting(root);
 const first=-meta.length/2+.64,last=meta.length/2-.20;
 const door=meta.groups.door,hatch=meta.groups.hatch;
 for(const [id,sign] of [['factoryNear',-1],['cargoNear',-1],['factoryFar',1],['cargoFar',1]]){
  const part=parts[id],bounds=meta.groups[id];if(!part||!bounds)continue;
  const positions=[],z=sign*(bodySurface(part,sign)+.009);
  for(let column=0;column<6;column++){
   const x=THREE.MathUtils.lerp(first,last,column/5);
   if(x<bounds.min[0]+.015||x>bounds.max[0]-.015)continue;
   // Original fasteners at y=1.02 and 2.39 remain. Only intermediate heads
   // are missing; avoid the actual moving hatch and service-door openings.
   for(const y of [1.29,1.565,1.84,2.115]){
    const inOpening=sign<0&&[door,hatch].some(b=>b&&x>b.min[0]-.015&&x<b.max[0]+.015&&y>b.min[1]-.015&&y<b.max[1]+.015);
    if(!inOpening)positions.push([x,y,z]);
   }
  }
  if(rivets(part,positions,{name:`${id} / intermediate panel fasteners`}))report.addedMeshes++;
  report.addedFasteners+=positions.length;
 }
 report.fabrication=addTrailerFabrication(model);
 report.addedMeshes+=report.fabrication.addedMeshes;
 report.addedFasteners+=report.fabrication.addedFasteners;
 root.userData.trailerDetails=report;return report;
}

// The cargo/field sequence already creates a rubber ramp face, cross ribs,
// frame and full-width hinge shaft. Enhance them rather than stacking copies.
export function addRampDetails(hinge,{height=1.6805,width=2.25}={}){
 if(hinge.userData.rampDetails?.version===VERSION)return hinge.userData.rampDetails;
 gripMap??=finishTexture('grip');
 let gripFaces=0,ribs=0;
 for(const mesh of hinge.children){
  if(!mesh.isMesh||mesh.userData.trailerDetail)continue;
  const geometry=mesh.geometry;if(!geometry)continue;
  geometry.computeBoundingBox();
  const size=geometry.boundingBox.getSize(new THREE.Vector3());
  if(Math.abs(size.x-.025)<.003&&size.y>1&&size.z>2&&mesh.position.x<0){
   const material=mesh.material.clone();material.name='Trailer detail / bonded non-slip rubber';material.color.setRGB(.007,.008,.009);material.metalness=0;material.roughness=.86;material.bumpMap=gripMap;material.bumpScale=.00065;
   if(!geometry.attributes.uv){
    const p=geometry.attributes.position,uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){uv[i*2]=p.getZ(i)/size.z+.5;uv[i*2+1]=p.getY(i)/size.y+.5;}
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
   }
   mesh.material=material;mesh.receiveShadow=true;gripFaces++;
  }else if(size.x<.012&&size.y<.025&&size.z>2&&mesh.position.x<0){
   const material=mesh.material.clone();material.name='Trailer detail / dark traction ribs';material.color.setRGB(.055,.062,.065);material.metalness=.3;material.roughness=.58;mesh.material=material;ribs++;
  }
 }
 const positions=[];
 if(gripFaces)for(let y=.18;y<height-.10;y+=.26)for(const z of [-width/2-.024,width/2+.024])positions.push([-.036,y,z]);
 rivets(hinge,positions,{normal:'x',radius:.0045,name:'Ramp edge retaining fasteners'});
 const report={version:VERSION,gripFaces,ribs,addedFasteners:positions.length};hinge.userData.rampDetails=report;return report;
}
