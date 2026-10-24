const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
// Compile before the scene is revealed, and spread texture uploads over tasks
// so input and video presentation are not held behind one upload batch.
export async function prepareScene({scene,camera,renderer}){
 await renderer.compileAsync(scene,camera);
 const textures=new Set();
 scene.traverse(o=>{for(const material of [o.material].flat().filter(Boolean))for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
 for(const texture of textures){await yieldTask();renderer.initTexture(texture);}
 await yieldTask();
}
