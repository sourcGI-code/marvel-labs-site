import {GLTFLoader} from './assets/GLTFLoader.js';
import {replaceZeroTurnModel} from './zero-turn-model.js';

// Keep one parsed asset in memory; both scenes share its geometry and each
// renderer gives its clone the same manufactured finishes.
let pushMowerAsset;
export async function loadPushMower(){
 pushMowerAsset??=new GLTFLoader().loadAsync('assets/equipment/modern-push-mower.glb');
 try{
  const source=await pushMowerAsset,root=source.scene.clone(true);
  root.name='Push mower / Lajos Makra';
  root.userData={faces:'-X',asset:'modern-push-mower',author:'Lajos Makra',license:'CC BY 4.0',height:.9743};
  root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.authoredEquipment=true;}});
  return root;
 }catch(error){pushMowerAsset=undefined;throw error;}
}

export async function upgradeEquipment(props){
 await replaceZeroTurnModel(props.zeroTurn);
 try{props.pushMower=await loadPushMower();}
 catch(error){console.warn('Detailed push mower could not load; using the equipment illustration.',error.message);}
}
