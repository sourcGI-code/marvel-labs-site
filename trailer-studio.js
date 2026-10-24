import * as THREE from './assets/three.module.js';
import {GLTFLoader} from './assets/GLTFLoader.js';
import {suppliedTrailerURL,prepareSuppliedMaterials,suppliedTireFloor} from './supplied-trailer-body.js?v=11';
import {palettes} from './page-design.js?v=1';
import {ready,getDesign,setDesign,save} from './editor-runtime.js?v=10';
const $=id=>document.getElementById(id),defaults={finish:'charcoal',rotation:0,x:0,z:0,zoom:1};
await ready;
let settings={...defaults,...getDesign().studio},model,renderer,dirty=false;
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
for(const [key,value] of Object.entries(palettes)){
 const button=document.createElement('button');button.dataset.finish=key;button.innerHTML='<i aria-hidden="true"></i><span></span>';button.querySelector('span').textContent=value.name;button.querySelector('i').style.background=`linear-gradient(135deg,${value.body} 65%,${value.accent} 65%)`;button.addEventListener('click',()=>{settings.finish=key;change();});$('studio-finishes').append(button);
}
function controls(){
 for(const key of ['rotation','x','z','zoom']){const value=key==='zoom'?Math.round(settings.zoom*100):settings[key];$(key).value=value;$(key+'-value').textContent=value+(key==='rotation'?'°':key==='zoom'?'%':' m');}
 for(const button of $('studio-finishes').children)button.setAttribute('aria-pressed',String(button.dataset.finish===settings.finish));
}
function change(){controls();dirty=true;$('studio-save').disabled=!local;$('studio-status').textContent=local?'Unsaved studio settings.':'Preview only. Open localhost on the laptop to save.';draw();}
for(const key of ['rotation','x','z','zoom'])$(key).addEventListener('input',()=>{settings[key]=Number($(key).value)/(key==='zoom'?100:1);change();});
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{settings.rotation=Number(button.dataset.view);change();});
$('studio-reset').addEventListener('click',()=>{settings={...defaults,finish:settings.finish};change();});
$('studio-save').addEventListener('click',async()=>{const design=getDesign();design.studio={...settings};setDesign(design);$('studio-save').disabled=true;try{await save();dirty=false;$('studio-status').textContent='Saved on this laptop. Homepage scene placement is edited separately.';}catch(error){$('studio-status').textContent=error.message;$('studio-save').disabled=false;}});
addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});controls();
const scene=new THREE.Scene();scene.background=new THREE.Color('#172226');scene.fog=new THREE.Fog('#172226',20,55);
const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(8,4.6,9);camera.lookAt(0,1.2,0);
const pivot=new THREE.Group();scene.add(pivot);
scene.add(new THREE.HemisphereLight(0xe1f2f5,0x617276,2));
const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(2,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:24});key.shadow.bias=-.00015;key.shadow.normalBias=.012;scene.add(key);
const rim=new THREE.DirectionalLight(0xc8e4ef,1.4);rim.position.set(-6,4,-3);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x28363b,roughness:.84}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
function draw(){
 if(!renderer||!model)return;
 pivot.position.set(settings.x,0,settings.z);pivot.rotation.y=settings.rotation*Math.PI/180;
 const palette=palettes[settings.finish];
 model.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){const slot=material.userData.marvelPaletteSlot||material.userData.marvelFinishSlot;if(palette[slot])material.color.set(palette[slot]);}});
 camera.zoom=settings.zoom;camera.updateProjectionMatrix();renderer.render(scene,camera);
}
function resize(){if(!renderer)return;const parent=$('studio-canvas').parentElement;renderer.setSize(parent.clientWidth,parent.clientHeight,false);camera.aspect=parent.clientWidth/parent.clientHeight;camera.updateProjectionMatrix();draw();}
try{
 renderer=new THREE.WebGLRenderer({canvas:$('studio-canvas'),antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const gltf=await new GLTFLoader().loadAsync(suppliedTrailerURL(20));model=gltf.scene;prepareSuppliedMaterials(model);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=6/size.x;
 const support=suppliedTireFloor(model);
 model.scale.setScalar(scale);model.position.set(-center.x*scale,-support*scale,-center.z*scale);pivot.add(model);$('studio-loading').hidden=true;resize();
 const canvas=$('studio-canvas');let drag;
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,start:settings.rotation};canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointermove',event=>{if(!drag)return;settings.rotation=((drag.start+(event.clientX-drag.x)*.4+540)%360)-180;change();});
 const end=()=>{drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
 addEventListener('resize',resize);
}catch(error){$('studio-loading').textContent='The 3D preview could not load. Refresh once the local assets are ready.';console.error(error);}
