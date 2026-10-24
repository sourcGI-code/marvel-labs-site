import * as THREE from './assets/three.module.js';

// Metre-scale, manufactured profiles. Small edge radii preserve flat faces.
const cache=new Map();
export function edgeBox(size,radius=.0012){
 const r=Math.min(radius,Math.min(...size)*.22),key=[...size,r].join('/');
 if(cache.has(key))return cache.get(key);
 const [w,h,d]=size,shape=new THREE.Shape();
 shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);
 shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,steps:1,curveSegments:3});
 geometry.translate(0,0,-d/2+r);cache.set(key,geometry);return geometry;
}
export function fabricatedBox(parent,size,at,material,name='Fabricated component'){
 const mesh=new THREE.Mesh(edgeBox(size),material);mesh.position.set(...at);mesh.name=name;
 mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function fastener(parent,at,material,{axis='x',radius=.0065}={}){
 const g=new THREE.Group();g.position.set(...at);g.name='M8 bolt and washer';parent.add(g);
 const rotation=axis==='x'?[0,0,-Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0];
 for(const [r,height,offset,sides] of [[radius*1.4,.0016,0,20],[radius,.005,.0033,6]]){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,height,sides),material);
  mesh.rotation.set(...rotation);mesh.position[axis]=offset;mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
 }
 return g;
}
function roundedRect(shape,x,y,w,h,r){
 shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);
 shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);
 shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);shape.closePath();
}
export function slottedChannel(parent,at,height,material){
 const group=new THREE.Group();group.name='Folded slotted steel upright';group.position.set(...at);parent.add(group);
 const width=.044,depth=.032,thickness=.0025,shape=new THREE.Shape();
 roundedRect(shape,-width/2,-height/2,width,height,.002);
 for(let y=-height/2+.075;y<height/2-.055;y+=.05){
  const hole=new THREE.Path();roundedRect(hole,-.0045,y,.009,.020,.004);shape.holes.push(hole);
 }
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:5});
 geometry.rotateY(Math.PI/2);geometry.translate(depth/2-thickness,0,0);
 const web=new THREE.Mesh(geometry,material);web.name='Punched mounting slots';web.castShadow=web.receiveShadow=true;group.add(web);
 for(const z of [-width/2+thickness/2,width/2-thickness/2])fabricatedBox(group,[depth,height,thickness],[0,0,z],material,'Folded return flange');
 return group;
}
export function hollowBeam(parent,size,at,material,name='Hollow steel section'){
 const [x,y,z]=size,t=.0025,group=new THREE.Group();group.position.set(...at);group.name=name;parent.add(group);
 // Open ends expose the actual wall thickness, rather than a solid block.
 if(x>=y&&x>=z){
  for(const side of [-1,1]){fabricatedBox(group,[x,t,z],[0,side*(y-t)/2,0],material);fabricatedBox(group,[x,y-2*t,t],[0,0,side*(z-t)/2],material);}
 }else if(y>=x&&y>=z){
  for(const side of [-1,1]){fabricatedBox(group,[t,y,z],[side*(x-t)/2,0,0],material);fabricatedBox(group,[x-2*t,y,t],[0,0,side*(z-t)/2],material);}
 }else{
  for(const side of [-1,1]){fabricatedBox(group,[x,t,z],[0,side*(y-t)/2,0],material);fabricatedBox(group,[t,y-2*t,z],[side*(x-t)/2,0,0],material);}
 }
 return group;
}
