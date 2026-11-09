import * as THREE from 'three';
import {yardLayout,YARD_MATERIALS,YARD_FOV} from './reserve-yard-layout.js?v=factory-yard-20261108';

export function createFactoryYard(scene,renderer){
 const group=new THREE.Group();group.name='Factory loading yard';
 const materials=Object.fromEntries(Object.entries(YARD_MATERIALS).map(([key,spec])=>[key,new THREE.MeshStandardMaterial(spec)]));
 // Fine aggregate breaks up the asphalt without a large texture download.
 const c=document.createElement('canvas');c.width=c.height=256;
 const ctx=c.getContext('2d'),data=ctx.createImageData(256,256);let seed=7643;
 for(let i=0;i<data.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const v=218+((seed>>>24)%28);data.data.set([v,v,v,255],i);}
 ctx.putImageData(data,0,0);
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(48,48);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 materials.asphalt.map=texture;
 // Repeated ribs, doors and parking marks share draw calls.
 const batches=new Map(),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
 for(const item of yardLayout()){
  const casts=!/line|seam|joint|Asphalt|apron/.test(item.name),key=`${item.type}:${item.material}:${casts}`;
  if(!batches.has(key))batches.set(key,{type:item.type,material:item.material,casts,items:[]});
  batches.get(key).items.push(item);
 }
 for(const {type,material,casts,items} of batches.values()){
  const geometry=type==='box'?new THREE.BoxGeometry(1,1,1):new THREE.CylinderGeometry(1,1,1,12);
  const mesh=new THREE.InstancedMesh(geometry,materials[material],items.length);mesh.name=`Yard ${material}`;
  items.forEach((item,i)=>{position.set(...item.position);scale.set(...(type==='box'?item.size:[item.radius,item.height,item.radius]));matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);});
  mesh.castShadow=casts;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
 }
 scene.add(group);
 const sun=new THREE.DirectionalLight(0xfff0d6,3.1);sun.position.set(-10,18,10);sun.target.position.set(0,0,0);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;sun.shadow.camera.near=.5;sun.shadow.camera.far=80;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;
 scene.add(sun,sun.target);
 return {dispose(){group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of Object.values(materials))m.dispose();texture.dispose();sun.shadow.map?.dispose();scene.remove(group,sun,sun.target);}};
}

// Tight, perspective-correct framing inside the space beside the reservation form.
export function fitYardCamera(bounds,direction,{width,height,left=0,top=95,bottom=160,fov=YARD_FOV}){
 const target=bounds.getCenter(new THREE.Vector3()),dir=direction.clone().normalize();
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right);
 const x0=Math.min(width*.60,left+24),x1=width-28,y0=top+16,y1=Math.max(y0+80,height-bottom);
 const halfX=Math.max(70,(x1-x0)/2),halfY=Math.max(70,(y1-y0)/2),tan=Math.tan(THREE.MathUtils.degToRad(fov)/2);
 let distance=1;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const p=new THREE.Vector3(x,y,z).sub(target),depth=p.dot(dir);
  distance=Math.max(distance,depth+Math.abs(p.dot(right))*height/(2*tan*halfX),depth+Math.abs(p.dot(up))*height/(2*tan*halfY));
 }
 distance*=1.04;
 return {target,position:target.clone().addScaledVector(dir,distance),shiftX:(width-(x0+x1))/(2*width),shiftY:(height-(y0+y1))/(2*height),distance};
}
