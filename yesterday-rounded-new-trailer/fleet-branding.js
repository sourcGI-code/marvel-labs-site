import * as THREE from './assets/three.module.js';

let assets;
async function graphics(){
 if(assets)return assets;
 assets=(async()=>{
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
  function texture(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
  const [side,s]=canvas(2048,640);
  s.fillStyle='#080b0d';s.fillRect(0,0,2048,640);
  s.fillStyle='#15252a';s.beginPath();s.moveTo(1470,0);s.lineTo(1820,0);s.lineTo(1440,640);s.lineTo(1090,640);s.fill();
  s.fillStyle='#43d5e4';s.beginPath();s.moveTo(1810,0);s.lineTo(1855,0);s.lineTo(1475,640);s.lineTo(1430,640);s.fill();
  s.fillStyle='#f3f6f4';s.font='bold 108px Arial, sans-serif';s.fillText('AUTONOMOUS',120,292);
  s.font='bold 120px Arial, sans-serif';s.fillText('MICROFACTORIES',116,420);
  s.fillStyle='#55d4df';s.fillRect(124,480,660,4);
  const [rear,r]=canvas(1024,768);r.fillStyle='#080b0d';r.fillRect(0,0,1024,768);
  r.fillStyle='#f3f6f4';r.font='bold 76px Arial, sans-serif';r.textAlign='center';r.fillText('AUTONOMOUS',512,334);r.font='bold 70px Arial, sans-serif';r.fillText('MICROFACTORIES',512,421);
  r.fillStyle='#4dd8e8';r.fillRect(110,480,804,5);
  return {side:texture(side),rear:texture(rear)};
 })();return assets;
}

// Project the graphic onto the actual body triangles. UVs outside the artwork
// hit its transparent border, keeping lettering flush with curved door skins.
function project(mesh,{axis,sign,uAxis,flip=1,u0,u1,y0,y1,depth,map,name}){
 const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,idx=g.index;
 const pos=[],norm=[],uv=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<(idx?.count??p.count);i+=3){
  const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k),points=ids.map(k=>new THREE.Vector3().fromBufferAttribute(p,k));
  const centre=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
  a.subVectors(points[1],points[0]);b.subVectors(points[2],points[0]);c.crossVectors(a,b).normalize();
  if(centre[axis]*sign<depth||c[axis]*sign<.45)continue;
  if(Math.max(...points.map(v=>v[uAxis]))<u0||Math.min(...points.map(v=>v[uAxis]))>u1||Math.max(...points.map(v=>v.y))<y0||Math.min(...points.map(v=>v.y))>y1)continue;
  ids.forEach((k,j)=>{
   const q=points[j],normal=new THREE.Vector3().fromBufferAttribute(n,k);q.addScaledVector(normal,.0035);
   pos.push(q.x,q.y,q.z);norm.push(normal.x,normal.y,normal.z);
   const u=(q[uAxis]-u0)/(u1-u0);uv.push(flip>0?u:1-u,(q.y-y0)/(y1-y0));
  });
 }
 if(!pos.length)return;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 const material=new THREE.MeshStandardMaterial({map,roughness:.48,metalness:.12,transparent:true,alphaTest:.05,polygonOffset:true,polygonOffsetFactor:-2});
 const decal=new THREE.Mesh(geometry,material);decal.name=name;decal.userData.fleetGraphic=true;decal.receiveShadow=true;mesh.parent.add(decal);
}

export async function brandTrailer(root){
 if(root.userData.autonomousFleet)return;root.userData.autonomousFleet=true;
 const {side,rear}=await graphics(),meshes=[];
 root.traverse(o=>{if(o.isMesh&&!o.userData.fleetGraphic)meshes.push(o);});
 const length=root.name.startsWith('16')?4.8768:6.096;
 for(const mesh of meshes){
  if(['factoryNear','cargoNear','factoryFar','cargoFar','door'].includes(mesh.parent.name||mesh.parent.userData.part)){
   for(const sign of [-1,1])project(mesh,{axis:'z',sign,uAxis:'x',flip:sign,u0:-length/2+.18,u1:length/2-.08,y0:.91,y1:2.49,depth:1.20,map:side,name:'Autonomous Microfactories trailer wrap'});
  }
  if((mesh.parent.name||mesh.parent.userData.part)==='rear')project(mesh,{axis:'x',sign:1,uAxis:'z',flip:-1,u0:-1.18,u1:1.18,y0:.91,y1:2.49,depth:length/2-.025,map:rear,name:'Autonomous Microfactories rear wrap'});
 }
}

export async function exportFleetGraphics(roots){
 const textures=await graphics(),maps=Object.fromEntries(Object.entries(textures).map(([k,t])=>[k,t.image.toDataURL('image/png')]));
 const meshes=[];
 for(const [owner,root] of Object.entries(roots))root.traverse(o=>{
  if(!o.userData.fleetGraphic)return;
  meshes.push({owner,name:o.name,positions:Array.from(o.geometry.attributes.position.array),normals:Array.from(o.geometry.attributes.normal.array),uv:Array.from(o.geometry.attributes.uv.array),texture:Object.entries(textures).find(([,t])=>t===o.material.map)[0]});
 });
 return {maps,meshes};
}
