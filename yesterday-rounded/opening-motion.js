import * as THREE from './assets/three.module.js';
import {arrivalTime,impactPose,duration,timelineProgress} from './opening-timing.js?v=2';
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const ramp=(p,a,b)=>ease((p-a)/(b-a));
const mix=THREE.MathUtils.lerp;
const vec=a=>new THREE.Vector3(...a);
// Portrait films show the complete attached rig during the reveal. Dolly back
// along the ground plane, rather than multiplying eye height into a drone view.
function fitPortrait(pos,target,{x0,x1,height,fov,weight}){
 if(weight<=0)return;
 const horizontal=pos.clone().sub(target);horizontal.y=0;
 const start=horizontal.length();if(start<.001)return;horizontal.divideScalar(start);
 const eyeHeight=pos.y-target.y,tangent=Math.tan(THREE.MathUtils.degToRad(fov/2));
 const corners=[];for(const x of [x0,x1])for(const y of [0,height])for(const z of [-1.45,1.45])corners.push(vec([x,y,z]));
 const eye=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),delta=new THREE.Vector3(),worldUp=new THREE.Vector3(0,1,0);
 function fits(distance){
  eye.copy(target).addScaledVector(horizontal,distance);eye.y+=eyeHeight;
  forward.subVectors(target,eye).normalize();right.crossVectors(forward,worldUp).normalize();up.crossVectors(right,forward);
  return corners.every(point=>{
   delta.subVectors(point,eye);const depth=delta.dot(forward);if(depth<=.06)return false;
   const screenX=delta.dot(right)/(depth*tangent*9/16),screenY=delta.dot(up)/(depth*tangent)-.20;
   return Math.abs(screenX)<=.88&&screenY>=-.82&&screenY<=.78;
  });
 }
 if(fits(start))return;
 let low=start,high=start*1.5;while(high<160&&!fits(high))high*=1.5;
 for(let i=0;i<14;i++){const middle=(low+high)/2;if(fits(middle))high=middle;else low=middle;}
 pos.copy(target).addScaledVector(horizontal,mix(start,high,weight));pos.y+=eyeHeight;
}
// Shared camera choreography for the live preview and offline Blender film.
export function openingPose(p,take,{front,towOffset,mobile=false}){
 p=clamp(p);
  const contact=impactPose,contactX=-12-front,startX=34;
  // Accelerate into the lens, then carry the momentum through contact before
  // easing into the trailer shot. No stop at the front bumper.
  const travel=1-Math.pow(1-clamp((p-contact)/(.79-contact)),3);
  let x=p<=contact?mix(startX,contactX,Math.pow(p/contact,1.3)):mix(contactX,contactX-18,travel);
  // Continue the departure beyond the initial acceleration so the pickup
  // actually leaves the portrait view before it is hidden. Keep velocity
  // continuous at the end of the acceleration and share travel with the bake.
  const departureTime=Math.max(0,(p-.825)/(.847-.825));
  const depart=Math.pow(clamp(departureTime),1.6);
  const departureDistance=22*(departureTime<=1?depart:1+1.6*(departureTime-1));
  const truckX=x-departureDistance,truckVisible=departureDistance<180;
  const float=ramp(p,.82,.95);
  const trailerX=x+towOffset;
  const initial=vec([-12,1.15,0]),initialTarget=vec([-4,1.5,0]);
  const revealPosition=vec([trailerX-3.5,2.1,-8.5]),revealTarget=vec([trailerX,1.3,0]);
  let pos=initial.clone(),target=initialTarget.clone(),roll=0,pitch=0,occlusion=0,fov=48;
  if(take==='lift'){
   if(p>=contact){
    // The lens is struck, kicks back and rolls, then clears to the side.
    // Reach a wide view within half a second instead of hovering over the roof.
    // All motion is sampled from time, including reverse scrubbing.
    const t=Math.max(0,timelineProgress(p)*duration-arrivalTime);
    const escape=1-Math.pow(1-clamp(t/.50),3),kick=(t/.065)*Math.exp(1-t/.065);
    const centre=(x+front+trailerX+3.12)/2;
    const wideEye=mobile?vec([trailerX+14.5,2.8,-5.2]):vec([centre-4.5,3.3,-13.5]);
    const wideTarget=mobile?vec([trailerX-2,1.3,0]):vec([centre,1.3,0]);
    pos.lerp(wideEye,escape);
    if(mobile){
     // Clear the body sideways before moving behind it. A diagonal dolly
     // from the bumper to the rear used to skim the trailer wall on phones.
     pos.x=mix(initial.x,wideEye.x,ramp(t,.12,.60));
     pos.z=mix(initial.z,wideEye.z,1-Math.pow(1-clamp(t/.16),3));
    }
    pos.x-=1.05*kick;
    pos.y+=1.2*Math.sin(Math.PI*clamp(t/.50));
    target.lerp(wideTarget,escape);
    pitch=-.18*Math.sin(24*t)*Math.exp(-6*t);
    roll=.11*Math.sin(27*t)*Math.exp(-6*t);
    fov=48+4*ramp(t,0,.28)+5*kick;
   }
  }else{
   // The body passes through the original lens. A brief body occlusion
   // masks clipping, before the camera emerges behind the trailer on-axis.
   occlusion=ramp(p,.449,.459)*(1-ramp(p,.485,.515));
   const pass=ramp(p,.46,.485),arc=ramp(p,.59,.80);
   const behind=vec([trailerX+11.8,3.15,0]);
   pos.lerp(behind,pass);target.lerp(vec([trailerX,1.2,0]),pass);
   // A broad arc goes around the rear corner without crossing the model.
   if(p>=.59){const angle=mix(0,-2.07,arc);pos.set(trailerX+Math.cos(angle)*11.8,mix(3.15,4.9,arc),Math.sin(angle)*11.8);target.copy(revealTarget);}
   fov=48;
  }
  // The trailer settles into the same final shot in both takes for comparison.
  const settle=ramp(p,.81,.96),finalPos=vec([trailerX-4.8,4.5,-11.5]);
  pos.lerp(finalPos,settle);target.lerp(vec([trailerX,1.45,0]),settle);
  // A 35 mm-equivalent middle view gives the trailer visual weight. The final
  // projection is deliberately identical to the existing cargo-film handoff.
  if(take==='lift')fov=mix(fov,48,settle);
  else fov-=10*ramp(p,.57,.68)*(1-ramp(p,.83,.96));
  const dollyArc=p>.72&&p<.96?THREE.MathUtils.degToRad(2)*Math.sin(Math.PI*(p-.72)/.24)**2:0;
  if(dollyArc)pos.sub(target).applyAxisAngle(new THREE.Vector3(0,1,0),dollyArc).add(target);
  if(mobile){
   const pull=take==='lift'?ramp(p,.84,.96):ramp(p,.53,.76),scale=1+pull*.64,offset=pos.clone().sub(target);
   offset.x*=scale;offset.z*=scale;offset.y*=mix(1,scale,ramp(p,.84,.96));pos.copy(target).add(offset);
   const frameWeight=ramp(p,take==='lift'?.50:.60,take==='lift'?.51:.68)*(1-ramp(p,.88,.96));
   const release=ramp(p,.825,.88),portrait=take==='lift'?0:ramp(p,.60,.70)*(1-ramp(p,.84,.96));
   const frontX=mix(x+front,trailerX-4.172,release),rearX=trailerX+3.12;
   // Looking along the rig gives a phone view real depth: the rear trailer
   // stays substantial while the attached pickup recedes naturally behind it.
   // A near end-on angle avoids turning a 13 m rig into a tiny horizontal line.
   const portraitTarget=vec([mix((frontX+rearX)/2,trailerX,.58),1.3,0]),portraitEye=vec([trailerX+11,2.1,-2.6]);
   if(dollyArc)portraitEye.sub(portraitTarget).applyAxisAngle(new THREE.Vector3(0,1,0),dollyArc).add(portraitTarget);
   pos.lerp(portraitEye,portrait);target.lerp(portraitTarget,portrait);
   fitPortrait(pos,target,{x0:frontX,x1:rearX,height:2.8+float*.35,fov,weight:frameWeight});
  }
  const focusTarget=vec([x+front+1.25,1.25,0]).lerp(vec([trailerX,1.35+float*.35,0]),ramp(p,.54,.73));
  const focusDistance=Math.max(1.5,focusTarget.clone().sub(pos).dot(target.clone().sub(pos).normalize()));
  return {x,depart,departureDistance,truckX,truckVisible,float,trailerX,pos,target,pitch,roll,occlusion,fov,focusTarget,focusDistance,sensorHeightMm:24,lensMm:12/Math.tan(THREE.MathUtils.degToRad(fov/2)),wheelDistance:truckX-startX,roadOpacity:.22*(1-ramp(p,.64,.85))};
}
