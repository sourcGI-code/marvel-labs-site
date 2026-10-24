import * as THREE from './assets/three.module.js';
import {createProperty} from './yard-property.js?v=10';
import {createMownTurf} from './yard-realism.js?v=1';

const ASSETS='assets/yard/';
// A real, metre-scale landscape. All assets are local; the site never calls an
// asset provider at runtime. The same ground remains from approach to storage.
export async function createYard(renderer){
 const root=new THREE.Group();root.name='Landscaped worksite';root.visible=false;
 const reveal={value:0},materials=new Set(),loader=new THREE.TextureLoader(),cache=new Map();
 const anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 function texture(file,color=false,repeat=1){
  const key=`${file}/${repeat}/${color}`;
  if(!cache.has(key))cache.set(key,loader.loadAsync(ASSETS+file).then(t=>{
   t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=anisotropy;
   t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.setScalar(repeat);return t;
  }));return cache.get(key);
 }
 function surface(options){
  const m=new THREE.MeshStandardMaterial({roughness:.94,envMapIntensity:.6,...options});
  // Opaque landscape surfaces write depth normally; leaf cutouts use their
  // supplied opacity masks. The property never dissolves into a small tile.
  materials.add(m);return m;
 }
 function mesh(geometry,material,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o;}
 async function vegetation(name){
  const [manifest,response]=await Promise.all([fetch(ASSETS+name+'.json?v=2').then(r=>{if(!r.ok)throw Error('Yard vegetation is unavailable');return r.json();}),fetch(ASSETS+name+'.bin.gz')]);
  if(!response.ok)throw Error('Yard geometry is unavailable');
  const data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),group=new THREE.Group(),mats={};group.name=`Scanned ${name}`;
  const prefix=name.includes('/')?name.slice(0,name.lastIndexOf('/')+1):'';
  await Promise.all(Object.entries(manifest.materials).map(async([id,m])=>{
   const [map,alphaMap,normalMap,roughnessMap]=await Promise.all([m.map?texture(prefix+m.map,true):null,m.alphaMap?texture(prefix+m.alphaMap):null,m.normalMap?texture(prefix+m.normalMap):null,m.roughnessMap?texture(prefix+m.roughnessMap):null]);
   // The supplied RGBA diffuse already carries the leaf cutout. Applying the
   // separate alpha again erodes the canopy, especially in distant mip levels.
   mats[id]=surface({map,alphaMap:m.map==='tree_small_02_leaves-color.webp'?null:alphaMap,normalMap,roughnessMap,normalScale:new THREE.Vector2(.55,.55),alphaTest:alphaMap ? (m.alphaTest??.15) : 0,alphaToCoverage:!!alphaMap,side:THREE.DoubleSide,color:new THREE.Color(...(m.color||[1,1,1])),roughness:roughnessMap?1:(m.roughness??.82)});
  }));
  for(const {offset,count,indices,material} of manifest.meshes){
   const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(data,offset,count*3),3));
   g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(data,offset+count*12,count*3),3));
   g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(data,offset+count*24,count*2),2));
   g.setIndex(new THREE.BufferAttribute(new Uint32Array(data,offset+count*32,indices),1));g.computeBoundingSphere();
   if(name==='realism/jacaranda-canopy')g.scale(4.6/manifest.height,4.6/manifest.height,4.6/manifest.height);
   const o=new THREE.Mesh(g,mats[material]);o.castShadow=o.receiveShadow=true;group.add(o);
  }return group;
 }
 const [lawnMap,lawnNormal,driveMap,driveNormal,fenceMap,tree,shrub,roofMap,roofNormal,roofRough,concreteMap,concreteNormal,concreteRough,gardenShrub,flowering]=await Promise.all([
  texture('realism/lawn-color.webp',true,1024/2),texture('realism/lawn-normal.webp',false,1024/2),
  texture('drive-color.webp',true),texture('drive-normal.webp'),texture('fence-color.webp',true),vegetation('realism/jacaranda-canopy'),vegetation('shrub'),
  texture('roof-color.webp',true),texture('roof-normal.webp'),texture('roof-rough.webp'),
  texture('concrete-color.webp',true),texture('concrete-normal.webp'),texture('concrete-rough.webp'),vegetation('realism/garden-shrub'),vegetation('realism/flowering-periwinkle')
 ]);
 // Fine surface detail close to the camera, with a continuous distant landscape.
 const farLawn=surface({map:lawnMap,normalMap:lawnNormal,normalScale:new THREE.Vector2(.23,.23),color:0x8d9c76});
 // A real opening in the distant ground avoids overlapping coplanar surfaces
 // and the triangular seams that showed up in the overview camera.
 const outlineFar=new THREE.Shape();outlineFar.moveTo(-512,-512);outlineFar.lineTo(512,-512);outlineFar.lineTo(512,512);outlineFar.lineTo(-512,512);outlineFar.closePath();
 const hole=new THREE.Path();hole.moveTo(-48,-48);hole.lineTo(-48,48);hole.lineTo(48,48);hole.lineTo(48,-48);hole.closePath();outlineFar.holes.push(hole);
 const farGround=new THREE.ShapeGeometry(outlineFar);farGround.rotateX(-Math.PI/2);
 const fp=farGround.attributes.position;for(let i=0;i<fp.count;i++)farGround.attributes.uv.setXY(i,(fp.getX(i)+48)/1024,(48-fp.getZ(i))/1024);
 mesh(farGround,farLawn,-2,-.07,30);
 const nearMap=lawnMap.clone(),nearNormal=lawnNormal.clone();nearMap.repeat.setScalar(96/2);nearNormal.repeat.copy(nearMap.repeat);
 const lawn=surface({map:nearMap,normalMap:nearNormal,normalScale:new THREE.Vector2(.32,.32),vertexColors:true,color:0x8d9c76});
 const terrain=new THREE.PlaneGeometry(96,96,192,192);terrain.rotateX(-Math.PI/2);
 const p=terrain.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)-2,z=p.getZ(i)+30;
  // Slightly undulating lawn; the entire driveway and work apron stay level.
  const edge=Math.max(0,Math.min(1,(48-Math.max(Math.abs(p.getX(i)),Math.abs(p.getZ(i))))/8));
  const outside=Math.max(0,Math.min(1,(z-35)/12))*edge;
  p.setY(i,-.07+outside*(.05*Math.sin(x*.42)*Math.cos(z*.38)+.028*Math.cos(z*.9+x*.3)));
  const variation=1+edge*(.045*Math.sin(x*.19+Math.sin(z*.17))+.02*Math.cos(z*.53+x*.31));
  const maintained=z>2.7&&z<16.3&&x>-20&&x<20;
  const nap=maintained?.055*Math.tanh(5*Math.sin((x+z*.15)*Math.PI/1.6)):0;
  colors.push(variation+nap,variation+nap,(variation+nap)*.96);
 }
 terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();mesh(terrain,lawn,-2,0,30);
 // Rounded driveway apron: room for the attached rig and the exterior output,
 // packaging station and rack. The lawn never intersects the handling area.
 const outline=new THREE.Shape();outline.moveTo(-23,-4.7);outline.lineTo(9.5,-4.7);outline.quadraticCurveTo(11,-4.7,11,-3.2);outline.lineTo(11,.7);outline.quadraticCurveTo(11,2.2,9.5,2.2);outline.lineTo(-23,2.2);outline.closePath();
 const driveGeometry=new THREE.ShapeGeometry(outline,32);driveGeometry.rotateX(Math.PI/2);
 // Shape XY becomes XZ so the apron extends toward the exterior output hatch.
 const dp=driveGeometry.attributes.position,duv=driveGeometry.attributes.uv;
 for(let i=0;i<dp.count;i++){duv.setXY(i,dp.getX(i)/2,dp.getZ(i)/2);}
 const driveway=mesh(driveGeometry,surface({map:driveMap,normalMap:driveNormal,normalScale:new THREE.Vector2(.45,.45),color:0xb4b0a5,side:THREE.DoubleSide}),0,-.035,0);driveway.name='Paved work apron';
 // A flush asphalt edge meets the lawn; no bright tubular outline around it.
 let seed=8124;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const dummy=new THREE.Object3D();
 // Short, curved blades at the lawn edges give the photographic ground parallax.
 const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.014,0,0,.014,0,0,-.008,.055,.013,.008,.055,.013,0,.105,.04],3));blade.setIndex([0,1,2,1,3,2,2,3,4]);blade.computeVertexNormals();
 const grass=new THREE.InstancedMesh(blade,surface({color:0xb3c87e,side:THREE.DoubleSide}),100000);grass.name='Distant lawn blades';grass.receiveShadow=true;root.add(grass);
 for(let i=0;i<grass.count;i++){
  let x,z;
  do{x=-28+random()*56;z=17.9+random()*16;}while((x>-9.3&&x<14&&z>16.0&&z<28)||(x>-3.8&&x<-2.2&&z<18.3)||(x>7.1&&x<13.5&&z<24)||[[-23,9],[22.6,9.7],[-23.8,27],[22.8,27.8]].some(([tx,tz])=>Math.hypot(x-tx,z-tz)<1.1));
  const outside=Math.max(0,Math.min(1,(z-35)/12));
  const y=-.07+outside*(.05*Math.sin(x*.42)*Math.cos(z*.38)+.028*Math.cos(z*.9+x*.3));
  dummy.position.set(x,y,z);dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(.35+random()*.2);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
  grass.setColorAt(i,new THREE.Color().setHSL(.21+random()*.025,.28+random()*.13,.72+random()*.16));
 }grass.instanceMatrix.needsUpdate=true;
 // The home's drive is visual context, never part of the detected work scope.
 const drive=surface({map:driveMap,normalMap:driveNormal,normalScale:new THREE.Vector2(.3,.3),color:0x696c68});
 const homeDriveGeometry=new THREE.PlaneGeometry(6.2,23);homeDriveGeometry.rotateX(-Math.PI/2);
 const homeDriveUV=homeDriveGeometry.attributes.uv;for(let i=0;i<homeDriveUV.count;i++)homeDriveUV.setXY(i,homeDriveUV.getX(i)*2.1,homeDriveUV.getY(i)*7.7);
 mesh(homeDriveGeometry,drive,10.3,-.03,13.5);
 const turf=await createMownTurf(vegetation);root.add(turf);
 const property=createProperty({surface,tree,shrub,gardenShrub,flowering,fenceMap,driveMap,lawnNormal,roofMap,roofNormal,roofRough,concreteMap,concreteNormal,concreteRough});root.add(property.root);
 return {root,detections:property.detections,jobs:property.jobs,setReveal(amount){reveal.value=amount;root.visible=amount>.001;},inspect:()=>({yardVisible:root.visible,yardReveal:reveal.value,houseVisible:true,houseRecognized:false,yardSetting:'house and garage as visual context; landscaping worksite: lawn, edging, hedges, planting beds, tree rings and a parking apron',terrainSize:[1024,1024]})};
}
