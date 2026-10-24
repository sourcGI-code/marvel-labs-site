import * as THREE from './assets/three.module.js';
import {studioLight} from './studio.js';
import {loadTruck} from './truck-model.js?v=10';
import {trailer} from './journey-scene.js?v=25';
import {openingPose} from './opening-motion.js?v=3';
import {cinemaLight,finishTrailer,finishTruck} from './cinema-light.js?v=12';
import {prepareStudioModel,truckSupport,continuousStudioRoad,createTruckDropHitch} from './studio-grounding.js?v=2';
import {filmFraming} from './opening-film.js?v=26';

const clamp=v=>Math.max(0,Math.min(1,v));
const vec=a=>new THREE.Vector3(...a);
const palettes={charcoal:['#0a0e10','#4dd8e8'],ivory:['#e9e7df','#356b50'],burgundy:['#291319','#ff7866'],midnight:['#101827','#d2ed70']};


export async function createOpening(canvas,take,onStatus,{cinematic=false,transparent=false,deferRender=false}={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:transparent,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=cinematic?THREE.AgXToneMapping:THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 const rendererName=renderer.getContext().getParameter(renderer.getContext().RENDERER);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.06,180);
 scene.background=transparent?null:new THREE.Color(palettes.charcoal[0]);if(transparent)renderer.setClearColor(0,0);const lighting=cinematic?cinemaLight(scene,renderer):(studioLight(scene,renderer),null);
 const fill=new THREE.DirectionalLight(0xd9f7ff,1.8);fill.position.set(-12,5,0);if(!cinematic)scene.add(fill);
 onStatus('Loading your truck model and the revised trailer');
 const [truck,large]=await Promise.all([loadTruck(renderer),trailer(20)]);
 if(cinematic)await Promise.all([finishTrailer(large.root,renderer,large),finishTruck(truck.root,renderer)]);
 const convoy=new THREE.Group();scene.add(convoy);convoy.add(truck.root,large.root);
 // The vehicle never turns across the screen: its entire approach is on X,
 // directly into the initial lens. Only the camera moves after contact.
 const bounds=new THREE.Box3().setFromObject(truck.root),front=bounds.min.x,rear=bounds.max.x;
 const towOffset=rear+4.172+.14;large.root.position.x=towOffset;
 const support=await prepareStudioModel(large,20),truckGround=truckSupport(truck);
 const towShift=support.towCorrection;
 continuousStudioRoad(scene);
 createTruckDropHitch(truck,vec([towOffset+support.tip+.035-towShift,support.y+support.seat-truckGround.y,0]));
 const coupling=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.5,12),new THREE.MeshStandardMaterial({color:0x59666b,metalness:.8,roughness:.3}));
 coupling.rotation.z=Math.PI/2;coupling.position.set(rear+.13,.55,0);convoy.add(coupling);
 const road=new THREE.Group();scene.add(road);
 const roadMat=new THREE.LineBasicMaterial({color:palettes.charcoal[1],transparent:true,opacity:.22});
 for(const z of [-2.6,2.6]){
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([vec([-80,-.025,z]),vec([100,-.025,z])]),roadMat);road.add(line);
 }
 const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),gradient=cx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.5)');gradient.addColorStop(.45,'rgba(0,0,0,.28)');gradient.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=gradient;cx.fillRect(0,0,128,128);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.set(towOffset/2,-.02,0);shadow.scale.set(towOffset+10,6,1);convoy.add(shadow);
 const wheelPivots=[];
 for(const [id,group] of Object.entries(truck.meta.groups)){if(group.wheel)wheelPivots.push({g:truck.groups[id],radius:group.radius});}
 let width=1,height=1,lastP=0,palette='charcoal',state={};
 function paletteSet(name,render=true){palette=palettes[name]?name:'charcoal';const [bg,accent]=palettes[palette];scene.background?.set(bg);roadMat.color.set(accent);large.root.traverse(o=>{if(o.material?.name==='Marvel cyan')o.material.color.set(accent);});if(render)draw(lastP);}
 function resize(render=true){width=canvas.clientWidth;height=canvas.clientHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,Math.sqrt(2000000/(width*height))));renderer.setSize(width,height,false);camera.aspect=width/height;draw(lastP,render);}
 function draw(p,render=true){
  lastP=p=clamp(p);const mobile=width<(cinematic?700:650);
  const {x,depart,truckX,truckVisible,float,trailerX,pos,target,pitch,roll,occlusion,fov,wheelDistance,roadOpacity}=openingPose(p,take,{front,towOffset,mobile});
  convoy.position.set(x,0,0);truck.root.position.set(truckX-x+towShift,truckGround.y,0);truck.root.visible=truckVisible;coupling.visible=false;
  large.root.position.set(towOffset,support.y,0);large.root.rotation.y=0;
  const filmTime=p<=.46?p/.46*1.5:p<=.6?1.5+(p-.46)/.14*1.4:2.9+(p-.6)/.4*7.1;
  const smooth=(a,b)=>{const t=clamp((filmTime-a)/(b-a));return t*t*(3-2*t);};
  support.jack(smooth(6.15,6.75));
  const blend=smooth(1.6,3),cameraY=truckGround.y*(1-blend)+(support.y-float*.35)*blend;
  pos.y+=cameraY;target.y+=cameraY;pos.x+=towShift*(1-blend);target.x+=towShift*(1-blend);
  wheelPivots.forEach(({g,radius})=>g.rotation.z=-wheelDistance/radius);
  shadow.material.opacity=1;roadMat.opacity=.22;road.visible=true;
  if(lighting)lighting.rig.position.x=trailerX;
  camera.position.copy(pos);camera.fov=cinematic?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(fov)/2)*filmFraming(width,height).scale)):fov;camera.lookAt(target);camera.rotateX(pitch);camera.rotateZ(roll);
  // Shift the rendered subject below the mobile headline, not the entire page.
  camera.setViewOffset(width,height,0,-height*(cinematic?filmFraming(width,height).offset:(mobile?.10:.035)),width,height);camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);if(render)renderer.render(scene,camera);
  const label=large.root.localToWorld(vec([0,2.9,0])).project(camera);
  state={take,p,occlusion,trailerLabel:{x:(label.x*.5+.5)*width,y:(.5-label.y*.5)*height},truckPosition:[truckX+towShift,truckGround.y,0],cameraPosition:pos.toArray(),trailerPosition:[trailerX,support.y,0],triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,palette,front,rear,towOffset,renderer:rendererName};
  return state;
 }
 onStatus('Preparing the camera paths');if(!deferRender)await renderer.compileAsync(scene,camera);resize(!deferRender);
 return{draw,resize,setPalette:paletteSet,inspect:()=>state,stage:{scene,camera,renderer,large,cinematic}};
}
