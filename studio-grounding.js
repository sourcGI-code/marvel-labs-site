import * as THREE from './assets/three.module.js';
import {GLTFLoader} from './assets/GLTFLoader.js';

export const studioRoad=-.025;
const clamp=x=>Math.max(0,Math.min(1,x));
let towingAsset;

export function truckSupport(truck,road=studioRoad){
 truck.root.updateMatrixWorld(true);
 const inverse=truck.root.matrixWorld.clone().invert(),point=new THREE.Vector3();
 let minimum=Infinity;
 truck.root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.name.includes('Tire /'))return;
  const transform=inverse.clone().multiply(mesh.matrixWorld),positions=mesh.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++)minimum=Math.min(minimum,point.fromBufferAttribute(positions,i).applyMatrix4(transform).y);
 });
 // The fallback covers renderer-only inspection stubs without truck geometry.
 if(!Number.isFinite(minimum))minimum=-.000006198883056640625;
 return {tireMin:minimum,y:road-minimum};
}

export async function prepareStudioModel(model,feet){
 if(model.physicalSupport)return model.physicalSupport;
 const base=model.parts.base,ratio=feet/20,point=new THREE.Vector3(),points=[];
 model.root.updateMatrixWorld(true);
 const inverse=base.matrixWorld.clone().invert();
 base.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const matrix=inverse.clone().multiply(mesh.matrixWorld),positions=mesh.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++)points.push(point.fromBufferAttribute(positions,i).applyMatrix4(matrix).clone());
 });
 const tireMin=Math.min(...points.filter(p=>Math.abs(p.z)>.95*ratio&&p.y<.7*ratio&&p.x>-.8*ratio).map(p=>p.y));
 const tip=Math.min(...points.filter(p=>Math.abs(p.z)<.2*ratio&&p.x<-2.65*ratio).map(p=>p.x));
 const seat=Math.min(...points.filter(p=>p.x<tip+.08*ratio&&Math.abs(p.z)<.15*ratio).map(p=>p.y))+.015*ratio;
 if(!Number.isFinite(tireMin+tip+seat))throw Error('Supplied tire/hitch support could not be measured');
 towingAsset??=new GLTFLoader().loadAsync('assets/autonomous-trailer/low-ramp-v2/trailer-20-towing-base.glb?v=1');
 const source=(await towingAsset).scene.clone(true);let towingBase;
 source.traverse(o=>{if(o.userData.field_towing_base)towingBase=o;});
 if(!towingBase||Math.abs(towingBase.userData.tire_min*ratio-tireMin)>1e-5)throw Error('Supplied towing base proportions do not match');
 base.clear();
 const scaled=new THREE.Group();scaled.name='Uniform supplied running gear';scaled.scale.setScalar(ratio);base.add(scaled);
 const legs=[];
 for(const child of [...towingBase.children]){
  child.removeFromParent();scaled.add(child);
  child.traverse(mesh=>{
   if(mesh.name.includes('retracted'))legs.push({object:mesh,originalY:mesh.position.y});
   if(!mesh.isMesh)return;
   mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone();
   mesh.castShadow=mesh.receiveShadow=true;mesh.userData.suppliedTrailerSurface=true;
  });
 }
 if(legs.length!==1)throw Error('Supplied lower jack articulation is missing');
 const y=studioRoad-tireMin;
 model.root.updateMatrixWorld(true);const localInverse=base.matrixWorld.clone().invert();
 let initialFoot=Infinity;for(const {object} of legs){const transform=localInverse.clone().multiply(object.matrixWorld),positions=object.geometry.getAttribute('position');for(let i=0;i<positions.count;i++)initialFoot=Math.min(initialFoot,point.fromBufferAttribute(positions,i).applyMatrix4(transform).y);}
 function jack(deployed=1){
  // The same 20-ft geometry receives one uniform scale for each nominal size.
  // Only the telescoping lower jack leg moves within that immutable shell.
  const amount=(tireMin+.12*(1-clamp(deployed))-initialFoot)/ratio;
  for(const {object,originalY} of legs)object.position.y=originalY+amount;
 }
 jack(1);
 model.physicalSupport={tireMin,y,road:studioRoad,tip,seat,jack,legs,
  towCorrection:tip-({16:-3.562419891357422,20:-4.172019958496094}[feet])};
 return model.physicalSupport;
}

export function continuousStudioRoad(scene){
 let floor=scene.getObjectByName('Continuous physical studio road');
 if(!floor){
  floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:0x101517,roughness:.55,metalness:0}));
  floor.name='Continuous physical studio road';floor.rotation.x=-Math.PI/2;floor.position.y=studioRoad;floor.receiveShadow=true;scene.add(floor);
 }
 return floor;
}

export function createTruckDropHitch(truck,seatLocal){
 const root=new THREE.Group();root.name='Physical drop hitch / supplied trailer';truck.root.add(root);
 const material=new THREE.MeshStandardMaterial({color:0x394146,metalness:.8,roughness:.32});
 const upper=new THREE.Vector3((truck.meta?.rear?.[0]??2.9)+.12,.55,0),seat=seatLocal.clone();
 const down=new THREE.Mesh(new THREE.BoxGeometry(.07,Math.max(.04,upper.y-seat.y),.075),material);
 down.position.set(upper.x,(upper.y+seat.y)/2,upper.z);
 const arm=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.07,Math.abs(seat.x-upper.x)+.09),.05,.075),material);
 arm.position.set((upper.x+seat.x)/2,seat.y-.025,seat.z);root.add(down,arm);
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 return root;
}
