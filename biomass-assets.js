import * as THREE from './assets/three.module.js';

const base='assets/biomass/';
async function json(name){const r=await fetch(`${base}${name}.json?v=1`);if(!r.ok)throw Error(`The ${name} specimen is unavailable`);return r.json();}
function textureLoader(renderer){
 const loader=new THREE.TextureLoader(),cache=new Map();
 return async name=>{
  if(!cache.has(name))cache.set(name,loader.loadAsync(base+name).then(map=>{
   map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;
  }));
  return cache.get(name);
 };
}
function center(group){
 group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3()),offset=box.getCenter(new THREE.Vector3()),scale=2.1/Math.max(size.x,size.y,size.z);
 for(const child of group.children){child.position.sub(offset).multiplyScalar(scale);child.scale.multiplyScalar(scale);}
 group.userData.dimensions=size.multiplyScalar(scale).toArray();return group;
}
async function meshSpecimen(name,loadTexture){
 const [meta,response]=await Promise.all([json(name),fetch(`${base}${name}.bin?v=1`)]);
 if(!response.ok)throw Error(`The ${name} mesh is unavailable`);
 const data=await response.arrayBuffer(),materials={};
 await Promise.all(Object.entries(meta.materials).map(async([key,m])=>{
  materials[key]=new THREE.MeshStandardMaterial({name:`supplied-${key}`,color:new THREE.Color(...m.color),map:m.texture?await loadTexture(m.texture):null,roughness:m.roughness,metalness:m.metalness,alphaTest:m.alphaTest,alphaToCoverage:!!m.alphaTest,side:THREE.DoubleSide,envMapIntensity:.35});
 }));
 const group=new THREE.Group();group.name=`Biomass / ${name}`;
 for(const {offset,count,indices,material} of meta.meshes){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(data,offset,count*3),3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(data,offset+count*12,count*3),3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(data,offset+count*24,count*2),2));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data,offset+count*32,indices),1));geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,materials[material]);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 }
 group.userData={specimen:name,source:meta.source,representation:'supplied mesh',triangles:meta.triangles};return center(group);
}
async function algaeSpecimen(loadTexture){
 const meta=await json('seaweed'),maps=await Promise.all(meta.variants.map(v=>loadTexture(v.texture)));
 const materials=maps.map((map,i)=>new THREE.MeshStandardMaterial({name:`supplied-algae-${i}`,map,roughness:.69,metalness:0,side:THREE.DoubleSide,alphaTest:.15,alphaToCoverage:true,envMapIntensity:.25}));
 const group=new THREE.Group();group.name='Biomass / seaweed';
 // The source is a photographic cutout pack. Curved, overlapping fronds give
 // the collection depth and parallax without presenting it as a scanned mesh.
 for(let i=0;i<11;i++){
  const index=i%maps.length,height=1.4+(i%4)*.18,width=height*maps[index].image.width/maps[index].image.height;
  const geometry=new THREE.PlaneGeometry(width,height,12,28),positions=geometry.attributes.position;
  for(let j=0;j<positions.count;j++){
   const t=(positions.getY(j)+height/2)/height,u=positions.getX(j)/width;
   positions.setXYZ(j,positions.getX(j)+Math.sin(t*2.4+i)*.09*t,positions.getY(j),Math.sin(t*Math.PI)*(.12+.06*(i%3))+Math.sin(u*3)*.07*t);
  }
  geometry.computeVertexNormals();const frond=new THREE.Mesh(geometry,materials[index]);
  const angle=i*2.39996,radius=i<5?.14:.28;
  frond.position.set(Math.cos(angle)*radius,height/2-.85,Math.sin(angle)*radius);
  frond.rotation.set(Math.sin(i)*.13,angle,Math.cos(i*1.7)*.22);frond.castShadow=frond.receiveShadow=true;group.add(frond);
 }
 group.userData={specimen:'seaweed',source:meta.source,representation:'photographic cutouts on curved 3D fronds'};return center(group);
}
export async function loadSuppliedBiomass(renderer){
 const loadTexture=textureLoader(renderer);
 const [grass,seaweed,wood]=await Promise.all([meshSpecimen('grass',loadTexture),algaeSpecimen(loadTexture),meshSpecimen('wood',loadTexture)]);
 return {grass,seaweed,wood};
}
