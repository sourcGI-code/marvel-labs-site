import * as THREE from './assets/three.module.js';
import {addRampDetails} from './trailer-details.js?v=2';
import {roundedBox} from './studio.js';
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=(p,a,b)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};

// A scroll-controlled illustration of the operator's job, not an autonomy demo.
// Equipment, ramp, lawn passes and collected material share the property scene.
export function createWorkingRoute(scene,model,props,yard){
 const root=new THREE.Group();root.name='Operator workflow / illustrative mowing and collection';scene.add(root);
 const mower=props.zeroTurn.clone(true);root.add(mower);
 const rolling=[];let rollBar;mower.traverse(o=>{if(o.userData.wheelRadius)rolling.push(o);if(o.userData.rolloverBar)rollBar=o;});
 const floor=.8275,rear=model.meta.length/2+.015,doorHeight=2.508-floor,run=Math.sqrt(doorHeight**2-floor**2);
 const hinge=new THREE.Group();hinge.position.set(rear,floor,0);model.root.add(hinge);model.root.remove(model.parts.rear);hinge.add(model.parts.rear);
 const rubber=new THREE.MeshStandardMaterial({color:0x28302c,roughness:.92});
 const lining=new THREE.Mesh(roundedBox(.025,doorHeight-.07,2.23),rubber);lining.position.set(-.055,doorHeight/2,0);hinge.add(lining);
 const metal=new THREE.MeshStandardMaterial({color:0x87908a,metalness:.7,roughness:.35});
 for(let y=.12;y<doorHeight;y+=.14){const strip=new THREE.Mesh(new THREE.BoxGeometry(.008,.014,2.17),metal);strip.position.set(-.072,y,0);hinge.add(strip);}
 addRampDetails(hinge,{height:doorHeight,width:2.23});
 // Rear collection bags remain attached to the mower throughout its passes.
 const bagMaterial=new THREE.MeshStandardMaterial({color:0x222a23,roughness:.98});
 for(const z of [-.27,.27]){const bag=new THREE.Mesh(roundedBox(.38,.55,.47),bagMaterial);bag.position.set(.91,.63,z);mower.add(bag);}
 const route=new THREE.CatmullRomCurve3([[rear+run+.95,0,0],[6.1,0,1.6],[5.6,0,4],[4.6,0,5],[4.6,0,13.5],[3.2,0,14],[2.8,0,13.3],[2.8,0,5.5],[1.5,0,5],[1,0,5.7],[1,0,13.5]].map(a=>new THREE.Vector3(...a)),false,'centripetal');
 const returning=new THREE.CatmullRomCurve3([[1,0,13.5],[1,0,14.4],[.2,0,14.9],[-.5,0,14],[-.4,0,11],[.1,0,4.7],[5.8,0,2.8],[6,0,.6],[5.2,0,-1.3]].map(a=>new THREE.Vector3(...a)),false,'centripetal');
 const strips=[];let lawn;
 yard.root.traverse(o=>{if(o.isMesh&&o.material?.vertexColors&&o.material.map)lawn??=o.material;});
 for(const x of [4.6,2.8,1]){
  const map=lawn?.map.clone();if(map){map.repeat.set(1.25/2.2756,8.5/2.2756);map.needsUpdate=true;}
  const mat=new THREE.MeshStandardMaterial({map,color:0x88a579,roughness:1,transparent:true,opacity:.32,depthWrite:false});
  const strip=new THREE.Mesh(new THREE.PlaneGeometry(1.25,8.5),mat);strip.rotation.x=-Math.PI/2;strip.position.set(x,-.043,9.25);strip.receiveShadow=true;root.add(strip);strips.push(strip);
 }
 const collection=new THREE.Group();collection.position.set(4.8,0,-1.7);root.add(collection);
 const tub=new THREE.Mesh(new THREE.CylinderGeometry(.33,.27,.64,40,1,true),bagMaterial);tub.position.y=.32;collection.add(tub);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.33,.018,8,40),metal);rim.rotation.x=Math.PI/2;rim.position.y=.64;collection.add(rim);
 const grass=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.007,.08,2,4),new THREE.MeshStandardMaterial({color:0x718943,roughness:1}),240);
 const dummy=new THREE.Object3D();
 for(let i=0;i<240;i++){const angle=i*2.399963,r=.285*Math.sqrt((i+.5)/240);dummy.position.set(Math.cos(angle)*r,.58+Math.sin(i*1.7)*.03,Math.sin(angle)*r);dummy.rotation.set(i*.7,i*.31,i*.19);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}
 collection.add(grass);
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 function draw(p){
  const open=ease(p,.505,.523),unload=ease(p,.523,.548),work=clamp((p-.55)/.058),returningProgress=clamp((p-.608)/.023),collect=ease(p,.631,.639);
  const visible=p>=.505;root.visible=visible;
  hinge.rotation.z=(-Math.PI/2-Math.asin(floor/doorHeight))*open;
  model.parts.rear.position.set(-rear,-floor,0);model.parts.rear.visible=true;
  if(p<.55){
   const x=THREE.MathUtils.lerp(1.4,rear+run+.95,unload);
   const ground=x=>floor*clamp((rear+run-x)/run);
   const back=ground(x-.4),front=ground(x+1.04),height=(back*1.04+front*.4)/1.44;
   mower.position.set(x,height,0);mower.rotation.set(0,Math.PI,Math.atan2(back-front,1.44));
  }else{
   const path=p<.608?route:returning,t=p<.608?work:returningProgress,at=path.getPointAt(t),tangent=path.getTangentAt(t);
   const heading=Math.atan2(tangent.z,-tangent.x),turn=ease(p,.55,.556);
   mower.position.copy(at);mower.rotation.set(0,Math.PI+Math.atan2(Math.sin(heading-Math.PI),Math.cos(heading-Math.PI))*turn,0);
  }
  const distance=p<.55?mower.position.x-1.4:rear+run+.95-1.4+route.getLength()*work+returning.getLength()*returningProgress;
  rolling.forEach(w=>w.rotation.z=distance/w.userData.wheelRadius);
  if(rollBar)rollBar.rotation.z=-Math.PI/2*(1-ease(p,.546,.55));
  for(const [i,strip] of strips.entries()){
   const done=clamp((work-[.18,.47,.77][i])/.22);strip.visible=done>0;strip.scale.y=Math.max(.001,done);strip.position.z=i===1?13.5-done*4.25:5+done*4.25;
  }
  collection.visible=collect>0;collection.scale.setScalar(Math.max(.001,collect));
  const step=p<.523?'unload':p<=.55?'equipment':p<.608?'mow':'collect';
  return {step,visible,open,work,collect,mowerPosition:mower.position.toArray(),collectionPosition:collection.position.toArray(),operatorIllustration:true};
 }
 return {draw,mower,collection};
}
