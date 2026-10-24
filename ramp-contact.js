import * as THREE from './assets/three.module.js';

// The supplied mesh is not an ideal thin door. Solve its real lower edge
// against the ground so the open ramp neither floats nor cuts into the road.
export function rampContact(part,rear,floor,rise){
 part.updateMatrixWorld(true);
 const inverse=part.matrixWorld.clone().invert(),p=new THREE.Vector3(),points=[];
 part.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const transform=inverse.clone().multiply(mesh.matrixWorld),positions=mesh.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   p.fromBufferAttribute(positions,i).applyMatrix4(transform);
   points.push([p.x-rear,p.y-floor]);
  }
 });
 if(!points.length)throw Error('Rear door geometry is unavailable');
 const clearance=a=>rise+Math.min(...points.map(([x,y])=>Math.sin(a)*x+Math.cos(a)*y));
 let a=-Math.PI/2,b=-Math.PI*.75;
 for(let i=0;i<45;i++){const mid=(a+b)/2;if(clearance(mid)>0)a=mid;else b=mid;}
 const angle=(a+b)/2,run=Math.max(...points.map(([x,y])=>Math.cos(angle)*x-Math.sin(angle)*y));
 return {angle,run,groundError:clearance(angle)};
}
