import * as THREE from './assets/three.module.js';
import {addRampDetails} from './trailer-details.js?v=2';
import {rampContact} from './ramp-contact.js?v=1';
import {trailer,isOpaquePart} from './journey-scene.js?v=25';
import {createJourneyProps} from './journey-props.js?v=5';
import {upgradeEquipment} from './equipment-model.js';
import {roundedBox} from './studio.js';
import {finishTrailer,finishTruck,finishEquipment} from './cinema-light.js?v=12';
import {loadTruck} from './truck-model.js?v=9';
import {prepareStudioModel,truckSupport,continuousStudioRoad,createTruckDropHitch,studioRoad} from './studio-grounding.js?v=2';
import {createCargoPackaging} from './cargo-packaging.js?v=6';
const clamp=v=>Math.max(0,Math.min(1,v));
const ramp=(p,a,b)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
const mix=THREE.MathUtils.lerp;
const v=a=>new THREE.Vector3(...a);

// The opening and this sequence share a renderer, camera and actual 20 ft mesh.
// Only the rear door pivots. A later cargo-roof view leaves the factory sealed.
export async function createCargoSequence({scene,camera,renderer,large,cinematic},ending){
 const [small,delivery]=await Promise.all([trailer(16),loadTruck(renderer)]);scene.add(small.root,delivery.root);small.root.visible=delivery.root.visible=false;
 await finishTruck(delivery.root,renderer);
 const vehicleRear=new THREE.Box3().setFromObject(delivery.root).max.x;
 const largeSupport=await prepareStudioModel(large,20),smallSupport=await prepareStudioModel(small,16),truckGround=truckSupport(delivery);
 const hitchOffset=-smallSupport.tip+vehicleRear+.14;
 createTruckDropHitch(delivery,v([hitchOffset+smallSupport.tip+.035*.8,smallSupport.y+smallSupport.seat-truckGround.y,0]));
 const deliveryWheels=Object.entries(delivery.meta.groups).filter(([,g])=>g.wheel).map(([id,g])=>({object:delivery.groups[id],radius:g.radius}));
 const stand=new THREE.Group();scene.add(stand);
 const standMetal=new THREE.MeshStandardMaterial({color:0x8d9695,metalness:.8,roughness:.3});
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.56,16),standMetal);shaft.position.y=.28;stand.add(shaft);
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.025,24),standMetal);foot.position.y=.013;stand.add(foot);
 const coupling=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.32,16),standMetal);coupling.rotation.z=Math.PI/2;scene.add(coupling);
 const ground=continuousStudioRoad(scene);
 if(cinematic)await finishTrailer(small.root,renderer,small);
 const props=createJourneyProps(),models=[large,small],anchor=ending.trailerPosition[0];
 await upgradeEquipment(props);
 await finishEquipment([props.zeroTurn,props.pushMower,props.trimmers],renderer);
 const accent=new THREE.LineBasicMaterial({color:0x4dd8e8,transparent:true,opacity:.7});
 const tint=new THREE.MeshBasicMaterial({color:0x4dd8e8,transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide});
 const silver=new THREE.MeshStandardMaterial({color:0x7d9198,metalness:.75,roughness:.32});
 const rubber=new THREE.MeshStandardMaterial({color:0x303b3d,roughness:.8});
 const assemblies=[];
 function line(parent,points,material=accent){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(v)),material);parent.add(o);return o;}
 function box(parent,size,at,material){const o=new THREE.Mesh(roundedBox(...size),material);o.position.set(...at);parent.add(o);return o;}
 for(const model of models){
  const rear=model.meta.length/2+.015,floor=model.meta.floorHeight??.8275;
  let rampTop=-Infinity;model.parts.rear.traverse(mesh=>{if(!mesh.isMesh||!mesh.userData.suppliedInteriorLiner)return;const positions=mesh.geometry.getAttribute('position');for(let i=0;i<positions.count;i++)rampTop=Math.max(rampTop,positions.getY(i));});
  const height=(Number.isFinite(rampTop)?rampTop:(model.meta.bodyTop??2.555)-.047)-floor;
  const support=model===large?largeSupport:smallSupport,contact=rampContact(model.parts.rear,rear,floor,floor-support.tireMin);
  const hinge=new THREE.Group();hinge.position.set(rear,floor,0);model.root.add(hinge);
  model.root.remove(model.parts.rear);hinge.add(model.parts.rear);model.parts.rear.position.set(-rear,-floor,0);
  // Permanent door jambs and a non-slip inner face travel with the bottom hinge.
  const extras=new THREE.Group();model.root.add(extras);
  if(!model.root.userData.suppliedTrailer){
  for(const z of [-1.19,1.19])box(extras,[.075,1.7,.065],[rear,1.68,z],silver);
  box(extras,[.075,.065,2.42],[rear,2.53,0],silver);
  box(hinge,[.025,height-.09,2.25],[-.048,height/2,0],rubber);
  for(let y=.09;y<height-.03;y+=.14)box(hinge,[.009,.014,2.17],[-.065,y,0],silver);
  addRampDetails(hinge,{height,width:2.25});
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.35,16),silver);axle.rotation.x=Math.PI/2;axle.position.set(rear,floor,0);extras.add(axle);
  }
  const cables=[-1.10,1.10].map(z=>line(extras,[[rear,2.42,z],[rear,2.42,z]],new THREE.LineBasicMaterial({color:0x8a999e})));
  const measures=new THREE.Group();model.root.add(measures);
  const front=-model.meta.length/2,wall=model.meta.partitionX;
  const badgeCanvas=document.createElement('canvas');badgeCanvas.width=1024;badgeCanvas.height=384;
  const ctx=badgeCanvas.getContext('2d');ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='90px Arial';ctx.fillText('8 FT',512,150);ctx.font='42px Arial';ctx.fillText('ENCLOSED MICROFACTORY',512,240);
  const badgeTexture=new THREE.CanvasTexture(badgeCanvas);badgeTexture.colorSpace=THREE.SRGBColorSpace;
  const badge=new THREE.Mesh(new THREE.PlaneGeometry(1.75,.66),new THREE.MeshBasicMaterial({map:badgeTexture,color:0x4dd8e8,transparent:true,depthWrite:false}));
  badge.rotation.x=-Math.PI/2;badge.position.set((front+wall)/2,2.565,0);measures.add(badge);
  line(measures,[[front,2.67,0],[wall,2.67,0]]);
  for(const x of [front,wall])line(measures,[[x,2.67,-.16],[x,2.67,.16]]);
  line(measures,[[wall+.06,floor+.025,-1.08],[rear-.07,floor+.025,-1.08]]);
  for(const x of [wall+.06,rear-.07])line(measures,[[x,floor+.025,-.96],[x,floor+.025,-1.16]]);
  const loads=new THREE.Group();model.root.add(loads);
  const start=wall+.08;
  const items=[props.zeroTurn.clone(true),props.pushMower.clone(true),props.trimmers.clone(true)];
  if(model===small)items[0].scale.setScalar(.8);
  items.forEach(o=>loads.add(o));
  const destinations=model===large?[[start+2.08,floor,-.28],[start+2.70,floor,.68],[rear-.65,floor-.04,1.00]]:[[start+1.20,floor,-.224],[start+.65,floor,.73],[rear-.65,floor-.04,1.00]];
  const extra=new THREE.Group();model.root.add(extra);
  if(model===large){
   const x=rear-.66;
   const patch=new THREE.Mesh(new THREE.PlaneGeometry(1.2192,2.13),tint);patch.rotation.x=-Math.PI/2;patch.position.set(x,floor+.016,0);extra.add(patch);
   line(extra,[[rear-1.25,floor+.025,-1.07],[rear-1.25,floor+.025,1.07],[rear-.06,floor+.025,1.07],[rear-.06,floor+.025,-1.07],[rear-1.25,floor+.025,-1.07]]);
  }
  assemblies.push({support,contact,model,hinge,extras,cables,measures,badge,loads,items,destinations,extra,rear,floor,height});
 }
 const packaging=createCargoPackaging(large,props);
 function opacity(group,value){group.visible=value>.001;group.traverse(o=>{if(o.material){o.material.opacity=value;o.material.transparent=value<.999;o.material.depthWrite=value>.95;}});}
 function reset(){
  small.root.visible=delivery.root.visible=stand.visible=coupling.visible=false;ground.visible=true;
  packaging.reset();
  for(const a of assemblies){a.hinge.rotation.z=0;a.measures.visible=a.loads.visible=a.extra.visible=false;a.extras.visible=true;a.cables.forEach(c=>c.visible=false);opacity(a.model.parts.cargoRoof,1);}
 }
 reset();
 function draw(p,width,height){
  p=clamp(p);const mobile=width<700,startFov=camera.fov,startOffset=camera.view?.offsetY/height||0,startPosition=camera.position.clone(),startQuaternion=camera.quaternion.clone();
  const arrival=ramp(p,.06,.29),detach=ramp(p,.32,.39),departure=ramp(p,.40,.50),wide=ramp(p,.39,.55);
  const orbit=ramp(p,0,.12),rearFocus=ramp(p,.50,.59),open=ramp(p,.57,.635),overhead=ramp(p,.71,.835),inspect=ramp(p,.735,.81),compared=p>=.39&&p<.52;
  // Every tire and deployed jack shares the same physical studio road.
  // The original trailer stays parked. A second complete rig arrives on a
  // separate lane, lowers its tongue jack, uncouples, and drives away.
  large.root.position.set(ending.towOffset,largeSupport.y,0);largeSupport.jack(1);smallSupport.jack(detach);
  const parkedX=anchor+1.8,smallZ=-5.7,deliveryX=parkedX+34*(1-arrival);
  small.root.position.set(deliveryX,smallSupport.y,smallZ);small.root.rotation.set(0,0,0);
  small.root.visible=p>=.025&&rearFocus<1;small.root.scale.setScalar(1);
  delivery.root.position.set(deliveryX-hitchOffset-30*departure,truckGround.y,smallZ);
  delivery.root.rotation.set(0,0,0);delivery.root.visible=p>=.025&&departure<.999;
  deliveryWheels.forEach(({object,radius})=>object.rotation.z=(34*arrival+30*departure)/radius);
  stand.visible=false;stand.position.set(parkedX+small.meta.groups.base.min[0]+.35,.56*(1-detach),smallZ);stand.scale.y=Math.max(.01,detach);
  coupling.position.set(deliveryX+small.meta.groups.base.min[0]-.06,.55,smallZ);coupling.visible=false;
  ground.visible=true;
  for(const a of assemblies){
   const rise=a.floor-a.support.tireMin;
   a.hinge.rotation.z=a.contact.angle*open;
   a.cables.forEach((c,i)=>{const z=i===0?-1.10:1.10;
    const tip=v([0,a.height*.85,z]).applyAxisAngle(new THREE.Vector3(0,0,1),a.hinge.rotation.z).add(a.hinge.position);
    const arr=c.geometry.attributes.position;arr.setXYZ(0,a.rear,2.42,z);arr.setXYZ(1,tip.x,tip.y,tip.z);arr.needsUpdate=true;c.geometry.computeBoundingSphere();c.visible=open>.01;
   });
   opacity(a.model.parts.cargoRoof,a.model===large?1-inspect:1);
   a.measures.visible=a.extra.visible=false;a.loads.visible=p>=.56;
   a.items.forEach((o,i)=>{const unload=i<2?ramp(p,.72+i*.025,.795+i*.025):0,[x,y,z]=a.destinations[i];
    const oldRun=Math.sqrt(a.height*a.height-a.floor*a.floor),run=a.contact.run,cx=mix(x,a.rear+oldRun+3,unload),climb=clamp((a.rear+run-cx)/run);
    o.visible=unload<.999;o.position.set(cx,i<2?studioRoad-a.support.y+rise*climb:y,z);
    o.rotation.set(0,0,i<2?-Math.atan2(rise,run)*ramp(climb,0,.18)*(1-ramp(climb,.8,1)):0);
    o.traverse(part=>{if(part.userData.wheelRadius)part.rotation.z=(x-cx)/part.userData.wheelRadius;});
   });
  }
  const packagingState=packaging.draw(p);
  const target=v([anchor+wide*.9,1.35,-2.5*wide]);
  const closeEye=v([anchor+13,7,-12]),wideEye=v([anchor+17,12,-17]);
  const eye=closeEye.lerp(wideEye,wide);
  if(mobile){eye.set(anchor+21+wide*3,19+wide*5,-17-wide*4);target.set(anchor+wide*.9,1.3,-2.5*wide);}
  const aspect=width/height,rearTarget=v([anchor+1,1.55,0]);
  const rearDistance=Math.max(7.8,4.65/aspect),rearEye=v([anchor+3.05+rearDistance,2.55,0]);
  eye.lerp(rearEye,rearFocus);target.lerp(rearTarget,rearFocus);
  // Rise in the same vertical plane; a tiny X offset avoids the top-view pole.
  const topTarget=v([anchor+.55,.9,0]),topDistance=mobile?17.8:14.4;
  const topEye=topTarget.clone().add(v([.001,topDistance,0]));
  eye.lerp(topEye,overhead);target.lerp(topTarget,overhead);
  const rackFocus=ramp(p,.855,.89);
  const rackTarget=v([anchor+large.meta.partitionX+.65,1.65,0]);
  const rackEye=rackTarget.clone().add(v([2.05,2.35,-.15]).multiplyScalar(mobile?2.85:1.8));
  eye.lerp(rackEye,rackFocus);target.lerp(rackTarget,rackFocus);
  const cameraY=largeSupport.y-.35*(1-ramp(p,0,.10));eye.y+=cameraY;target.y+=cameraY;
  camera.position.copy(startPosition).lerp(eye,orbit);camera.lookAt(target);const targetQuaternion=camera.quaternion.clone();camera.quaternion.copy(startQuaternion).slerp(targetQuaternion,orbit);camera.fov=mix(mix(startFov,mobile?52:46,orbit),38,rearFocus);
  const shiftX=mobile?0:.18*rearFocus,shiftY=mix(mobile?.09:.065,mobile?.115:.025,rearFocus);
  camera.setViewOffset(width,height,-width*shiftX,height*mix(startOffset,-shiftY,orbit),width,height);camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);renderer.render(scene,camera);
  const labels=[];
  if(compared){
   for(const [i,a] of assemblies.entries()){
    const point=a.model.root.localToWorld(v([-.1,2.85,0])).project(camera);
    labels.push({id:i?'small':'large',x:(point.x*.5+.5)*width,y:(.5-point.y*.5)*height});
   }
  }
  return {p,split:compared?1:0,arrival,detach,departure,rearFocus,overhead,packaging:packagingState,deliveryAttached:p<.37,deliveryVisible:delivery.root.visible,deliveryPosition:delivery.root.position.toArray(),smallPosition:small.root.position.toArray(),largePosition:large.root.getWorldPosition(new THREE.Vector3()).toArray(),open,inspect,labels,cargoFeet:[12,8],factoryFeet:8,ramps:assemblies.map(a=>a.hinge.rotation.z),factoryClosed:models.every(model=>['factoryNear','factoryFar','factoryRoof','front','partition','hatchBacking'].every(k=>isOpaquePart(model.parts[k]))),loadoutCount:assemblies.map(a=>a.items.filter(o=>o.visible).length),cameraPosition:camera.position.toArray(),cameraTarget:target.toArray()};
 }
 function setPalette(color){packaging.setPalette(color);accent.color.set(color);tint.color.set(color);assemblies.forEach(a=>a.badge.material.color.set(color));models.forEach(model=>model.root.traverse(o=>{if(o.material?.name==='Marvel cyan'||o.material?.name==='journey-cyan')o.material.color.set(color);}));}
 return {draw,reset,setPalette,inspect:()=>({equipmentAsset:props.pushMower.userData.asset||'illustration',models:models.map(m=>({feet:m===large?20:16,partition:m.meta.partitionX,length:m.meta.length}))})};
}
