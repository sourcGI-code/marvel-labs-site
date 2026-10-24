import * as THREE from './assets/three.module.js';
import {createGardenPlantings} from './yard-realism.js?v=1';

const FT=3.28084,SQFT=10.7639;
const number=v=>Math.round(v).toLocaleString('en-US');
const areaLabel=v=>`≈ ${number(Math.round(v*SQFT/10)*10)} sq ft`;
const lengthLabel=v=>`≈ ${number(v*FT)} linear ft`;

// Geometry and observation regions share metre coordinates. These measurements
// describe this illustrative property, not an inference from a live camera.
export function createProperty({surface,tree,shrub,gardenShrub,flowering,fenceMap,driveMap,lawnNormal,roofMap,roofNormal,roofRough,concreteMap,concreteNormal,concreteRough}){
 const root=new THREE.Group();root.name='Residential landscaping survey';
 const detections=[];
 let seed=794;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const dummy=new THREE.Object3D();
 function mesh(parent,g,m,x=0,y=0,z=0){
  if(m.userData.meterUV){const p=g.attributes.position,n=g.attributes.normal,uv=[];for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv.push((nx>ny&&nx>nz?p.getZ(i):p.getX(i))/2,(ny>nx&&ny>nz?p.getZ(i):p.getY(i))/2);}g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));}
  const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
 }
 function box(parent,m,w,h,d,x,y,z){return mesh(parent,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
 function region(id,label,task,min,max,measurement,detail,polygons){
  detections.push({id,label,task,min,max,measurement,detail,polygons});
 }
 function patch(x1,z1,x2,z2){return [[x1,.045,z1],[x2,.045,z1],[x2,.045,z2],[x1,.045,z2]];}
 const home=new THREE.Group();home.name='House and garage — visual context only';home.position.set(-2,0,22);root.add(home);
 const siding=surface({color:0xe5e1d4,roughness:.76});
 const trim=surface({color:0xeeeae0,roughness:.55});
 const foundation=surface({map:concreteMap,normalMap:concreteNormal,roughnessMap:concreteRough,normalScale:new THREE.Vector2(.3,.3),color:0xb6b0a4,roughness:1});foundation.userData.meterUV=true;
 const roof=surface({map:roofMap,normalMap:roofNormal,roughnessMap:roofRough,normalScale:new THREE.Vector2(.45,.45),color:0x636b74,roughness:1});roof.userData.meterUV=true;
 const roofEdge=surface({color:0x656b67,metalness:.3,roughness:.65});
 box(home,foundation,14,.27,7.6,0,.065,0);
 box(home,siding,14,3.05,7.6,0,1.7,0);
 // Overlapping clapboards create real shadow lines across the facade.
 const boards=new THREE.InstancedMesh(new THREE.BoxGeometry(14,.155,.014),siding,40);home.add(boards);boards.castShadow=boards.receiveShadow=true;
 for(let i=0;i<40;i++){dummy.position.set(0,.3+(i%20)*.15,i<20?-3.808:3.808);dummy.rotation.set(i<20?-.055:.055,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();boards.setMatrixAt(i,dummy.matrix);}
 for(const x of [-7.025,7.025])for(const z of [-3.83,3.83])box(home,trim,.1,3.13,.1,x,1.72,z);
 const gable=new THREE.BufferGeometry();gable.setAttribute('position',new THREE.Float32BufferAttribute([-7,3.22,-3.8,-7,5.4,0,-7,3.22,3.8,7,3.22,3.8,7,5.4,0,7,3.22,-3.8],3));gable.setIndex([0,2,1,3,5,4]);gable.computeVertexNormals();mesh(home,gable,siding);
 const pitch=Math.atan2(2.3,4.25),slope=Math.hypot(2.3,4.25);
 for(const side of [-1,1]){
  const panel=box(home,roof,14.7,.12,slope,0,4.25,side*2.125);panel.rotation.x=side*pitch;
  const gutter=mesh(home,new THREE.CylinderGeometry(.065,.065,14.7,10),roofEdge,0,3.04,side*4.25);gutter.rotation.z=Math.PI/2;
  for(const x of [-7.25,7.25]){const fascia=box(home,trim,.14,.16,slope,x,4.23,side*2.125);fascia.rotation.x=side*pitch;}
 }
 box(home,roofEdge,14.8,.13,.15,0,5.48,0);
 const brick=surface({map:driveMap,color:0x89725d});box(home,brick,.75,2.0,.8,4.8,5.1,1);box(home,roofEdge,.94,.13,.98,4.8,6.12,1);
 const glass=new THREE.MeshPhysicalMaterial({color:0xe6ebe4,metalness:0,roughness:.07,transmission:.86,thickness:.006,ior:1.5,envMapIntensity:1});
 const recess=surface({color:0x1b211d,roughness:.8});
 const curtain=surface({color:0xaba99a,roughness:1});
 function windowAt(x,z,rotation=0){
  const group=new THREE.Group();group.position.set(x,1.9,z);group.rotation.y=rotation;home.add(group);
  box(group,recess,1.47,1.47,.012,0,0,.015);
  for(const xx of [-.59,.59])for(let pleat=0;pleat<6;pleat++)box(group,curtain,.028,1.4,.012,xx+(pleat-2.5)*.032,0,-.02-(pleat%2)*.008);
  box(group,glass,1.43,1.43,.006,0,0,-.052);
  for(const xx of [-.79,.79])box(group,trim,.115,1.68,.065,xx,0,-.055);
  for(const yy of [-.79,.79])box(group,trim,1.68,.115,.065,0,yy,-.055);
  box(group,trim,.032,1.46,.03,0,0,-.075);box(group,trim,1.46,.032,.03,0,0,-.075);box(group,trim,1.84,.075,.18,0,-.85,-.04);
  for(const xx of [-1.02,1.02]){const shutter=surface({color:0x35423c,roughness:.65});box(group,shutter,.32,1.62,.035,xx,0,-.02);for(let y=-.7;y<.8;y+=.1){const slat=box(group,shutter,.265,.06,.012,xx,y,-.043);slat.rotation.x=.18;}for(const dx of [-.142,.142])box(group,shutter,.035,1.62,.035,xx+dx,0,-.043);}
 }
 windowAt(-4.55,-3.9);windowAt(2,-3.9);windowAt(5,-3.9);windowAt(-7.07,0,Math.PI/2);windowAt(7.07,0,-Math.PI/2);
 const door=surface({map:fenceMap,color:0x596761});
 box(home,trim,1.34,2.55,.18,-1,1.48,-3.92);box(home,door,1.14,2.38,.2,-1,1.45,-4.02);
 box(home,glass,.7,.65,.035,-1,2.04,-4.14);box(home,roofEdge,.06,.06,.08,-.57,1.38,-4.16);
 for(const y of [.65,1.2])box(home,door,.83,.38,.018,-1,y,-4.13);
 for(let i=0;i<3;i++)box(home,foundation,2.7-i*.12,.1+i*.08,.38,-1,.015+i*.04,-4.9+i*.32);
 // The entry sits under the full porch roof, with realistic square columns.
 const lamp=surface({color:0xc8b58a,emissive:0x493619,emissiveIntensity:.3});for(const x of [-1.9,-.1])box(home,lamp,.16,.27,.16,x,2.2,-4.03);
 // A recessed full porch and attached garage break up the long flat facade.
 box(home,foundation,6.0,.22,2.0,-2,.10,-4.3);
 for(const x of [-4.8,.8]){box(home,trim,.22,2.75,.22,x,1.56,-5.1);box(home,trim,.31,.14,.31,x,.27,-5.1);box(home,trim,.31,.14,.31,x,2.86,-5.1);}
 const porchRoof=new THREE.Group();porchRoof.position.set(-2,3.1,-4.15);home.add(porchRoof);
 for(const side of [-1,1]){const r=box(porchRoof,roof,3.3,.12,2.65,side*1.45,.50,0);r.rotation.z=-side*.32;}
 const porchFace=new THREE.BufferGeometry();porchFace.setAttribute('position',new THREE.Float32BufferAttribute([-3.1,0,-1.34,0,1.02,-1.34,3.1,0,-1.34],3));porchFace.computeVertexNormals();mesh(porchRoof,porchFace,trim);
 box(porchRoof,trim,6.25,.15,.12,0,.035,-1.40);
 for(const side of [-1,1]){const fascia=box(porchRoof,trim,3.28,.12,.12,side*1.55,.53,-1.40);fascia.rotation.z=-side*.318;}
 for(const x of [-6.4,6.4]){box(home,roofEdge,.07,3.1,.07,x,1.6,-3.96);}
 const garage=new THREE.Group();garage.name='Attached garage';garage.position.set(11,0,.5);home.add(garage);
 box(garage,foundation,7.1,.24,8.0,0,.08,0);box(garage,siding,7.1,2.9,8,0,1.65,0);
 const garageDoor=surface({color:0x454b48,roughness:.49}),garageInset=surface({color:0x3c423f,roughness:.56});box(garage,trim,5.65,2.6,.10,0,1.5,-4.04);box(garage,garageDoor,5.35,2.36,.05,0,1.4,-4.12);
 for(let y=.35;y<2.3;y+=.48){box(garage,roofEdge,5.32,.008,.004,0,y,-4.149);for(const x of [-1.8,-.6,.6,1.8])box(garage,garageInset,1.02,.31,.003,x,y+.21,-4.148);}
 for(const x of [-1.8,-.6,.6,1.8]){box(garage,recess,.92,.24,.006,x,2.32,-4.151);box(garage,glass,.88,.20,.005,x,2.32,-4.16);}
 const garagePitch=Math.atan2(1.9,3.9);
 for(const side of [-1,1]){const r=box(garage,roof,Math.hypot(3.9,1.9),.12,8.5,side*1.95,3.92,0);r.rotation.z=-side*garagePitch;}
 const gf=new THREE.BufferGeometry();gf.setAttribute('position',new THREE.Float32BufferAttribute([-3.55,3,-4.02,0,4.82,-4.02,3.55,3,-4.02],3));gf.computeVertexNormals();mesh(garage,gf,siding);
 box(garage,roofEdge,.15,.12,8.5,0,4.9,0);
 // A few background trees give the site depth beyond the property boundary.
 for(const [x,z,scale] of [[-31,37,3.1],[-12,43,3.0],[11,42,3.2],[34,36,3.0]]){
  const t=tree.clone(true);t.position.set(x,-.07,z);t.scale.setScalar(scale);t.rotation.y=random()*6.28;root.add(t);
 }
 // Layered planting replaces the former line of sparse, dry shrub silhouettes.
 root.add(createGardenPlantings(gardenShrub,flowering));

 const pathMat=surface({map:concreteMap,normalMap:concreteNormal,roughnessMap:concreteRough,normalScale:new THREE.Vector2(.4,.4),color:0xe0dcd1,roughness:1});pathMat.userData.meterUV=true;
 const walkway=box(root,pathMat,1.4,.065,16.0,-3,-.01,10.2);walkway.name='Front walk';
 const joint=surface({color:0x817e70});for(let z=2.8;z<18.2;z+=1.2)box(root,joint,1.39,.004,.015,-3,.024,z);
 const lawnArea=(16.2+9.3+6.6)*13.6,bedArea=(5+7)*1.8;
 region('lawn','Lawn','Mow & collect',[-20,.04,2.7],[20,.12,16.3],areaLabel(lawnArea),`≈ ${number(40*FT)} × ${number(13.6*FT)} ft · path and driveway excluded`,[patch(-20,2.7,-3.8,16.3),patch(-2.2,2.7,7.1,16.3),patch(13.4,2.7,20,16.3)]);
 region('walk','Lawn edging','Edge the grass border',[-3.7,.025,2.2],[-2.3,.08,18.2],lengthLabel(2*(16+1.4)),'Grass borders along the path',[patch(-3.85,2.2,-3.65,18.2),patch(-2.35,2.2,-2.15,18.2)]);
 const mulchMap=fenceMap.clone();mulchMap.repeat.set(8,3);
 const soil=surface({map:mulchMap,bumpMap:mulchMap,bumpScale:.018,color:0x72503a,roughness:1});
 for(const [x,w] of [[-6.5,5],[1.5,7]])box(root,soil,w,.07,1.8,x,-.005,17.0);
 const mulch=new THREE.InstancedMesh(new THREE.BoxGeometry(.10,.018,.035),surface({color:0x685240}),1200);root.add(mulch);mulch.receiveShadow=true;
 for(let i=0;i<1200;i++){const left=i<500;dummy.position.set((left?-9:-2)+random()*(left?5:7),.035,16.1+random()*1.8);dummy.rotation.set(random()*.3,random()*Math.PI,0);dummy.scale.setScalar(.5+random());dummy.updateMatrix();mulch.setMatrixAt(i,dummy.matrix);}
 region('beds','Planting beds','Refresh mulch',[-9,.02,16.1],[5,.65,17.9],areaLabel(bedArea),'Two beds · walkway excluded',[patch(-9,16.1,-4,17.9),patch(-2,16.1,5,17.9)]);
 region('hedge','Hedge','Trim & shape',[-21.3,0,3.8],[-20.1,1.55,15.3],lengthLabel(11),'≈ 5 ft high · one hedge run');

 for(const [i,x,z,scale,angle] of [[0,-23,9,2.0,2.4],[1,22.6,9.7,1.85,.2],[2,-23.8,27,1.95,4.5],[3,22.8,27.8,2.1,1.2]]){
  const t=tree.clone(true);t.position.set(x,-.065,z);t.scale.setScalar(scale);t.rotation.y=angle;root.add(t);t.updateMatrixWorld(true);
  const ring=new THREE.CircleGeometry(1.1,64);ring.rotateX(-Math.PI/2);mesh(root,ring,soil,x,-.018,z).name='Mulched tree ring';
  const chips=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,.018,.035),soil,220);root.add(chips);chips.receiveShadow=true;
  for(let j=0;j<220;j++){const angle=random()*Math.PI*2,r=.18+Math.sqrt(random())*.88;dummy.position.set(x+Math.cos(angle)*r,-.005,z+Math.sin(angle)*r);dummy.rotation.set(random()*.25,angle,random()*.2);dummy.scale.setScalar(.6+random()*.8);dummy.updateMatrix();chips.setMatrixAt(j,dummy.matrix);}
  region(`tree-${i+1}`,`Tree ${String(i+1).padStart(2,'0')}`,'Maintain tree ring',[x-1.1,.02,z-1.1],[x+1.1,.35,z+1.1],'1 tree ring','Trim grass and refresh mulch around the trunk',[patch(x-1.1,z-1.1,x+1.1,z+1.1)]);
 }
 const timber=surface({map:fenceMap,color:0x9c9686});
 const fence=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,1.15,.13),timber,200);fence.name='Timber fence pickets';fence.castShadow=fence.receiveShadow=true;root.add(fence);
 for(let i=0;i<200;i++){dummy.position.set(i<100?-25:25.5,.51,7+(i%100)*.23);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();fence.setMatrixAt(i,dummy.matrix);}
 for(const x of [-25,25.5]){for(let z=7;z<=30;z+=2.4)box(root,timber,.12,1.25,.12,x,.55,z);for(const y of [.23,.82])box(root,timber,.07,.09,23,x,y,18.5);}
 const order=['lawn','walk','hedge','beds','tree-1','tree-2','tree-3','tree-4'];detections.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
 const jobs=[{label:'Mow lawn',value:areaLabel(lawnArea)},{label:'Lawn edging',value:lengthLabel(34.8)},{label:'Trim hedge',value:lengthLabel(11)},{label:'Refresh mulch',value:areaLabel(bedArea)},{label:'Tree rings',value:'4 trees'}];
 return {root,detections,jobs};
}
