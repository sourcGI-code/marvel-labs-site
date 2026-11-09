import * as THREE from 'three';
import {createTireMesh} from './trailer-wheel-profile.js?v=wheel-detail-20261108';
const wheelName=name=>name.replace(/[^a-z0-9]/gi,'').toLowerCase();

export function refineTrailerWheels(root) {
  const hidden=[];
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const name=wheelName(mesh.userData.name||mesh.name);
    if(name.startsWith('treadroundtirefilmwheel')){hidden.push(mesh);return;}
    if(!name.startsWith('roundtirefilmwheel'))return;
    mesh.geometry.computeBoundingBox();
    const box=mesh.geometry.boundingBox,center=box.getCenter(new THREE.Vector3());
    const radius=Math.max(box.max.x-box.min.x,box.max.y-box.min.y)/2;
    const halfWidth=(box.max.z-box.min.z)/2;
    const data=createTireMesh(radius,halfWidth),geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
    geometry.setIndex(data.indices);geometry.computeVertexNormals();geometry.translate(center.x,center.y,center.z);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    mesh.geometry=geometry;
    mesh.userData.refinedTire=true;
  });
  // The old detached tread blocks are replaced by grooves in the tire itself.
  // Keeping every detail on the wheel also prevents a stationary tread overlay.
  for(const mesh of hidden){mesh.removeFromParent();mesh.geometry.dispose();}
}

export function refineWheelMaterial(material,meshName) {
  const name=wheelName(meshName);
  if(/^(roundtire|sidewallbead|tread).*filmwheel/.test(name)){
    material.color.setRGB(.009,.010,.011);material.roughness=.82;
    material.metalness=0;material.clearcoat=0;material.envMapIntensity=.42;
  } else if(/^(rolledsteelrim|smoothhubcap)filmwheel/.test(name)) {
    material.color.setRGB(.095,.105,.12);material.metalness=.82;
    material.roughness=.34;material.clearcoat=0;material.envMapIntensity=.65;
  }
}
