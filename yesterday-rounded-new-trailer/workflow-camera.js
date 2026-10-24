import * as THREE from './assets/three.module.js';

const clamp=v=>Math.max(0,Math.min(1,v));
const phase=(p,a,b)=>clamp((p-a)/(b-a));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=THREE.MathUtils.lerp;
const transition=(p,a,b)=>{const t=phase(p,a,b);return t===0||t===1?0:Math.sin(Math.PI*t)**2;};

// The authored rig is about 13.5 m from the pickup nose to the rear door.
// Fit the complete envelope at eye level instead of fitting a direction hint
// that later moves the camera upward when the portrait viewport gets narrower.
function arrival(aspect,travel,mobile){
 const target=new THREE.Vector3(-3.59+travel,1.13,0);
 const bearing=new THREE.Vector3(mobile?4:1.05,0,-1).normalize();
 const camera=new THREE.PerspectiveCamera(38,aspect,.035,1400);
 const corners=[];
 for(const x of [-10.30,3.12])for(const y of [0,2.56])for(const z of [-1.35,1.35])corners.push(new THREE.Vector3(x+travel,y,z));
 let near=8,far=140,bounds;
 for(let i=0;i<28;i++){
  const distance=(near+far)/2;
  camera.position.copy(target).addScaledVector(bearing,distance);camera.position.y=1.95;
  camera.lookAt(target);camera.updateMatrixWorld(true);
  const xs=corners.map(point=>point.clone().project(camera).x);
  bounds=[Math.min(...xs),Math.max(...xs)];
  if((bounds[1]-bounds[0])*.5>.76)near=distance;else far=distance;
 }
 return {position:camera.position.clone(),target,shiftX:-(bounds[0]+bounds[1])/4,shiftY:.06};
}

// Pure playhead solve shared by live WebGL and offline films. Explicit mobile
// preserves the live width breakpoint even for a narrow landscape viewport.
// Inputs are never mutated; there is no elapsed-time or random camera motion.
export function solveWorkflowCamera({p,aspect,mobile=false,interior,travel=5*(1-smooth(phase(p,0,.035)))}){
 p=clamp(p);
 if(!Number.isFinite(aspect)||aspect<=0)throw new Error('Workflow camera needs a positive finite aspect ratio');
 const fullPos=mobile?[-17,8,-10]:[10,5,-16],fullTarget=[-3,1,0];
 let pos=new THREE.Vector3(...fullPos),target=new THREE.Vector3(...fullTarget);
 let span=Math.max(8,(mobile?14.5:20.5)/aspect),shiftX=0,shiftY=mobile?.02:.15;
 const equipmentMix=smooth(phase(p,.025,.065))*(1-smooth(phase(p,.16,.20)));
 pos.lerp(new THREE.Vector3(12,2.35,-10),equipmentMix);target.lerp(new THREE.Vector3(3,1.1,0),equipmentMix);
 span=mix(span,mobile?Math.max(9.8,8.2/aspect):10.2,equipmentMix);
 shiftX=mobile?0:.16*equipmentMix;shiftY=mobile?.10:.12;
 const surveyMix=smooth(phase(p,.16,.20))*(1-smooth(phase(p,.46,.51)));
 pos.lerp(new THREE.Vector3(...(mobile?[-36,31,-7]:[4,29,-32])),surveyMix);target.lerp(new THREE.Vector3(0,.7,13),surveyMix);
 span=mix(span,mobile?48/aspect:Math.max(36,61/aspect),surveyMix);
 shiftX=mix(shiftX,mobile?-.11:.08,surveyMix);shiftY=mix(shiftY,mobile?-.03:.025,surveyMix);
 let workView=0;
 if(p>=.46){
  const parking=smooth(phase(p,.46,.51));
  workView=smooth(phase(p,.58,.615))*(1-smooth(phase(p,.686,.72)));
  const parkPos=new THREE.Vector3(11,3.1,-14).lerp(new THREE.Vector3(-6,8,-17),workView);
  const parkTarget=new THREE.Vector3(mobile?0:1,1.3,2.5).lerp(new THREE.Vector3(1,1,7),workView);
  const workSpan=mix(mobile?Math.max(12.4,13.8/aspect):12.2,mobile?Math.max(21,15/aspect):24,workView);
  pos.lerp(parkPos,parking);target.lerp(parkTarget,parking);span=mix(span,workSpan,parking);
  shiftX=mix(shiftX,mobile?0:.10,parking);shiftY=mix(shiftY,mobile?.12:.07,parking);
 }
 const fieldFov=38,distance=span/(2*Math.tan(THREE.MathUtils.degToRad(fieldFov/2)));
 const direction=pos.clone().sub(target).normalize();
 pos.copy(target).addScaledVector(direction,distance);

 // Keep the analytical survey and quote holds exactly as authored. Equipment
 // and mowing are seen from a person on the apron, with depth from the yard.
 pos.y=mix(pos.y,1.72,equipmentMix);
 pos.y=mix(pos.y,1.72,workView);
 const arrivalMix=1-smooth(phase(p,.025,.065));
 if(arrivalMix>0){
  const first=arrival(aspect,travel,mobile);
  pos.lerp(first.position,arrivalMix);target.lerp(first.target,arrivalMix);
  shiftX=mix(shiftX,first.shiftX,arrivalMix);shiftY=mix(shiftY,first.shiftY,arrivalMix);
 }
 // These small lateral moves begin and end at rest and vanish throughout
 // every survey, quote and equipment hold. Reverse scroll follows the same path.
 const drift=.45*(transition(p,.025,.065)-transition(p,.16,.20)+transition(p,.58,.615)-transition(p,.686,.72));
 if(drift!==0){const right=new THREE.Vector3().subVectors(target,pos).cross(new THREE.Vector3(0,1,0)).normalize();pos.addScaledVector(right,drift);}

 const interiorEye=new THREE.Vector3(...interior.eye);
 if(mobile)interiorEye.x+=.38*interior.walk;
 pos.lerp(interiorEye,interior.cameraMix);target.lerp(new THREE.Vector3(...interior.look),interior.cameraMix);
 const fov=mix(fieldFov,mobile?72:48,interior.cameraMix);
 shiftX=mix(shiftX,mobile?0:.12,interior.cameraMix);shiftY=mix(shiftY,mobile?.16:.04,interior.cameraMix);
 return {position:pos.toArray(),target:target.toArray(),fov,shiftX,shiftY,span,distance,surveyMix,hazeMix:1-surveyMix,focusTarget:target.toArray(),focusDistance:pos.distanceTo(target),analyticalHold:p>=.20&&p<.46||p>=.51&&p<.58};
}
