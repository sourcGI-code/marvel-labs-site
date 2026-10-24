import {GLTFLoader} from './assets/GLTFLoader.js';

// The user's supplied riding mower, including its original UV texture.
// Wheels retain independent pivots for distance-based rolling.
let source;
export async function loadZeroTurnModel(){
 source??=new GLTFLoader().loadAsync('assets/equipment/supplied-riding-mower/riding-mower.glb?v=1')
  .catch(error=>{source=undefined;throw error;});
 const model=(await source).scene.clone(true);
 model.name='Supplied riding lawn mower';
 model.userData={asset:'supplied-riding-mower',faces:'-X',footprint:[2.209,1.870],height:1.319,workingHeight:1.319,authored:true};
 model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.suppliedMower=true;
  for(const material of Array.isArray(o.material)?o.material:[o.material]){material.userData.preserveFinish=true;material.envMapIntensity=.8;}
 }});
 return model;
}
export async function replaceZeroTurnModel(target){
 const model=await loadZeroTurnModel();target.clear();target.name=model.name;
 target.userData={...target.userData,...model.userData};
 for(const child of [...model.children])target.add(child);
 return target;
}
