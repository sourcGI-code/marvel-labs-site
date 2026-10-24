import * as THREE from './assets/three.module.js';
import {createAutonomousStorage} from './autonomous-storage.js?v=7';

export function createCargoPackaging(model,props){
 const storage=createAutonomousStorage(model,props),lights=new THREE.Group();model.root.add(lights);
 const centre=(model.meta.partitionX+model.meta.length/2)/2;
 const glow=new THREE.MeshStandardMaterial({color:0xfff1d6,emissive:0xffedd3,emissiveIntensity:2});
 for(const z of [-1.10,1.10]){
  const strip=new THREE.Mesh(new THREE.BoxGeometry(model.meta.length/2-model.meta.partitionX-.12,.025,.025),glow);
  strip.position.set(centre,2.40,z);lights.add(strip);
 }
 for(const z of [-1.10,1.10]){
  const light=new THREE.PointLight(0xffefda,2.2,6,2);light.name='Cargo / linear ceiling source';light.position.set(centre,2.37,z);lights.add(light);
 }
 function draw(p){lights.visible=p>=.50;return storage.draw((p-.82)/.18,{visible:p>=.50});}
 function reset(){lights.visible=false;storage.draw(0,{visible:false});}
 reset();return {draw,reset,setPalette:storage.setPalette,inspect:storage.inspect};
}
