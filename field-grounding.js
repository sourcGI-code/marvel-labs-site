import * as THREE from './assets/three.module.js';
import {GLTFLoader} from './assets/GLTFLoader.js';
import {truckSupport} from './studio-grounding.js?v=2';
import {rampContact} from './ramp-contact.js?v=1';

const clamp=x=>Math.max(0,Math.min(1,x));

// This adapter is installed only by the outdoor working-day scene. The studio
// delivery and the shared source GLB keep their own authored staging.
export async function createFieldGrounding(model,scene,truck){
 const base=model.parts.base,floor=model.meta.floorHeight??.8275,road=-.04;
 const truckGround=truckSupport(truck,road);
 model.root.updateMatrixWorld(true);
 const inverse=base.matrixWorld.clone().invert(),point=new THREE.Vector3(),points=[];
 base.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const transform=inverse.clone().multiply(mesh.matrixWorld),positions=mesh.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++)points.push(point.fromBufferAttribute(positions,i).applyMatrix4(transform).clone());
 });
 const tirePoints=points.filter(p=>Math.abs(p.z)>.95&&p.y<.7&&p.x>-.8);
 const tireMin=Math.min(...tirePoints.map(p=>p.y)),drop=tireMin-road,trailerY=-drop;
 if(!Number.isFinite(drop)||drop<.12||drop>.24)throw Error('Unexpected supplied 20-ft tire clearance');
 const towTip=Math.min(...points.filter(p=>Math.abs(p.z)<.20&&p.x<-2.65).map(p=>p.x));
 const seatY=Math.min(...points.filter(p=>p.x<towTip+.08&&Math.abs(p.z)<.15).map(p=>p.y))+.015;
 if(!Number.isFinite(towTip+seatY))throw Error('Supplied coupler could not be located');

 // The lower jack is articulated in this geometry-only derivative. Keeping
 // the existing part object and finished material preserves palette/reveal
 // references and never changes geometry shared by another page or trailer.
 const loaded=await new GLTFLoader().loadAsync('assets/autonomous-trailer/low-ramp-v2/trailer-20-towing-base.glb?v=1');
 let towingBase;
 loaded.scene.traverse(o=>{if(o.userData.field_towing_base)towingBase=o;});
 if(!towingBase||Math.abs(towingBase.userData.tire_min-tireMin)>1e-5)throw Error('Field towing base does not match the supplied trailer');
 base.clear();
 for(const child of [...towingBase.children]){
  child.removeFromParent();base.add(child);
  child.traverse(mesh=>{
   if(!mesh.isMesh)return;
   mesh.material=mesh.material.clone();mesh.castShadow=mesh.receiveShadow=true;
   mesh.userData.suppliedTrailerSurface=true;mesh.userData.fieldTowingDerivative=true;
  });
 }
 // Measure the actual ramp inner face, not the high point of the curved roof.
 let rampTop=-Infinity;
 model.parts.rear.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.userData.suppliedInteriorLiner)return;
  const positions=mesh.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++)rampTop=Math.max(rampTop,positions.getY(i));
 });
 const rampHeight=(Number.isFinite(rampTop)?rampTop:2.508)-floor;
 const rear=model.meta.length/2+.015,worldFloor=floor+trailerY;
 const run=rampContact(model.parts.rear,rear,floor,worldFloor-road).run;
 const support=x=>road+(worldFloor-road)*clamp((rear+run-x)/run);
 if(!Number.isFinite(run))throw Error('The supplied rear ramp cannot reach the road');

 const receiver=truck.root.getObjectByName('Illustrative drop receiver');
 if(!receiver)throw Error('The existing truck receiver is missing');
 const material=new THREE.MeshStandardMaterial({name:'Field receiver / graphite steel',color:0x394146,metalness:.8,roughness:.32});
 const hitch=new THREE.Group();hitch.name='Truck drop hitch / supplied trailer connection';scene.add(hitch);
 const down=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material),arm=down.clone();
 down.name='Receiver vertical drop';arm.name='Lower ball mount';hitch.add(down,arm);
 hitch.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 const seat=new THREE.Vector3(),upper=new THREE.Vector3();
 function draw(travel=0){
  model.root.position.set(travel,trailerY,0);truck.root.position.y=truckGround.y;
  model.root.updateMatrixWorld(true);truck.root.updateMatrixWorld(true);
  base.localToWorld(seat.set(towTip+.035,seatY,0));receiver.getWorldPosition(upper);upper.y=.55+truckGround.y;
  down.position.set(upper.x,(upper.y+seat.y)/2,upper.z);
  down.scale.set(.07,Math.max(.04,upper.y-seat.y),.075);
  arm.position.set((upper.x+seat.x)/2,seat.y-.025,seat.z);
  arm.scale.set(Math.max(.07,Math.abs(seat.x-upper.x)+.09),.05,.075);
 }
 function cameraOffset(interior){return trailerY*clamp(interior.walk??0);}
 model.root.userData.fieldGrounding={tireMin,road,drop,jackRetracted:true};
 return {draw,support,cameraOffset,road,drop,truckY:truckGround.y,trailerY,tireMin,towTip,floor:worldFloor,rampHeight,run,hitch,
  routeOptions:{road,trailerY,rampHeight}};
}
