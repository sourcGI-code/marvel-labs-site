// Placement study: transform the ORIGINAL artwork nodes only.
// Original texture, type, tracking, line breaks, underline, UVs and materials stay intact.
export const letteringOptions = {
 balanced: {number:'01',title:'Larger',description:'Larger original side graphics, centered on the wall. Rear logo centered on the ramp.',scale:1.15,elevation:1.57,rearElevation:1.50},
 signature: {number:'02',title:'Fuller',description:'More side-wall coverage, slightly higher. Rear logo in the upper middle of the ramp.',scale:1.25,elevation:1.78,rearElevation:1.82},
 bold: {number:'03',title:'High',description:'The largest fit within the existing stripes and doors, placed higher. Rear logo near the top of the ramp.',scale:1.38,elevation:2.02,rearElevation:2.10}
};
export function createLetteringStudy(THREE, renderer, invalidate) {
 const surfaces=[], rearMarks=[], roots=[];
 const params=new URLSearchParams(location.search);
 let current=letteringOptions[params.get('option')]?params.get('option'):'signature';
 const boxOf=o=>{o.geometry.computeBoundingBox();o.updateMatrix();return o.geometry.boundingBox.clone().applyMatrix4(o.matrix);};
 // Find a stripe's actual extent at the lettering's height, not its full-height box.
 function stripeRange(o,low,high) {
  const p=o.geometry.attributes.position,idx=o.geometry.index,vertices=[];
  for(let i=0;i<p.count;i++)vertices.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrix));
  let min=Infinity,max=-Infinity;
  const add=x=>{min=Math.min(min,x);max=Math.max(max,x);};
  const count=idx?idx.count:p.count;
  for(let i=0;i<count;i+=3){
   const v=[0,1,2].map(k=>vertices[idx?idx.getX(i+k):i+k]);
   for(let k=0;k<3;k++){
    const a=v[k],b=v[(k+1)%3];if(a.y>=low&&a.y<=high)add(a.x);
    for(const y of [low,high])if((a.y<y&&b.y>y)||(a.y>y&&b.y<y))add(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));
   }
  }
  return {min,max};
 }
 function placeSide(side,spec) {
  const dims=side.bounds.getSize(new THREE.Vector3()),pivot=side.bounds.getCenter(new THREE.Vector3());
  let scale=spec.scale,left,right;
  for(let i=0;i<5;i++){
   const low=spec.elevation-dims.y*scale/2,high=spec.elevation+dims.y*scale/2;
   left=side.wall.min.x+.12;right=side.wall.max.x-.12;
   for(const stripe of side.stripes){
    const range=stripeRange(stripe,low,high);
    if(range.max<pivot.x)left=Math.max(left,range.max+.075);
    else if(range.min>pivot.x)right=Math.min(right,range.min-.075);
   }
   for(const b of side.doors)if(b.min.y<high&&b.max.y>low){
    if(b.min.x>pivot.x)right=Math.min(right,b.min.x-.10);
    else if(b.max.x<pivot.x)left=Math.max(left,b.max.x+.10);
   }
   scale=Math.min(spec.scale,(right-left)/dims.x);
  }
  const target=new THREE.Vector3((left+right)/2,spec.elevation,pivot.z);
  const transform=new THREE.Matrix4().makeTranslation(target.x,target.y,target.z)
   .multiply(new THREE.Matrix4().makeScale(scale,scale,1))
   .multiply(new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z));
  for(const item of side.nodes){
   const matrix=transform.clone().multiply(item.originalMatrix);
   matrix.decompose(item.mesh.position,item.mesh.quaternion,item.mesh.scale);item.mesh.updateMatrix();
  }
  side.actualScale=scale;side.target=target;side.clearance={left,right};
 }
 function apply() {
  const spec=letteringOptions[current];
  for(const side of surfaces)placeSide(side,spec);
  for(const mark of rearMarks){mark.mesh.position.copy(mark.originalPosition);mark.mesh.position.y+=spec.rearElevation-mark.originalHeight;mark.mesh.updateMatrix();}
  for(const b of document.querySelectorAll('[data-lettering]'))b.setAttribute('aria-pressed',String(b.dataset.lettering===current));
  const label=document.querySelector('[data-lettering-description]');if(label)label.textContent=spec.description;
  document.querySelector('.reserve-stage').dataset.lettering=current;
  const url=new URL(location.href);url.searchParams.set('option',current);url.searchParams.set('v','2');history.replaceState(null,'',url);
  invalidate();
 }
 function register(root,size){
  roots.push(root);root.updateWorldMatrix(true,true);
  const sides={near:[],far:[]},stripes=[],doors=[];let wall;
  root.traverse(o=>{
   if(!o.isMesh)return;
   if(/Wrap.*lettering/.test(o.name)){o.updateMatrix();sides[/Near/.test(o.name)?'near':'far'].push({mesh:o,originalMatrix:o.matrix.clone()});}
   if(/Wrap.*stripe/.test(o.name)){o.updateMatrix();stripes.push(o);}
   if(o.name==='body_shell')wall=boxOf(o);
   if(['factory_port_door','pass_through_door'].includes(o.name))doors.push(boxOf(o));
   if(/Wrap.*wordmark.*rear/.test(o.name)){
    o.geometry.computeBoundingBox();const center=o.geometry.boundingBox.getCenter(new THREE.Vector3());
    o.localToWorld(center);root.worldToLocal(center);
    rearMarks.push({mesh:o,size,originalPosition:o.position.clone(),originalHeight:center.y});
   }
  });
  for(const [face,nodes] of Object.entries(sides)){
   if(!nodes.length)continue;const bounds=new THREE.Box3();for(const n of nodes)bounds.union(boxOf(n.mesh));
   const sign=Math.sign(bounds.getCenter(new THREE.Vector3()).z);
   surfaces.push({size,face,nodes,bounds,wall,stripes:stripes.filter(o=>Math.sign(boxOf(o).getCenter(new THREE.Vector3()).z)===sign),doors:doors.filter(b=>Math.sign(b.getCenter(new THREE.Vector3()).z)===sign)});
  }
  apply();
 }
 function select(id){if(letteringOptions[id]){current=id;apply();}}
 for(const b of document.querySelectorAll('button[data-lettering]'))b.addEventListener('click',()=>select(b.dataset.lettering));
 window.__letteringStudy={select,get current(){return current;},surfaces,rearMarks,options:letteringOptions};
 apply();return {register,select};
}
