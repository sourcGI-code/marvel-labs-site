import {TRAILER_MODEL_BASE,TRAILER_MODEL_REVISION} from './trailer-model-source.js?v=owner-approved-trailer-v1';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {createStudioFinish} from './studio-finish.js?v=reserve-depth-v2';
import {createStudioSpace} from './studio-space.js?v=reserve-depth-v2';

const section=document.querySelector('.reserve-stage');
if(section) start(section).catch(error=>{console.error(error);section.querySelector('.rv-loading').textContent='The 3D view could not load. Please refresh to try again.';});
async function start(sec){
 const host=sec.querySelector('.rs-3d'),lockButton=sec.querySelector('.rs-lock'),rampButton=sec.querySelector('.rs-ramp-btn'),compareButton=sec.querySelector('.rs-back');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive trailer. Drag to rotate; click to hold the view.');
 const scene=new THREE.Scene();scene.background=new THREE.Color('#111617');scene.fog=new THREE.Fog('#172126',28,65);
 const camera=new THREE.PerspectiveCamera(32,1,.1,100);
 const paint=await createStudioFinish(renderer);
 RectAreaLightUniformsLib.init();
 const ambient=new THREE.HemisphereLight(0xd9e9ef,0x252a2c,.22);scene.add(ambient);
 const key=new THREE.DirectionalLight(0xfff6e7,.7);key.position.set(-5,9,-4);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:25});
 key.shadow.bias=-.00015;key.shadow.normalBias=.025;key.shadow.radius=14;key.shadow.blurSamples=12;scene.add(key);
 const softbox=new THREE.RectAreaLight(0xf6fcff,.9,7,3);softbox.position.set(-1,5,-5);softbox.lookAt(0,1.2,0);scene.add(softbox);
 const rim=new THREE.RectAreaLight(0xc2deed,1.6,8,1.5);rim.position.set(2,5,3);rim.lookAt(0,1.2,0);scene.add(rim);
 const studio=createStudioSpace(scene,renderer);
 const makeContact=(width,depth,opacity)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(64,64,12,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(.4,'rgba(0,0,0,.8)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,opacity,depthWrite:false,toneMapped:false}));m.rotation.x=-Math.PI/2;m.position.y=.001;m.renderOrder=2;return m;
 };
 const loader=new GLTFLoader(),draco=new DRACOLoader();draco.setDecoderPath('vendor/three/addons/libs/draco/gltf/');loader.setDRACOLoader(draco);
 const base=TRAILER_MODEL_BASE;const meta=await fetch(base+'viewer.json').then(r=>{if(!r.ok)throw Error('Model metadata unavailable');return r.json()});
 const T={};let focus=sec.dataset.open||'20',mode='viewer',locked=reduced,az=-2.4,el=.035,wantRadius=12,radius=12,dirty=true,ramp=0,rampTo=0;
 let currentAz=az,currentEl=el,curLook=new THREE.Vector3(0,1.32,0),wantLook=curLook.clone(),last=performance.now(),lastPointer=null,drag=null;
 const selected=()=>T[focus];
 await Promise.all(['20','16'].map(async size=>{
  const gltf=await loader.loadAsync(base+meta.trailers[size].file),group=gltf.scene;group.name=`Studio trailer ${size}`;group.userData.size=size;
  group.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];o.castShadow=!materials.some(m=>m.transparent);o.receiveShadow=true;for(const m of materials)paint(m);});
  const hinge=group.getObjectByName(meta.trailers[size].hingeNode),hingeBase=hinge?.quaternion.clone();
  const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3());
  group.position.set(-center.x,-box.min.y,-center.z);const wrapper=new THREE.Group();wrapper.add(group);wrapper.userData.size=size;scene.add(wrapper);
  const under=makeContact(size==='20'?6.8:5.6,3.3,.55);wrapper.add(under);
  group.updateWorldMatrix(true,true);const wheels=[];group.traverse(o=>{if(o.isMesh&&/Round.tire/i.test(o.name))wheels.push(o)});
  for(const wheel of wheels){const p=new THREE.Box3().setFromObject(wheel).getCenter(new THREE.Vector3()),patch=makeContact(.85,.7,.8);patch.position.set(p.x,.003,p.z);wrapper.add(patch);}
  T[size]={group:wrapper,model:group,hinge,hingeBase,axis:new THREE.Vector3(...meta.trailers[size].rampAxis),open:meta.trailers[size].rampOpen};
 }));
 function fit(){
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const halfH=THREE.MathUtils.degToRad(camera.fov)/2,halfW=Math.atan(Math.tan(halfH)*camera.aspect);
  const extent=mode==='overview'?5.6:focus==='20'?4.1:3.55;
  wantRadius=Math.max(extent/Math.tan(halfW),2.25/Math.tan(halfH));
  if(mode==='overview')wantRadius*=1.12;
  dirty=true;
 }
 function sync(){sec.dataset.mode=mode;sec.dataset.size=focus;sec.classList.toggle('is-locked',locked);lockButton.textContent=locked?'Release view':'Hold view';rampButton.textContent=rampTo?'Close ramp':'Open ramp';rampButton.disabled=mode==='overview';compareButton.textContent=mode==='overview'?'Back to your trailer':'Compare sizes';}
 function enter(size,notify=true){
  if(!T[size])return;focus=size;mode='viewer';rampTo=0;ramp=0;
  for(const [key,t]of Object.entries(T)){t.group.visible=key===size;t.group.position.set(0,0,0);if(t.hinge)t.hinge.quaternion.copy(t.hingeBase);}
  wantLook.set(0,1.32,0);renderer.shadowMap.needsUpdate=true;fit();sync();dirty=true;
  if(notify)sec.dispatchEvent(new CustomEvent('rs:size',{detail:size}));
 }
 function overview(){mode='overview';for(const [size,t]of Object.entries(T)){t.group.visible=true;t.group.position.set(size==='20'?-.4:.4,0,size==='20'?-2.25:2.25);}az=-2.2;el=.4;wantLook.set(0,1.15,0);renderer.shadowMap.needsUpdate=true;fit();sync();dirty=true;}
 function toggleLock(){locked=!locked;lastPointer=null;sync();dirty=true;}
 lockButton.addEventListener('click',toggleLock);
 compareButton.addEventListener('click',()=>mode==='overview'?enter(focus):overview());
 sec.querySelector('.studio-reset').addEventListener('click',()=>{az=-2.4;el=.035;rampTo=0;lastPointer=null;sync();dirty=true;});
 rampButton.addEventListener('click',()=>{if(mode!=='viewer')return;rampTo=1-rampTo;if(rampTo){az=-.55;el=.2;locked=true;}sync();dirty=true;});
 sec.addEventListener('rs:enter',e=>enter(e.detail,false));
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function pick(e){const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);for(const hit of ray.intersectObjects(Object.values(T).map(t=>t.group),true)){let o=hit.object;while(o&&!o.userData.size)o=o.parent;if(o)return o.userData.size;}return null;}
 function move(e){
  if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;az+=dx*.006;el=THREE.MathUtils.clamp(el+dy*.003,.035,1.15);drag.x=e.clientX;drag.y=e.clientY;drag.moved ||= Math.abs(dx)+Math.abs(dy)>2;dirty=true;return;}
  if(e.pointerType!=='mouse'||locked||reduced||sec.dataset.orderStep!=='configure'){lastPointer=null;return;}
  if(mode==='overview'){const hit=pick(e);renderer.domElement.style.cursor=hit?'pointer':'grab';return;}
  if(lastPointer){az+=(e.clientX-lastPointer.x)*.0035;el=THREE.MathUtils.clamp(el+(e.clientY-lastPointer.y)*.0008,.05,.62);dirty=true;}
  lastPointer={x:e.clientX,y:e.clientY};
 }
 window.addEventListener('pointermove',move);
 renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:false};renderer.domElement.setPointerCapture(e.pointerId);});
 renderer.domElement.addEventListener('pointerup',e=>{const was=drag;drag=null;lastPointer=null;if(was?.moved)return;if(mode==='overview'){const size=pick(e);if(size)enter(size);}else toggleLock();});
 renderer.domElement.addEventListener('pointercancel',()=>{drag=null;lastPointer=null;});
 window.addEventListener('blur',()=>{drag=null;lastPointer=null;});
 new ResizeObserver(fit).observe(host);focus=sec.querySelector('input[name="size"]:checked')?.value||focus;enter(focus);radius=wantRadius;currentAz=az;currentEl=el;
 sec.classList.add('rs-live');
 let visible=true;new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)dirty=true;}).observe(host);
 const q=new THREE.Quaternion();
 renderer.setAnimationLoop(time=>{
  const dt=Math.min(.05,(time-last)/1000);last=time;if(!visible)return;
  const k=reduced?1:1-Math.exp(-dt*7);let moving=false;
  const ease=(a,b)=>{if(Math.abs(a-b)>.0001)moving=true;return a+(b-a)*k;};
  currentAz=ease(currentAz,az);currentEl=ease(currentEl,el);radius=ease(radius,wantRadius);const oldRamp=ramp;ramp=ease(ramp,rampTo);if(Math.abs(ramp-oldRamp)>.0001)renderer.shadowMap.needsUpdate=true;
  curLook.set(ease(curLook.x,wantLook.x),ease(curLook.y,wantLook.y),ease(curLook.z,wantLook.z));
  if(!moving&&!dirty)return;dirty=false;
  if(selected()?.hinge)selected().hinge.quaternion.copy(selected().hingeBase).multiply(q.setFromAxisAngle(selected().axis,selected().open*ramp));
  camera.position.copy(curLook).add(new THREE.Vector3(Math.cos(currentEl)*Math.cos(currentAz),Math.sin(currentEl),Math.cos(currentEl)*Math.sin(currentAz)).multiplyScalar(radius));camera.lookAt(curLook);studio.update(camera);renderer.render(scene,camera);
 });
 if(location.search.includes('debug3d'))window.__rsStudio={scene,camera,renderer,T,enter,overview,lock(v){locked=v;sync()},view(a,e){az=currentAz=a;el=currentEl=e;dirty=true},state:()=>({focus,mode,locked,az,el,ramp,rampTo,radius})};
}
