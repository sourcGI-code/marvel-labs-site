import * as THREE from './assets/three.module.js';
// The former handling/storage design has been withdrawn from every web scene.
// Preserve the scene API while leaving the trailer's original partition intact.
export function createAutonomousStorage(model,props){
 const floor=model.meta.floorHeight??.8275,deck=floor+.73;
 const root=new THREE.Group();root.visible=false;
 const state={visible:false,progress:0,lift:0,cartonPosition:[0,0,0],sealed:false,onRack:false,ready:false,storedPacks:0,storageVisible:false};
 function draw(){for(const key of ['rack','conveyor','sink','carton'])if(props[key])props[key].visible=false;return state;}
 draw();
 return {draw,root,portPoint:[model.meta.partitionX+.14,deck+.26,0],floor,deck,setPalette(){},inspect:()=>state};
}
