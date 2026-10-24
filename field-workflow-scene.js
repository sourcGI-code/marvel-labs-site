import * as THREE from './assets/three.module.js';
import {createJourney} from './journey-scene.js?v=25';
import {loadTruck} from './truck-model.js?v=10';
import {finishTruck} from './cinema-light.js?v=12';
import {outdoorLight} from './outdoor-light.js?v=7';
import {createYard} from './yard-scene.js?v=13';
import {createWorkingRoute} from './working-route.js?v=9';
import {createFieldGrounding} from './field-grounding.js?v=5';
import {createInteriorFinishing} from './interior-finishing.js?v=10';
import {createGroundedRenderer} from './grounded-renderer.js?v=1';
import {solveWorkflowCamera} from './workflow-camera.js?v=1';

export const workflowStops=[0,.16,.34,.46,.58,.72,.84,.93,1];
const clamp=v=>Math.max(0,Math.min(1,v));
const phase=(p,a,b)=>clamp((p-a)/(b-a));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};

// One connected vehicle, two operating contexts. Only the first approach moves
// the rig. The freeze frame and every parked operation keep its world pose fixed.
export async function createFieldWorkflow(canvas){
 const base=await createJourney(canvas,()=>{},{cinematic:true});
 const {scene,renderer,large,small,props,field,scan,rings,sensors,ambientSpecks,largeLoad,smallLoad,cargoItems}=base.stage;
 const camera=new THREE.PerspectiveCamera(44,1,.08,1400);
 const [truck,yard]=await Promise.all([loadTruck(renderer),createYard(renderer)]);await finishTruck(truck.root,renderer);scene.add(truck.root,yard.root);
 // The rig arrives, senses and works in the same yard throughout the journey.
 yard.setReveal(1);
 const grounding=await createFieldGrounding(large,scene,truck);
 const workingRoute=createWorkingRoute(scene,large,props,yard,grounding.routeOptions);
 const daylight=await outdoorLight(scene,renderer);
 const grounded=createGroundedRenderer(renderer);
 const finishing=createInteriorFinishing(large,props);
 const rear=new THREE.Box3().setFromObject(truck.root).max.x;
 const truckX=grounding.towTip-.14-rear;
 const wheels=Object.entries(truck.meta.groups).filter(([,g])=>g.wheel).map(([id,g])=>({object:truck.groups[id],radius:g.radius}));
 let lastP=0,lastPaused=false,state={},shadowPose=null,renderPose=null,webglFrames=0;
 renderer.shadowMap.autoUpdate=false;
 function project(object,point){const v=new THREE.Vector3(...point);object.localToWorld(v);v.project(camera);return {x:(v.x*.5+.5)*canvas.clientWidth,y:(.5-v.y*.5)*canvas.clientHeight};}
 function observation(item){
  const points=[];
  for(const x of [item.min[0],item.max[0]])for(const y of [item.min[1],item.max[1]])for(const z of [item.min[2],item.max[2]])points.push(project(yard.root,[x,y,z]));
  const xs=points.map(v=>v.x),ys=points.map(v=>v.y);
  return {...item,box:{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)},polygons:item.polygons?.map(poly=>poly.map(point=>project(yard.root,point)))};
 }
 function draw(p,paused=false,render=true){
  lastP=p=clamp(p);lastPaused=paused;
  const index=Math.min(7,workflowStops.findLastIndex(s=>p>=s)),local=phase(p,workflowStops[index],workflowStops[index+1]);
  const ranges=[[.739,.739],[.34,.388],[.405,.469],[.478,.548],[.739,.739],[.739,.819],[.823,.897],[.904,.951]];
  const q=ranges[index][0]+(ranges[index][1]-ranges[index][0])*local;
  base.draw(q,false,false);
  // The old standalone journey's pickup and comparison poses do not appear here.
  props.truck.visible=false;small.root.visible=false;ambientSpecks.visible=false;
  const travel=5*(1-smooth(phase(p,0,.035)));
  const parked=p>=.035;
  large.root.position.set(travel,grounding.trailerY,0);large.root.rotation.set(0,0,0);large.root.visible=true;
  truck.root.position.set(truckX+travel,0,0);truck.root.rotation.set(0,0,0);truck.root.visible=true;
  wheels.forEach(({object,radius})=>object.rotation.z=-(5-travel)/radius);
  if(index<5){props.conveyor.visible=props.sink.visible=props.carton.visible=props.rack.visible=false;large.parts.hatch.position.y=0;}
  // Unload once, hold the equipment while the site is understood, then work it.
  // The same deterministic playhead also puts everything back on reverse scroll.
  const actionP=p<.58?.5+.05*phase(p,.035,.12):.55+.09*phase(p,.58,.72);
  const working=workingRoute.draw(actionP);
  working.step=p>=.12&&p<.58?'equipment':working.step;
  largeLoad.visible=true;smallLoad.visible=false;
  for(const {o,index:item} of cargoItems){
   if(o.parent!==largeLoad)continue;
   o.visible=item!==0;o.scale.setScalar(item===1?.85:1);o.position.set(...o.userData.destination);
   if(item===1){
    const unload=smooth(phase(p,.658,.711)),x=THREE.MathUtils.lerp(1.35,5.8,unload);
    o.position.set(x,grounding.support(x)-grounding.trailerY,THREE.MathUtils.lerp(.78,1.65,smooth(phase(unload,.78,1))));
    o.rotation.set(0,Math.PI,0);
    o.traverse(w=>{if(w.userData.wheelRadius)w.rotation.z=(x-1.35)/w.userData.wheelRadius;});
   }
   if(item===2)o.position.set(2.15,large.meta.floorHeight+.0025,1.02);
  }
  const interior=finishing.draw(p);
  grounding.draw(travel);
  const frozen=paused||p>=.035;
  field.visible=scan.visible=rings.visible=false;
  sensors.forEach(({c,r},i)=>{c.visible=r.visible=i===0;});
  // Freeze the rig, then turn toward the property for classification and scale.
  // Return to the attached rig before the parked production sequence.
  const w=canvas.clientWidth,h=canvas.clientHeight,aspect=w/h,mobile=w<=760;
  const solved=solveWorkflowCamera({p,aspect,mobile,interior,travel});
  const {span,shiftX,shiftY,surveyMix,distance}=solved;
  // The phone overview needs a more distant camera to fit the entire lot.
  // Keep atmospheric haze behind that lot instead of washing out its details.
  scene.fog.near=distance+70;scene.fog.far=distance+220;
  const cameraY=grounding.cameraOffset(interior),target=new THREE.Vector3(...solved.target);target.y+=cameraY;
  camera.position.fromArray(solved.position);camera.position.y+=cameraY;camera.fov=solved.fov;camera.near=.035;
  camera.lookAt(target);camera.aspect=aspect;
  interior.cameraInside=camera.position.x<3.063&&camera.position.x>large.meta.partitionX+.06&&Math.abs(camera.position.z)<1.14&&camera.position.y>finishing.floor+grounding.trailerY&&camera.position.y<2.50+grounding.trailerY;
  camera.setViewOffset(w,h,-w*shiftX,-h*shiftY,w,h);camera.updateProjectionMatrix();
  // Offline captures skip renderer.render(), so update the camera before
  // exporting its matrix or projecting labels, including the very first pose.
  camera.updateMatrixWorld(true);
  const nextShadowPose=p>=.12&&p<.58?'stationary-equipment':p.toFixed(5);
  renderer.shadowMap.needsUpdate=nextShadowPose!==shadowPose;shadowPose=nextShadowPose;
  // The survey and quote holds change only their HTML/SVG overlays. Keep the
  // existing canvas image instead of drawing the same yard on every scroll tick.
  const nextRenderPose=p>=.20&&p<.46?'survey':p>=.51&&p<.58?'quote':`${p.toFixed(6)}:${paused}`;
  const frameReused=nextRenderPose===renderPose;
  if(render&&!frameReused){daylight.restore();grounded.render(scene,camera);webglFrames++;renderPose=nextRenderPose;}
  let annotation=null;
  if(index===0&&p>.065)annotation={title:'YOUR EVERYDAY EQUIPMENT',detail:'Zero-turn · push mower · trimmers',...project(workingRoute.mower,[0,1,0])};
  if(index===4)annotation=working.step==='collect'?{title:'KEEP THE MATERIAL',detail:'Suitable clippings → pilot feedstock',...project(workingRoute.collection,[0,.65,0])}:{title:'WORK THE JOB',detail:'Illustrative operator workflow',...project(workingRoute.mower,[0,1,0])};
  if(index===5&&p>=.785)annotation={title:'20 × 20 INCH SINK',detail:'Enclosed front factory',...project(large.root,finishing.portPoint)};
  if(index===6)annotation={title:'AUTONOMOUS TRANSFER',detail:'Receive · protect · lift',...project(props.carton,[0,.35,0])};
  const classification=phase(p,.205,.27),measuring=phase(p,.275,.325);
  const detectedCount=p<.205?0:Math.min(yard.detections.length,Math.floor(classification*yard.detections.length)+1);
  const surveying=p>=.20&&p<.46;
  const observations=surveying?yard.detections.slice(0,detectedCount).map(observation):[];
  const vision={visible:surveying,mix:surveyMix,count:detectedCount,total:yard.detections.length,measured:measuring>=1,measuring,classification,origin:project(yard.root,[-3,.05,2.2]),activeId:yard.detections[Math.min(detectedCount-1,yard.detections.length-1)]?.id,observations,jobs:yard.jobs,stage:index===2?'localize':measuring>0?'measure':'classify'};
  state={p,q,index,local,frameReused,webglFrames,mode:parked?'parked':frozen?'freeze':'towing',vehicleFrozen:frozen,parked,truckAttached:true,truckSource:truck.meta.source,truckPosition:truck.root.position.toArray(),trailerPosition:large.root.position.toArray(),wheelAngles:wheels.map(w=>w.object.rotation.z),cameraPosition:camera.position.toArray(),cameraSpan:span,viewOffset:[shiftX,shiftY],cameraType:"perspective",productionVisible:interior.visible,productVisible:props.sink.visible,packagingVisible:props.carton.visible,storageVisible:interior.storageVisible,hatchOpen:large.parts.hatch.position.y,annotation,vision,working,interior,...base.inspect(),...yard.inspect()};
  return state;
 }
 return {stage:{...base.stage,camera},draw,resize(){renderPose=null;base.resize();return draw(lastP,lastPaused);},setPalette(name){renderPose=null;base.setPalette(name,false);return draw(lastP,lastPaused);},inspect:()=>state};
}
