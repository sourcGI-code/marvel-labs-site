import {suppliedTrailerParts} from './supplied-trailer-body.js?v=11';
import * as THREE from './assets/three.module.js';
import {packedBuffer} from './packed-assets.js';
import {studioLight, roundedBox} from './studio.js';
import {createJourneyProps} from './journey-props.js?v=5';
import {upgradeEquipment} from './equipment-model.js';
import {createBiomassSpecimens} from './journey-biomass.js?v=2';
import {cinemaLight,finishTrailer,finishEquipment} from './cinema-light.js?v=12';
import {loadTruck} from './truck-model.js?v=9';

export const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
export const phase = (p,a,b) => clamp((p-a)/(b-a));
const ease = v => {v=clamp(v);return v*v*(3-2*v);};
const ramp = (p,a,b) => ease(phase(p,a,b));
const mix = THREE.MathUtils.lerp;
const vec = a => new THREE.Vector3(...a);
const palettes = {charcoal:['#0a0e10','#4dd8e8'],ivory:['#e9e7df','#356b50'],burgundy:['#291319','#ff7866'],midnight:['#101827','#d2ed70']};

export function isOpaquePart(part){let opaque=part.visible;part.traverse(o=>{if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material])opaque=opaque&&material.opacity===1;});return opaque;}

function interiorFloor(geometry,front){
 const source=geometry.toNonIndexed(),positions=source.getAttribute('position'),normals=source.getAttribute('normal'),p=[],n=[];
 for(let i=0;i<positions.count;i+=3){
  let polygon=[0,1,2].map(j=>({p:new THREE.Vector3().fromBufferAttribute(positions,i+j),n:new THREE.Vector3().fromBufferAttribute(normals,i+j)}));
  const clipped=[];
  for(let j=0;j<polygon.length;j++){
   const a=polygon[j],b=polygon[(j+1)%polygon.length],insideA=a.p.x>=front,insideB=b.p.x>=front;
   if(insideA)clipped.push(a);
   if(insideA!==insideB){const t=(front-a.p.x)/(b.p.x-a.p.x);clipped.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize()});}
  }
  for(let j=1;j<clipped.length-1;j++)for(const v of [clipped[0],clipped[j],clipped[j+1]]){p.push(...v.p.toArray());n.push(...v.n.toArray());}
 }
 source.dispose();geometry.dispose();
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(p,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));return result;
}

export async function trailer(feet){
 const [meta,data]=await Promise.all([
  fetch(`assets/journey/trailer-${feet}.json`).then(r=>{if(!r.ok)throw Error('Trailer manifest could not load');return r.json();}),
  packedBuffer(`assets/journey/trailer-${feet}.bin`)
 ]);
 const root=new THREE.Group(), parts=await suppliedTrailerParts(feet);root.name=`${feet} foot supplied autonomous trailer`;root.userData.suppliedTrailer=true;root.userData.sourceAsset='autonomous trailer 3d model.glb';
 for(const part of Object.values(parts))root.add(part);
 for(const group of Object.keys(meta.groups)){if(!parts[group]){parts[group]=new THREE.Group();parts[group].name=group;root.add(parts[group]);}}
 meta.source='autonomous trailer 3d model.glb — exact proportions, uniform visual scale';
 meta.floorHeight=parts.rear.userData.floorHeight??.8275*(feet/20);meta.bodyTop=parts.rear.userData.rampTop??2.555*(feet/20);
 const partitionShift=-meta.length/2+8*.3048-meta.partitionX;
 meta.partitionX+=partitionShift;meta.factoryFeet=8;meta.cargoFeet=feet-8;
 const suppliedBounds=new THREE.Box3().setFromObject(parts.base);meta.groups.base.min=suppliedBounds.min.toArray();meta.groups.base.max=suppliedBounds.max.toArray();
 for(const {group,material,offset,count,indices} of meta.meshes){
  // Retain the existing interior and partition only. Every visible
  // outer shell, roof, ramp, trim and wheel comes from the user's supplied GLB.
  if(!['deck','partition'].includes(group))continue;
  if(!parts[group]){parts[group]=new THREE.Group();parts[group].name=group;root.add(parts[group]);}
  let g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(data,offset,count*3),3));
  g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(data,offset+count*12,count*3),3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(data,offset+count*24,indices),1));
  const uniformScale=(2.555/.42196655)*(feet/20);
  g.scale(1,feet/20,uniformScale*.4187/2.4384);
  const oldFloor=.8275*(feet/20),drop=meta.floorHeight-oldFloor,top=2.49*(feet/20);
  if(group==='deck')g.translate(0,drop,0);
  else if(group==='partition'){g.translate(0,-top,0);g.scale(1,(top-meta.floorHeight)/(top-oldFloor),1);g.translate(partitionShift,top,0);}
  if(group==='deck')g=interiorFloor(g,feet*.3048/2-.4782*uniformScale-.28*uniformScale);
  g.computeBoundingSphere();
  const m=meta.materials[material];
  const mat=new THREE.MeshStandardMaterial({color:new THREE.Color(...m.color),metalness:m.metalness,roughness:m.roughness,side:THREE.DoubleSide});
  mat.name=material;const mesh=new THREE.Mesh(g,mat);parts[group].add(mesh);
 }
 function reveal(v){
  for(const [id,g] of Object.entries(parts)){
   g.position.set(0,0,0);let alpha=1;
   if(id==='cargoRoof'){g.position.y=v*1.6;alpha=1-ease(phase(v,.45,1));}
   if(id==='cargoNear'||id==='door'){g.position.z=-v*1.3;g.position.y=v*.25;alpha=1-ease(phase(v,.3,.9));}
   if(id==='cargoFar'){g.position.z=v*.3;alpha=1-v*.45;}
   if(id==='rear'){g.position.x=v*.5;alpha=1-v*.9;}
   g.visible=alpha>.005;g.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){material.opacity=alpha;material.transparent=alpha<.999;material.depthWrite=alpha>.95;}});
  }
 }
 return {root,parts,meta,reveal};
}

// All motion is a pure function of the playhead: seeking and reverse scrolling
// use the same geometry, camera, and hinged parts as forward playback.
export async function createJourney(canvas,onStatus=()=>{},{cinematic=false}={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
 const scene=new THREE.Scene();scene.background=new THREE.Color(palettes.charcoal[0]);
 const camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,180);
 if(cinematic){renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.04;cinemaLight(scene,renderer);}else studioLight(scene,renderer);
 onStatus('Loading the revised 20 ft and 16 ft trailers');
 const [large,small]=await Promise.all([trailer(20),trailer(16)]);scene.add(large.root,small.root);
 if(cinematic)await Promise.all([finishTrailer(large.root,renderer,large),finishTrailer(small.root,renderer,small)]);
 onStatus('Preparing the equipment and seaweed sink');
 const props=createJourneyProps(), biomass=cinematic?{}:await createBiomassSpecimens(renderer);
 await upgradeEquipment(props);
 await finishEquipment([props.zeroTurn,props.pushMower,props.trimmers],renderer);
 let towOffset=7.07,wheelRadii=[];
 // Retained full-journey previews use the same supplied tow vehicle. The
 // cinematic field scene installs its own truck and never draws this prop.
 if(!cinematic){
  const vehicle=await loadTruck(renderer);
  props.truck=vehicle.root;
  const rear=new THREE.Box3().setFromObject(vehicle.root).max.x;
  towOffset=4.172+.14+rear;
  const wheelGroups=Object.entries(vehicle.meta.groups).filter(([,g])=>g.wheel);
  props.truckWheels=wheelGroups.map(([id])=>vehicle.groups[id]);wheelRadii=wheelGroups.map(([,g])=>g.radius);
  const coupling=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.5,12),new THREE.MeshStandardMaterial({color:0x59666b,metalness:.8,roughness:.3}));
  coupling.rotation.z=Math.PI/2;coupling.position.set(rear+.13,.55,0);props.truck.add(coupling);
 }
 // The retired exterior conveyor is never attached to a website scene.
 // The active flow receives output inside, directly on the partition storage.
 props.conveyor.visible=false;
 scene.add(props.truck,props.sink,props.carton,props.rack);
 Object.values(biomass).forEach(o=>scene.add(o));
 const largeLoad=new THREE.Group(),smallLoad=new THREE.Group();large.root.add(largeLoad);small.root.add(smallLoad);
 const cargoItems=[];
 for(const [model,load] of [[large,largeLoad],[small,smallLoad]]){
  const start=model.meta.partitionX+.06;
  [props.zeroTurn,props.pushMower,props.trimmers].forEach((source,i)=>{
   const o=source.clone(true);load.add(o);
   const x=i===0?start+1.22:i===1?model.meta.length/2-.48:start+.55;
   const z=i===0?(model===small?-.208:-.26):i===1?.78:.96;
   o.userData.mowerFitScale=i===0&&model===small?.8:1;
   o.userData.destination=[x,model.meta.floorHeight+.0025,z];if(i===1)o.rotation.y=Math.PI;
   cargoItems.push({o,index:i});
  });
 }
 const sensors=[];
 for(const model of [large,small]){
  const c=props.cameras.clone(true);c.position.set(model.meta.partitionX-.35,2.40,-1.30);model.root.add(c);
  const r=props.rtk.clone(true);r.position.set(model.meta.partitionX-.9,2.57,.25);model.root.add(r);sensors.push({c,r});
 }
 const accent=new THREE.MeshBasicMaterial({color:palettes.charcoal[1],transparent:true,opacity:.8,depthWrite:false});
 const faint=new THREE.LineBasicMaterial({color:palettes.charcoal[1],transparent:true,opacity:.18});
 const bright=new THREE.LineBasicMaterial({color:palettes.charcoal[1],transparent:true,opacity:.65});
 const field=new THREE.Group();scene.add(field);
 function line(points,mat=bright,parent=field){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(vec)),mat);parent.add(o);return o;}
 const fieldY=-.22;
 for(let i=-5;i<=5;i++){
  line([[-7,fieldY,-3+i*.7],[7,fieldY,-3+i*.7]],faint);
  line([[i*1.4,fieldY,-6.5],[i*1.4,fieldY,.5]],faint);
 }
 const boundary=[[-4,fieldY,-6],[4,fieldY,-6],[5,fieldY,-4],[4,fieldY,-1.2],[-4.5,fieldY,-1.2],[-4,fieldY,-6]];line(boundary);
 const routePoints=[[-3.8,fieldY+.02,-5.5],[3.8,fieldY+.02,-5.5],[3.8,fieldY+.02,-4.8],[-3.7,fieldY+.02,-4.8],[-3.7,fieldY+.02,-4.1],[3.5,fieldY+.02,-4.1],[3.5,fieldY+.02,-3.4],[-3.5,fieldY+.02,-3.4],[-3.5,fieldY+.02,-2.7],[3.2,fieldY+.02,-2.7]];
 const route=line(routePoints);const routeDot=new THREE.Mesh(new THREE.SphereGeometry(.08,16,10),accent);field.add(routeDot);
 const scan=new THREE.Group();large.root.add(scan);const eye=[large.meta.partitionX-.35,2.40,-1.35];
 const corners=[[-3,-.15,-5.7],[2.8,-.15,-5.7],[2.8,-.15,-2.6],[-3,-.15,-2.6]];
 corners.forEach(c=>line([eye,c],faint,scan));line([...corners,corners[0]],bright,scan);
 const sweep=line([[-3,0,-4],[2.8,0,-4]],bright,scan);
 const detections=new THREE.Group();scan.add(detections);
 for(const [x,z,w,d] of [[-1.9,-4.3,.7,.6],[1.4,-3.6,1,.8],[.2,-5.1,.6,.6]]){
  const g=new THREE.BoxGeometry(w,.6,d),edge=new THREE.LineSegments(new THREE.EdgesGeometry(g),bright);edge.position.set(x,.15,z);detections.add(edge);g.dispose();
 }
 const rings=new THREE.Group();large.root.add(rings);
 for(let i=0;i<3;i++){
  const points=Array.from({length:97},(_,j)=>[Math.cos(j/96*Math.PI*2),0,Math.sin(j/96*Math.PI*2)]);
  const ring=line(points,bright.clone(),rings);ring.position.copy(sensors[0].r.position).add(new THREE.Vector3(0,.7,0));
 }
 const bayLines=[];
 for(const model of [large,small]){
  const g=new THREE.Group();model.root.add(g);const front=-model.meta.length/2,wall=model.meta.partitionX;
  line([[front,2.73,.35],[wall,2.73,.35]],bright,g);
  for(const x of [front,wall])line([[x,2.65,.2],[x,2.81,.5]],bright,g);
  bayLines.push(g);
 }
 const rackBoxes=[];
 for(const [y,x] of [[.38,-.53],[.38,.53],[2.06,-.53]]){
  const box=props.carton.clone(true);box.position.set(x,y,0);box.traverse(o=>{if(o.userData.axis)o.rotation[o.userData.axis]=0;});props.rack.add(box);rackBoxes.push(box);
 }
 const ambientSpecks=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0x6e929a,size:.018,transparent:true,opacity:.27}));
 const positions=Float32Array.from({length:240*3},(_,i)=>Math.sin(i*78.233)* (i%3===1?7:22));
 ambientSpecks.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));scene.add(ambientSpecks);
 let width=1,height=1,mobile=false,lastP=0,selectedPalette='charcoal';
 const anchor=new THREE.Vector3();
 function project(object,xyz){anchor.set(...xyz);object.localToWorld(anchor);anchor.project(camera);return {x:(anchor.x*.5+.5)*width,y:(-.5*anchor.y+.5)*height,visible:anchor.z>=-1&&anchor.z<=1};}
 function resize(){width=canvas.clientWidth;height=canvas.clientHeight;mobile=width<650;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,Math.sqrt(2000000/(width*height))));renderer.setSize(width,height,false);draw(lastP);
 }
 const allMaterials=new Set();scene.traverse(o=>{if(o.material)allMaterials.add(o.material);});
 function setPalette(name,render=true){selectedPalette=palettes[name]?name:'charcoal';const [bg,cyan]=palettes[selectedPalette];if(scene.background?.isColor)scene.background.set(bg);
  accent.color.set(cyan);faint.color.set(cyan);bright.color.set(cyan);
  for(const m of allMaterials){if(m.name==='journey-cyan'||m.name==='Marvel cyan')m.color.set(cyan);}
  rings.children.forEach(o=>o.material.color.set(cyan));ambientSpecks.material.color.set(cyan);
  draw(lastP,render);
 }
 // Camera poses intentionally linger at each composition. The scroll controls
 // the interpolation directly; there is no delayed scroll-stop trigger.
 const shots=[
  [0,[-4,6,-15],[-3,1,0],11.8], [.055,[-3,6,-15],[-3,1,0],11.8],
  [.105,[-4,4.2,-10],[0,1.3,0],7.6], [.13,[-4,4.2,-10],[0,1.3,0],7.6],
  [.175,[0,7,-16],[0,1.3,0],10.3], [.22,[0,7,-16],[0,1.3,0],10.3],
  [.26,[0,11,-11],[0,1.2,0],10.3], [.305,[0,11,-11],[0,1.2,0],10.3],
  [.345,[-4,5,-10],[-.8,1.1,-1.1],7.6], [.39,[-4,5,-10],[-.8,1.1,-1.1],7.6],
  [.425,[-2,12,-11],[-.6,1.5,-2],8.8], [.47,[-2,12,-11],[-.6,1.5,-2],8.8],
  [.50,[-3,5,-12],[0,1,-1],8.4], [.55,[-3,5,-12],[0,1,-1],8.4],
  [.595,[0,12,-11],[0,1.1,0],10.3], [.64,[0,12,-11],[0,1.1,0],10.3],
  [.67,[0,3.4,-10],[0,1.2,0],5.5], [.711,[0,3.4,-10],[0,1.2,0],5.5],
  [.745,[-4.5,4.4,-8],[-1.8,1.3,-1.8],6.3], [.78,[-4.5,4.4,-8],[-1.8,1.3,-1.8],6.3],
  [.818,[-4.7,4.3,-7],[-1.768,1.3,-3.3],3.1], [.855,[-4.7,4.3,-7],[-1.768,1.3,-3.3],3.1],
  [.883,[-5,4.5,-8],[-1.5,1.1,-3.5],4.8], [.90,[-5,4.5,-8],[-1.5,1.1,-3.5],4.8],
  [.94,[-4,4.5,-9],[.8,1.35,-3],6.0], [.957,[-4,4.5,-9],[.8,1.35,-3],6.0],
  [.985,[0,7,-16],[0,1.2,0],10.3], [1,[0,7,-16],[0,1.2,0],10.3]
 ];
 function view(p){
  let i=0;while(i<shots.length-2&&p>shots[i+1][0])i++;
  const a=shots[i],b=shots[i+1],t=ramp(p,a[0],b[0]);
  camera.position.copy(vec(a[1])).lerp(vec(b[1]),t);const target=vec(a[2]).lerp(vec(b[2]),t);
  let span=mix(a[3],b[3],t),shiftX=.10,shiftY=.12;
  const pair=ramp(p,.13,.178)*(1-ramp(p,.305,.345))+ramp(p,.55,.59)*(1-ramp(p,.642,.67))+ramp(p,.958,.988);
  shiftX=mix(.10,-.015,pair);shiftY=mix(.12,height>=800?.19:.15,pair);
  if(p>=.31&&p<.55)shiftY=.05;
  if(mobile){
   const aspect=width/height;
   const narrow=ramp(p,.715,.745)*(1-ramp(p,.952,.98));
   const specimen=ramp(p,.646,.668)*(1-ramp(p,.715,.738));
   const arrival=1-ramp(p,.055,.115);
   const singleSpan=Math.max(span,mix(8,13,arrival)/aspect);
   span=mix(singleSpan,Math.max(span*1.55,4.4),narrow);
   span=mix(span,7.4,specimen);
   span=mix(span,Math.max(17,8.5/aspect),pair);
   camera.position.lerp(new THREE.Vector3(0,8,-18),pair);target.lerp(new THREE.Vector3(-.3,2.5,0),pair);
   shiftX=0;shiftY=mix(.17,.15,pair);
  }
  camera.lookAt(target);const aspect=width/height;
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
  camera.setViewOffset(width,height,-width*shiftX,-height*shiftY,width,height);camera.updateProjectionMatrix();
 }
 function draw(p,render=true,present=true){
  lastP=clamp(p);p=lastP;
  const split=ramp(p,.13,.178)*(1-ramp(p,.305,.345)) + ramp(p,.55,.59)*(1-ramp(p,.642,.67)) + ramp(p,.958,.988);
  const entry=18*(1-ramp(p,0,.048));
  const exit=ramp(p,.642,.67)*(1-ramp(p,.715,.74));
  large.root.position.set(entry+(mobile?0:3.9*split)+exit*15,mix(0,.3,ramp(p,.055,.11))*(1-ramp(p,.72,.744)+ramp(p,.958,.988))+(mobile?2.7*split:0),0);
  large.root.rotation.set(0,Math.sin(p*5)*.025*(1-split),0);
  small.root.position.set(mobile?0:-4.1,mobile?-1.1: .3,0);
  small.root.rotation.set(0,0,0);small.root.scale.setScalar(Math.max(.001,ramp(split,.02,.9)));small.root.visible=split>.005;
  const emptyReveal=ramp(p,.225,.265)*(1-ramp(p,.303,.335));
  const loadReveal=ramp(p,.552,.585)*(1-ramp(p,.642,.664));
  large.reveal(Math.max(emptyReveal,loadReveal));small.reveal(Math.max(emptyReveal,loadReveal));
  bayLines.forEach(g=>g.visible=emptyReveal>.7);
  large.root.visible=exit<.999;
  props.truck.position.set(entry-towOffset-ramp(p,.062,.112)*16,0,0);props.truck.visible=p<.112;
  props.truckWheels.forEach((w,i)=>w.rotation.z=-(entry-ramp(p,.062,.112)*16)/(wheelRadii[i]??.39));
  cargoItems.forEach(({o,index})=>{
   const progress=ramp(p,.585+index*.014,.605+index*.014);const [x,y,z]=o.userData.destination;
   o.visible=loadReveal>.01&&progress>.001;o.scale.setScalar(Math.max(.001,progress)*(index===1?.85:1)*(o.userData.mowerFitScale??1));o.position.set(x+(1-progress)*2,y+(1-progress)*.5,z);
  });
  largeLoad.visible=smallLoad.visible=p>=.55&&p<.67;
  const sensorsVisible=p>=.31&&p<.65;
  sensors.forEach(({c,r})=>{c.visible=r.visible=sensorsVisible;});
  field.visible=p>.326&&p<.552;scan.visible=p>.338&&p<.395;route.visible=routeDot.visible=p>=.405;
  field.scale.setScalar(Math.max(.01,ramp(p,.323,.35)*(1-ramp(p,.532,.553))));
  sweep.position.z=Math.sin(phase(p,.34,.39)*Math.PI*4)*1.5;
  detections.scale.setScalar(Math.max(.001,ramp(p,.355,.37)));
  const routeProgress=phase(p,.412,.47)*(routePoints.length-1),ri=Math.min(routePoints.length-2,Math.floor(routeProgress));
  routeDot.position.copy(vec(routePoints[ri])).lerp(vec(routePoints[ri+1]),routeProgress-ri);
  route.geometry.setDrawRange(0,Math.max(2,Math.ceil(routeProgress)+1));
  rings.visible=p>.398&&p<.475;
  rings.children.forEach((o,i)=>{const v=(phase(p,.4,.475)*2+i/3)%1;o.scale.setScalar(.16+v*1.8);o.material.opacity=(1-v)*.6;});
  // Material specimens float in the same scene, then resolve back to seaweed.
  const materialKeys=['grass','seaweed','wood','coffee','seaweed'];
  const materialPosition=phase(p,.665,.718)*4,materialIndex=Math.round(materialPosition);
  Object.entries(biomass).forEach(([key,o])=>{
   const matches=materialKeys.flatMap((name,i)=>name===key?[i]:[]);
   const index=matches.reduce((best,i)=>Math.abs(i-materialPosition)<Math.abs(best-materialPosition)?i:best,matches[0]);
   const distance=Math.abs(materialPosition-index),alpha=1-ease(phase(distance,.25,.75));
   o.visible=p>=.65&&p<.731&&alpha>.001;
   const v=ramp(p,.65,.667)*(1-ramp(p,.718,.731));
   o.scale.setScalar(v*1.18);o.position.set(.2+(index-materialPosition)*1.8,1.2,0);o.rotation.set(.14,phase(p,.65,.731)*Math.PI*1.4,.10);
   o.traverse(n=>{if(n.material){n.material.opacity=alpha;n.material.transparent=alpha<.999;n.material.depthWrite=alpha>.95;}});
  });
  const production=p>=.72&&p<.968;
  props.conveyor.visible=false;props.rack.visible=false;
  const outputSetup=ramp(p,.72,.744);
  props.conveyor.scale.setScalar(Math.max(.001,outputSetup));props.conveyor.position.set(large.meta.hatchX,0,-2.55);
  props.rack.position.set(.9,0,-3);props.rack.scale.setScalar(Math.max(.001,ramp(p,.856,.887)));
  large.parts.hatch.position.y=.86*ramp(p,.739,.754)*(1-ramp(p,.795,.817));
  const emerge=ramp(p,.756,.795),pack=ramp(p,.823,.842),travel=ramp(p,.904,.938);
  props.sink.visible=p>=.756&&p<.968;
  props.carton.visible=p>=.821&&p<.968;
  // The product passes through the external hatch while its opaque backing
  // permanently conceals the microfactory. Packing occurs outside the trailer.
  const sx=mix(large.meta.hatchX,.9,travel),sz=mix(mix(-.75,-3.3,emerge),-3,travel)-Math.sin(travel*Math.PI)*1.1;
  const sy=mix(1.205,1.245,travel)+Math.sin(travel*Math.PI)*.65;
  props.sink.position.set(sx,sy,sz);props.sink.rotation.set(0,0,0);
  props.carton.position.set(sx,sy-.025-(1-pack)*.8,sz);props.carton.scale.set(1,Math.max(.001,pack),1);
  const close=ramp(p,.855,.881);props.flaps.forEach(f=>f.rotation[f.userData.axis]=mix(f.userData.openAngle,f.userData.closedAngle,close));
  const productionEnd=1-ramp(p,.952,.969);
  if(productionEnd<1){props.sink.scale.setScalar(productionEnd);props.carton.scale.multiplyScalar(productionEnd);props.rack.scale.multiplyScalar(productionEnd);props.conveyor.scale.multiplyScalar(productionEnd);}else props.sink.scale.setScalar(1);
  ambientSpecks.rotation.y=p*.3;
  if(!present)return;
  view(p);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);if(render)renderer.render(scene,camera);
  const labels=[];
  const label=(id,title,detail,obj,pos,type='')=>labels.push({id,title,detail,type,...project(obj,pos)});
  if(split>.92){
   label('large','20 ft','12 FT REAR CARGO · 8 FT FACTORY',large.root,[.3,3.2,0],'size');
   label('small','16 ft','8 FT REAR CARGO · 8 FT FACTORY',small.root,[.2,3.2,0],'size');
  }
  if(emptyReveal>.85){
   label('wall','ENCLOSED MICROFACTORY','FIXED 8 FT · SAME ON BOTH',large.root,[-1.8,2.8,-.5]);
   label('cargo','EMPTY CARGO BAY','SIDE ENTRY BEHIND THE PARTITION',large.root,[1.4,.9,-.7]);
  }
  if(p>.347&&p<.39){label('vision','STEREO VISION','CAMERA LOCATION · CONCEPT',large.root,[...sensors[0].c.position]);}
  if(p>.412&&p<.47){label('rtk','RTK POSITIONING','LOCALIZE THE PLATFORM',large.root,[sensors[0].r.position.x,3.4,.25]);}
  if(p>.62&&p<.645&&!mobile){label('equipment','LANDSCAPING LOADOUT','ZERO-TURN · PUSH MOWER · TRIMMERS',large.root,[1,.9,-1]);}
  if(p>.745&&p<.78){label('hatch','EXTERIOR OUTPUT','FACTORY STAYS ENCLOSED',large.root,[large.meta.hatchX,2.7,-1.4]);}
  if(p>.792&&p<.82){label('sink','SEAWEED SINK','ILLUSTRATIVE PRODUCT GEOMETRY',props.sink,[0,.24,0]);}
  return {labels,material:materialKeys[materialIndex],mobile,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
 }
 resize();return {draw,resize,setPalette,stage:{scene,camera,renderer,large,small,props,field,scan,rings,sensors,ambientSpecks,largeLoad,smallLoad,cargoItems},inspect:()=>({equipmentAsset:props.pushMower.userData.asset||'illustration',large:{...large.meta,meshes:undefined,materials:undefined,groups:undefined},small:{...small.meta,meshes:undefined,materials:undefined,groups:undefined},factoryClosed:['factoryNear','factoryFar','factoryRoof','front','partition','hatchBacking'].every(k=>isOpaquePart(large.parts[k])),palette:selectedPalette,renderer:renderer.info.render})};
}
