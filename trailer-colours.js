import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {COLOURS, readSelection, materialRole, applyFinish} from './trailer-colour-materials.js?v=1';
import {TRAILER_MODEL_BASE} from './trailer-model-source.js?v=owner-approved-all-scenes-v3';

const host=document.querySelector('#canvas-host');
const loadState=document.querySelector('.load-state');
const loadMessage=document.querySelector('#load-message');
const retry=document.querySelector('#retry');
const note=document.querySelector('#selection-note');
let selection=readSelection(location.search);
let renderer,scene,camera,environment,loader,draco,resizeObserver,current;
let request=0,scheduled=0,view='hero',zoom=1,azimuth=2.22,elevation=.25;
const cache=new Map(),pointers=new Map();
const views={hero:[2.22,.25],side:[Math.PI/2,.12],front:[Math.PI,.20],rear:[0,.20],detail:[2.04,.10]};

function updateUI(){
  for(const key of ['colour','finish','decal','size'])for(const button of document.querySelectorAll(`[data-${key}]`))button.setAttribute('aria-pressed',String(button.dataset[key]===selection[key]));
  document.querySelector('#model-index').textContent=`0${Object.keys(COLOURS).indexOf(selection.colour)+1} / 05`;
  document.querySelector('#model-name').textContent=COLOURS[selection.colour].label;
  document.querySelector('#model-spec').textContent=`${selection.size} ft · ${selection.finish==='matte'?'Matte':'Gloss'} paint · ${selection.decal==='grey'?'Grey':'Green'} graphics`;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  const url=new URL(location.href);
  for(const [key,value] of Object.entries(selection))url.searchParams.set(key,value);
  history.replaceState(null,'',url);
  if(renderer)renderer.domElement.setAttribute('aria-label',`${COLOURS[selection.colour].label}, ${selection.size} foot trailer. Drag or use arrow keys to rotate. Plus and minus zoom. Home resets the view.`);
}

function fail(error){
  console.error('Trailer colour studio:',error);
  host.setAttribute('aria-busy','false');loadState.hidden=false;loadState.classList.add('failed');
  loadMessage.textContent='The 3D preview could not load. Try again, or enable hardware acceleration in your browser.';
  retry.hidden=false;
}

function studioEnvironment(){
  const room=new THREE.Scene();room.background=new THREE.Color(0x555650);
  const box=(w,h,position,intensity)=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,.97).multiplyScalar(intensity),side:THREE.DoubleSide,toneMapped:false}));
    m.position.set(...position);m.lookAt(0,1,0);room.add(m);
  };
  // Broad, restrained softboxes define the curves without mirror-like outdoor
  // objects appearing to sit inside the trailer's walls.
  box(9,3,[-3,6,6],2.1);box(8,2,[2,5,-7],1.4);box(9,4,[0,9,0],1.7);
  const generator=new THREE.PMREMGenerator(renderer);
  const target=generator.fromScene(room,.08);
  generator.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  return target;
}

function fitCamera(){
  if(!current)return;
  const {bounds}=current,center=bounds.getCenter(new THREE.Vector3());
  if(view==='detail')center.y=.95;
  const direction=new THREE.Vector3(Math.cos(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.sin(azimuth)*Math.cos(elevation));
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
  const up=new THREE.Vector3().crossVectors(direction,right).normalize();
  const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
  let distance=0;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new THREE.Vector3(x,y,z).sub(center),depth=p.dot(direction);
    distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tangent*camera.aspect*.88),depth+Math.abs(p.dot(up))/(tangent*.86));
  }
  // Normal views fit the full hitch and rear. Only the deliberate detail view
  // crops the vehicle; the camera still stays outside its physical shell.
  const radius=Math.max(5.8,distance*zoom*(view==='detail'?.66:1));
  camera.position.copy(center).addScaledVector(direction,radius);camera.lookAt(center);
  camera.near=.08;camera.far=120;camera.updateProjectionMatrix();
}

function draw(){
  if(scheduled||!renderer)return;
  scheduled=requestAnimationFrame(()=>{
    scheduled=0;if(document.hidden||renderer.getContext().isContextLost())return;
    fitCamera();renderer.render(scene,camera);
  });
}

function resize(){
  const width=host.clientWidth,height=host.clientHeight;if(!width||!height||!renderer)return;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(width,height,false);
  camera.aspect=width/height;draw();
}

function prepare(gltf){
  const root=gltf.scene,materials=[],made=new Map();
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const convert=source=>{
      const role=materialRole(source.name,mesh.name),key=source.uuid+'/'+role;
      if(made.has(key))return made.get(key);
      const material=new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(material,source);
      material.name=source.name;material.side=THREE.DoubleSide;
      material.flatShading=false;material.envMapIntensity=.7;
      material.opacity=1;material.transparent=false;material.transmission=0;material.depthWrite=true;
      if(role==='body'){
        // Retain the model's manufactured radii and authored vertex normals.
        // Keep the flat panels and curved pieces' authored normals separate.
        material.normalMap=null;material.bumpMap=null;material.roughnessMap=null;material.metalnessMap=null;
      }
      if(role==='decal'){
        // Use the exact supplied artwork's alpha as an ink mask. Discard its
        // baked white/cyan RGB so grey or green applies to text AND underline.
        material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = diffuse;');};
        material.customProgramCacheKey=()=> 'marvel-single-ink-v1';
      }
      material.userData.colourStudioRole=role;
      materials.push({material,role});made.set(key,material);return material;
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);
    const roles=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>m.userData.colourStudioRole);
    mesh.castShadow=!roles.every(r=>r==='decal'||r==='stripe');mesh.receiveShadow=true;
    if(roles.includes('decal'))mesh.renderOrder=2;
  });
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(center.x,bounds.min.y-.065,center.z));root.updateMatrixWorld(true);
  const result={root,materials,bounds:new THREE.Box3().setFromObject(root)};
  root.visible=false;scene.add(root);return result;
}

async function selectSize(){
  const id=++request,size=selection.size;
  if(current)current.root.visible=false;
  host.setAttribute('aria-busy','true');loadState.hidden=false;loadState.classList.remove('failed');retry.hidden=true;
  loadMessage.textContent=`Preparing the ${size} ft trailer…`;
  try{
    if(!cache.has(size)){
      const pending=loader.loadAsync(`${TRAILER_MODEL_BASE}trailer-${size}-approved.glb`).then(prepare).catch(error=>{cache.delete(size);throw error;});
      cache.set(size,pending);
    }
    const model=await cache.get(size);if(id!==request)return;
    current=model;applyFinish(model.materials,selection);model.root.visible=true;
    fitCamera();renderer.render(scene,camera);
    if(renderer.getContext().isContextLost())throw Error('WebGL context lost');
    host.setAttribute('aria-busy','false');loadState.hidden=true;updateUI();draw();
  }catch(error){if(id===request)fail(error);}
}

function setView(id){
  view=id;[azimuth,elevation]=views[id];zoom=1;updateUI();draw();
}

function bindRotation(canvas){
  const clearView=()=>{view='free';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));};
  const span=()=>{const [a,b]=[...pointers.values()];return b?Math.hypot(a.x-b.x,a.y-b.y):0;};
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    const previous=pointers.get(event.pointerId);if(!previous)return;
    const before=span(),dx=event.clientX-previous.x,dy=event.clientY-previous.y;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){const after=span();if(before>0&&after>0)zoom=THREE.MathUtils.clamp(zoom*before/after,.75,1.65);}
    else{azimuth-=dx*.006;elevation=THREE.MathUtils.clamp(elevation+dy*.004,.035,1.1);clearView();}
    draw();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>pointers.delete(e.pointerId));
  canvas.addEventListener('wheel',event=>{event.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(event.deltaY*.0007),.75,1.65);draw();},{passive:false});
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home'){setView('hero');return;}
    if(event.key==='ArrowLeft')azimuth+=.12;if(event.key==='ArrowRight')azimuth-=.12;
    if(event.key==='ArrowUp')elevation+=.08;if(event.key==='ArrowDown')elevation-=.08;
    if(event.key==='+'||event.key==='=')zoom*=.9;if(event.key==='-')zoom*=1.1;
    elevation=THREE.MathUtils.clamp(elevation,.035,1.1);zoom=THREE.MathUtils.clamp(zoom,.75,1.65);clearView();draw();
  });
}

function initialize(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fail(Error('WebGL context lost'));});
  renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
  scene=new THREE.Scene();scene.background=new THREE.Color(0xecebe6);
  scene.fog=new THREE.Fog(0xecebe6,28,65);camera=new THREE.PerspectiveCamera(32,1,.08,120);
  environment=studioEnvironment();scene.environment=environment.texture;
  scene.add(new THREE.HemisphereLight(0xfffaf1,0x85897f,.8));
  const key=new THREE.DirectionalLight(0xfffbf3,2.1);key.position.set(-3,8,6);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:25});
  key.shadow.bias=-.0001;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
  const fill=new THREE.DirectionalLight(0xf4f7ff,.65);fill.position.set(4,4,-5);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:0xe2e3db,roughness:.9,metalness:0}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.01;ground.receiveShadow=true;scene.add(ground);
  const stage=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,.06,128),new THREE.MeshStandardMaterial({color:0xcfd2c7,roughness:.84,metalness:0}));
  stage.position.y=.02;stage.receiveShadow=true;scene.add(stage);
  draco=new DRACOLoader();draco.setDecoderPath('./vendor/three/addons/libs/draco/gltf/');draco.setWorkerLimit(2);
  loader=new GLTFLoader().setDRACOLoader(draco);
  bindRotation(renderer.domElement);resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  updateUI();selectSize();
}

for(const key of ['colour','finish','decal','size'])for(const button of document.querySelectorAll(`[data-${key}]`))button.addEventListener('click',()=>{
  if(selection[key]===button.dataset[key])return;
  selection={...selection,[key]:button.dataset[key]};updateUI();
  note.textContent=`${COLOURS[selection.colour].label} · ${selection.finish} · ${selection.decal} graphics`;
  if(key==='size'&&loader)selectSize();else if(current){applyFinish(current.materials,selection);draw();}
});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
document.querySelector('#share').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);note.textContent='Link copied. It opens this colour, finish, graphics and size.';}
  catch{note.textContent='Your selection is saved in the address bar. Copy that URL to share it.';}
});
retry.addEventListener('click',()=>{if(loader&&!renderer.getContext().isContextLost())selectSize();else location.reload();});
window.addEventListener('popstate',()=>{const size=selection.size;selection=readSelection(location.search);updateUI();if(size!==selection.size&&loader)selectSize();else if(current){applyFinish(current.materials,selection);draw();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});
if(matchMedia('(pointer:coarse)').matches)document.querySelector('#view-hint').textContent='Drag to rotate · Pinch to zoom';
try{initialize();}catch(error){fail(error);}
