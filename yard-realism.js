import * as THREE from './assets/three.module.js';

// Authored curved blade clumps, repeated only on grass. The public page plays
// the baked footage; this geometry is used by the authoring scene.
export async function createMownTurf(load){
 const root=new THREE.Group();root.name='Authored short-cut turf';
 const sources=await Promise.all([1,2,3].map(i=>load(`realism/turf-tile-light-${i}`)));
 const close=sources[0]; // Same blade density throughout the survey lawn.
 let seed=291;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const dummy=new THREE.Object3D(),positions=[[],[],[]],edges=[];
 const rings=[[-23,9],[22.6,9.7],[-23.8,27],[22.8,27.8]];
 function grassAt(x,z){return !((x>-9.35&&x<14.1&&z>16.0&&z<28)||(x>-3.82&&x<-2.18&&z<18.3)||(x>7.02&&x<13.58&&z<24)||rings.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<1.14));}
 const near=[];
 for(let x=-24.9;x<25;x+=.20)for(let z=2.36;z<18;z+=.20){
  const xx=x,zz=z;
  if(!grassAt(xx,zz))continue;
  if(zz<9.5&&xx>-7&&xx<17)near.push([xx,zz]);
  else positions[Math.floor(random()*3)].push([xx,zz]);
 }
 // The outline has true blade silhouettes rather than a sharp green plane.
 for(let x=-23;x<20;x+=.20){const z=2.20;if(grassAt(x,z))edges.push([x,z]);}
 for(let z=2.5;z<16;z+=.20)for(const x of [-3.95,-2.05,6.90,13.70])if(grassAt(x,z))edges.push([x,z]);
 function instances(source,list,name){
  for(const mesh of source.children){
   const grass=new THREE.InstancedMesh(mesh.geometry,mesh.material,list.length);grass.name=name;grass.receiveShadow=true;grass.castShadow=false;
   list.forEach(([x,z],i)=>{
    dummy.position.set(x,-.068,z);dummy.rotation.set(0,Math.floor((x+25)/1.6)%2?Math.PI:0,0);
    dummy.scale.setScalar(1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
    const variation=.97+random()*.03;grass.setColorAt(i,new THREE.Color(variation,variation,variation));
   });grass.instanceMatrix.needsUpdate=true;grass.computeBoundingSphere();root.add(grass);
  }
 }
 sources.forEach((s,i)=>instances(s,positions[i],`Mown turf variation ${i+1}`));instances(close,[...edges,...near],'Dense blades at lawn edges');
 root.userData={geometry:'curved authored blades',heightMetres:[.043,.064],clumps:positions.reduce((n,p)=>n+p.length,0)+edges.length};
 return root;
}

// Dense leafy plants with curved individual leaves. Variation is deterministic
// so offline frames never shuffle, pop or change density while scrolling.
export function createGardenPlantings(gardenShrub,flowering){
 const root=new THREE.Group();root.name='Layered garden planting';
 let seed=178;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 if(gardenShrub&&flowering){
  const plant=(source,x,z,s)=>{const p=source.clone(true);p.position.set(x,.015,z);p.rotation.y=random()*Math.PI*2;p.scale.setScalar(s);root.add(p);};
  for(const [start,end] of [[-8.6,-4.4],[-1.6,4.5]])for(let x=start;x<end;x+=.72){plant(gardenShrub,x,17.25,1.05+random()*.4);plant(flowering,x-.16,16.45,.82+random()*.22);if(random()>.42)plant(gardenShrub,x+.25,16.8,.75);}
  for(let z=4.3;z<15.2;z+=.65)plant(gardenShrub,-20.65,z,2.0+random()*.2);
  for(let x=-40;x<=40;x+=2.0)plant(gardenShrub,x,35+random()*1.6,3.0+random()*.6);
  return root;
 }
 const dummy=new THREE.Object3D(),leaf=new THREE.BufferGeometry();
 leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.018,.026,.004,.018,.026,.004,-.024,.059,.011,.024,.059,.011,-.016,.084,.021,.016,.084,.021,0,.104,.032],3));
 leaf.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,4,6,5,5,6,7]);leaf.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0x69803b,roughness:.72,side:THREE.DoubleSide,envMapIntensity:.8});
 const plants=[];
 for(const x of [-8.4,-7.1,-5.7,-4.5,-1.5,-.2,1.2,2.5,3.9])plants.push([x,17.05,.48+random()*.18,.50+random()*.25]);
 for(let z=4.5;z<15;z+=.85)plants.push([-20.65,z,.58,1.0+random()*.15]);
 for(let x=-40;x<=40;x+=2.8)plants.push([x,35+random()*2,1.7+random()*.6,1.8+random()]);
 const leaves=new THREE.InstancedMesh(leaf,material,plants.length*700);leaves.name='Leafy shrubs and boundary';leaves.castShadow=leaves.receiveShadow=true;root.add(leaves);
 let index=0;
 plants.forEach(([x,z,radius,height],pi)=>{
  for(let i=0;i<700;i++){
   const a=random()*Math.PI*2,up=random(),r=radius*Math.sqrt(Math.max(0,1-(up*.92)**2))*(.72+random()*.28);
   dummy.position.set(x+Math.cos(a)*r,.02+up*height,z+Math.sin(a)*r);
   dummy.rotation.set((random()-.5)*2.4,a+(random()-.5),random()*2-1);
   const s=(pi<9?.8:pi<22?1.1:1.8)+random()*.6;dummy.scale.set(s,s,s);dummy.updateMatrix();leaves.setMatrixAt(index,dummy.matrix);
   leaves.setColorAt(index,new THREE.Color().setHSL(.21+random()*.035,.27+random()*.20,.52+up*.21+random()*.10));index++;
  }
 });leaves.instanceMatrix.needsUpdate=true;
 const flowerMat=new THREE.MeshStandardMaterial({color:0xe8e8c6,roughness:.9,side:THREE.DoubleSide});
 const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(.017,5,3),flowerMat,9*180);petals.name='Cream flowering clusters';petals.castShadow=petals.receiveShadow=true;root.add(petals);
 for(let i=0;i<petals.count;i++){
  const plant=plants[Math.floor(i/180)],a=random()*Math.PI*2,r=Math.sqrt(random())*.20;
  dummy.position.set(plant[0]+Math.cos(a)*r,.52+random()*.14,plant[1]-.18+Math.sin(a)*r);dummy.rotation.set(random()*3,random()*3,0);dummy.scale.setScalar(.6+random()*.7);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);
 }
 return root;
}
