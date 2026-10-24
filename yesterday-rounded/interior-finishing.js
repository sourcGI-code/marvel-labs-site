import * as THREE from './assets/three.module.js';
import {createAutonomousStorage} from './autonomous-storage.js?v=5';
import {finishedPart,sheetFixings,cargoRail,curvedCove} from './interior-fabrication.js?v=2';

const clamp=t=>Math.max(0,Math.min(1,t));
const phase=(p,a,b)=>clamp((p-a)/(b-a));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=THREE.MathUtils.lerp;
const floor=.8275;

// Metres, in the trailer's coordinates. The original exterior hatch stays shut.
// Only a baffled product port opens in the partition; machinery is never exposed.
export function createInteriorFinishing(model,props){
 const {root,parts,meta}=model,wall=meta.partitionX+.06;
 const room=new THREE.Group();room.name='Interior finishing bay';root.add(room);
 const paint=new THREE.MeshStandardMaterial({name:'Warm white coated liner',color:0xd0d1c9,roughness:.55,metalness:.025});
 const trim=new THREE.MeshStandardMaterial({name:'Satin anodized interior aluminum',color:0xa2aaa9,roughness:.43,metalness:.82});
 const rail=new THREE.MeshStandardMaterial({name:'Satin zinc cargo rail',color:0x8f9694,roughness:.52,metalness:.77});
 const dark=new THREE.MeshStandardMaterial({name:'Recessed rail shadow',color:0x333937,roughness:.86});
 const seal=new THREE.MeshStandardMaterial({name:'Flexible dark edge seals',color:0x303533,roughness:.91,metalness:0});
 const rubber=new THREE.MeshStandardMaterial({name:'Fine textured rubber load floor',color:0x323635,roughness:.88,metalness:0});
 const led=new THREE.MeshStandardMaterial({name:'Opal luminaire diffuser',color:0xf4f2e8,emissive:0xfff8eb,emissiveIntensity:1.15,roughness:.54});
 const loader=new THREE.TextureLoader();
 function surface(path,repeat){
  const texture=loader.load(path);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(...repeat);texture.anisotropy=4;return texture;
 }
 // Texture coordinates are metre-based. Relief stays below a millimetre so
 // painted sheet reads as a manufactured finish rather than coarse concrete.
 paint.bumpMap=surface('./assets/surfaces/powder.png',[5,5]);paint.bumpScale=.00016;
 trim.bumpMap=surface('./assets/surfaces/brushed.png',[2,10]);trim.bumpScale=.000065;
 rail.bumpMap=surface('./assets/surfaces/powder.png',[7,7]);rail.bumpScale=.00008;
 rubber.color.set(0xffffff);rubber.roughness=.68;
 rubber.map=surface('./assets/realism/rubber-color.jpg',[.5,.5]);rubber.map.colorSpace=THREE.SRGBColorSpace;
 rubber.roughnessMap=surface('./assets/realism/rubber-roughness.jpg',[.5,.5]);
 rubber.normalMap=surface('./assets/realism/rubber-normal.jpg',[.5,.5]);rubber.normalScale.set(.35,.35);
 const centre=(wall+meta.length/2)/2,length=meta.length/2-wall;
 const rear=meta.length/2,panelCount=Math.ceil(length/1.22),panelSpan=length/panelCount,wallBottom=floor+.014,wallTop=2.49;
 finishedPart(room,[length,.012,2.29],[centre,floor+.007,0],rubber,'Continuous rubber load floor');
 for(const side of [-1,1]){
  const z=side*1.148,rivets=[];
  for(let i=0;i<panelCount;i++){
   const left=wall+i*panelSpan,right=left+panelSpan;
   finishedPart(room,[panelSpan-.002,wallTop-wallBottom,.014],[(left+right)/2,(wallTop+wallBottom)/2,z],paint,'Individual coated wall liner panel');
   if(i>0){
    finishedPart(room,[.018,wallTop-wallBottom,.0016],[left,(wallTop+wallBottom)/2,side*1.140],trim,'Near-flush liner joint cover');
    for(let y=wallBottom+.11;y<wallTop-.07;y+=.305)rivets.push([left,y,side*1.1387]);
   }
   for(const x of [left+.06,right-.06])for(const y of [wallBottom+.065,wallTop-.065])rivets.push([x,y,side*1.140]);
  }
  sheetFixings(room,rivets,trim);
  for(const y of [1.02,1.33])cargoRail(room,wall+.075,rear-.085,y,side,rail,dark,seal);
  curvedCove(room,wall,rear,floor+.013,side*1.140,.026,side,false,trim);
  curvedCove(room,wall,rear,2.489,side*1.140,.046,side,true,paint);
  // Small rubber corner seals finish the partition and rear door reveals.
  for(const x of [wall+.009,rear-.009])finishedPart(room,[.010,wallTop-wallBottom,.004],[x,(wallTop+wallBottom)/2,side*1.137],seal,'Vertical liner reveal gasket');
 }
 const ceilingFixings=[];
 for(let i=0;i<panelCount;i++){
  const x=wall+(i+.5)*panelSpan;
  finishedPart(room,[panelSpan-.002,.018,2.29],[x,2.501,0],paint,'Individual ceiling liner panel');
  if(i>0){
   const joint=wall+i*panelSpan;
   finishedPart(room,[.014,.0016,2.20],[joint,2.491,0],trim,'Flush ceiling joint cover');
   for(const z of [-.95,-.42,.42,.95])ceilingFixings.push([joint,2.4897,z]);
  }
 }
 sheetFixings(room,ceilingFixings,trim,'y');
 for(const z of [-.72,.72]){
  const luminaireLength=length-.25;
  finishedPart(room,[luminaireLength,.021,.044],[centre,2.478,z],trim,'Slim extruded luminaire housing');
  finishedPart(room,[luminaireLength-.018,.004,.030],[centre,2.466,z],led,'Recessed opal LED diffuser');
  for(const x of [centre-luminaireLength/2,centre+luminaireLength/2])finishedPart(room,[.004,.023,.046],[x,2.477,z],paint,'Moulded luminaire end cap');
  for(let x=wall+.3;x<rear-.2;x+=1.05)finishedPart(room,[.018,.006,.052],[x,2.490,z],trim,'Luminaire mounting clip');
 }
 finishedPart(room,[.055,.0025,2.23],[rear-.028,floor+.0145,0],trim,'Thin rear threshold finishing plate');
 const lights=[];
 for(const z of [-.72,.72]){
  const light=new THREE.PointLight(0xfff3df,3.2,4,2);light.name='Interior / linear ceiling source';light.position.set(centre,2.448,z);root.add(light);lights.push(light);
 }
 const storage=createAutonomousStorage(model,props);
 function draw(p){
  const visible=p>=.70;lights.forEach(l=>l.intensity=visible?3.2:1.5);
  const state=storage.draw((p-.755)/.24,{visible:true});
  parts.hatch.position.y=0;
  const cameraMix=ease(phase(p,.72,.745)),walk=ease(phase(p,.745,.785));
  const x=mix(5.12,2.45,walk),entryHeight=1.42+floor*ease(phase(x,4.52,3.063));
  // A modest camera height keeps the ceiling out of the extreme wide-angle
  // foreground while retaining a clear view over the receiving carriage.
  // A small lateral approach lets the rear jamb pass the edge of the lens.
  // Once inside, the camera stays clear of the carriage and follows only with
  // its look direction; all movement is derived from the reversible playhead.
  const eye=new THREE.Vector3(x,mix(entryHeight,2.10,walk),mix(-.30,-.12,walk));
  const follow=ease(phase(state.progress,.60,.88));
  const look=new THREE.Vector3(wall+.55,1.64+.12*state.lift,.22*state.cartonPosition[2]*follow);
  return {...state,visible,storageVisible:true,cameraMix,eye:eye.toArray(),look:look.toArray(),walk,packaged:state.sealed,exteriorHatchClosed:true,factoryDepthFt:7,spareCartons:3};
 }
 return {draw,portPoint:storage.portPoint,floor,deck:storage.deck};
}
