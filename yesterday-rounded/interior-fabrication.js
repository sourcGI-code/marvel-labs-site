import * as THREE from './assets/three.module.js';
import {edgeBox} from './fabricated-parts.js?v=1';

// Visual construction details, in metres. These are illustrative profiles,
// not a rated restraint installation or a fabrication specification.
export function finishedPart(parent,size,at,material,name){
 const geometry=edgeBox(size,Math.min(.0012,Math.min(...size)*.2)).clone();
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
 // UVs follow physical distance: the same finish has the same grain size on
 // a small trim piece and a full liner sheet, instead of stretching per box.
 for(let i=0;i<p.count;i++){
  const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
  if(ax>=ay&&ax>=az)uv.setXY(i,p.getZ(i),p.getY(i));
  else if(ay>=az)uv.setXY(i,p.getX(i),p.getZ(i));
  else uv.setXY(i,p.getX(i),p.getY(i));
 }
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...at);mesh.name=name;
 mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

export function sheetFixings(parent,locations,material,axis='z'){
 if(!locations.length)return;
 const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,6),material,locations.length);
 mesh.name='Small domed liner rivets';mesh.castShadow=mesh.receiveShadow=true;
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(.0035,.0035,.0035);
 scale[axis]=.00115;
 locations.forEach((at,index)=>{matrix.compose(new THREE.Vector3(...at),rotation,scale);mesh.setMatrixAt(index,matrix);});
 mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);
}

function roundedPath(path,x,y,w,h,r){
 path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);
 path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);
 path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);
}

export function cargoRail(parent,start,end,y,side,metal,shadow,endCap){
 const group=new THREE.Group();group.name='Punched cargo restraint rail';parent.add(group);
 // A shallow, folded 12-gauge profile with actual openings. Approximate
 // Series E/A proportions follow Ancra's published logistic-track catalog.
 const length=end-start,centre=(start+end)/2,webHeight=.077,thickness=.0026;
 const shape=new THREE.Shape();roundedPath(shape,-length/2,-webHeight/2,length,webHeight,.002);
 for(let x=-length/2+.04;x<length/2-.025;x+=.0508){
  const opening=new THREE.Path();roundedPath(opening,x-.007,-.0305,.014,.061,.0015);shape.holes.push(opening);
 }
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:3});
 const web=new THREE.Mesh(geometry,metal);web.name='Punched steel web with open slots';
 web.position.set(centre,y,side*1.128);web.rotation.y=side===1?Math.PI:0;
 web.castShadow=web.receiveShadow=true;group.add(web);
 // The recess and return folds expose material thickness; no painted-on slots.
 finishedPart(group,[length,.079,.001],[centre,y,side*1.138],shadow,'Recess behind punched rail');
 for(const sign of [-1,1]){
  finishedPart(group,[length,.0026,.011],[centre,y+sign*.039,side*1.133],metal,'Bent rail return');
  finishedPart(group,[length,.024,.0026],[centre,y+sign*.050,side*1.138],metal,'Rail mounting flange');
 }
 const rivets=[];
 for(let x=start+.035;x<end-.02;x+=.2032)for(const sign of [-1,1])rivets.push([x,y+sign*.050,side*1.135]);
 sheetFixings(group,rivets,metal);
 for(const x of [start-.003,end+.003])finishedPart(group,[.009,.126,.015],[x,y,side*1.133],endCap,'Rounded rail end cap');
 return group;
}

export function curvedCove(parent,start,end,y,z,radius,side,ceiling,material){
 // Quarter-circle coving, not a rectangular bar. Its tangent meets the wall
 // and the horizontal surface, with only a narrow shadow at the sheet edge.
 const positions=[],normals=[],uvs=[],indices=[],segments=10;
 for(let i=0;i<=segments;i++){
  const angle=i/segments*Math.PI/2;
  const py=y+(ceiling?-1:1)*radius*(1-Math.cos(angle));
  const pz=z-side*radius*(1-Math.sin(angle));
  for(const x of [start,end]){
   positions.push(x,py,pz);normals.push(0,ceiling?-Math.cos(angle):Math.cos(angle),-side*Math.sin(angle));uvs.push(x,radius*angle);
  }
  if(i<segments){
   const n=i*2;
   if((side<0)!==ceiling)indices.push(n,n+1,n+2,n+1,n+3,n+2);
   else indices.push(n,n+2,n+1,n+1,n+2,n+3);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
 const mat=material.clone();mat.side=THREE.DoubleSide;
 const mesh=new THREE.Mesh(geometry,mat);mesh.name=ceiling?'Curved roof-to-wall trim':'Coved floor edging';mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
