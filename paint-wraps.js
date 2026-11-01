// Graphics layers share the same physical trailer, finish, camera and lights.
export const wrapDesigns={
 classic:{label:'Original',detail:'Slim cyan stripes · original factory lettering'},
 flow:{label:'Flow',detail:'Sweeping cyan band · fine titanium edge'},
 precision:{label:'Precision',detail:'Angular outlines · precise cyan accents'}
};
export function createWrapManager(initial){
 let current=wrapDesigns[initial]?initial:'classic';const layers=[];
 const apply=()=>{for(const o of layers)o.visible=o.userData.marvelWrap===current;};
 return {get current(){return current;},register(root){root.traverse(o=>{if(wrapDesigns[o.userData.marvelWrap])layers.push(o);});apply();},select(id){if(!wrapDesigns[id])return false;current=id;apply();return true;}};
}
