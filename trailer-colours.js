import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {addSurfaceDetail} from './trailer-surface-detail.js?v=studio-v3';
import {createContactShadow} from './trailer-contact-shadow.js?v=studio-v3';
import {COLOURS, readSelection, materialRole, applyFinish} from './trailer-colour-materials.js?v=studio-v3';
import {TRAILER_COLOUR_MODELS} from './trailer-colour-source.js?v=realism-v2';

const host=document.querySelector('#canvas-host');
const loadState=document.querySelector('.load-state');
const loadMessage=document.querySelector('#load-message');
const retry=document.querySelector('#retry');
const note=document.querySelector('#selection-note');
let selection=readSelection(location.search);
const embedded=document.documentElement.dataset.embedded==='true';
function notifyParent(state){if(embedded&&parent!==window)parent.postMessage({type:'marvel:trailer-state',state,size:selection.size},location.origin);}
let renderer,scene,camera,environment,loader,resizeObserver,current,composer,occlusion;
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
  notifyParent('error');
}

async function studioEnvironment(){
  const hdr=await new RGBELoader().setDataType(THREE.FloatType).loadAsync('./assets/photographic-reserve-v1/courtyard-reflections.hdr');
  // Preserve photographed light structure while removing coloured buildings
  // from the reflection tint. Black paint stays neutral under the studio keys.
  const pixels=hdr.image.data;
  for(let i=0;i<pixels.length;i+=4){
    const luminance=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
    // A dark studio ceiling keeps the upper shell black; the photographed
    // horizon still supplies varied reflections to the sides and running gear.
    const row=Math.floor(i/4/hdr.image.width)/hdr.image.height;
    const ceiling=.07+.93*THREE.MathUtils.smoothstep(row,.47,.55);
    for(let c=0;c<3;c++)pixels[i+c]=(luminance*.92+pixels[i+c]*.08)*ceiling;
  }
  hdr.mapping=THREE.EquirectangularReflectionMapping;hdr.needsUpdate=true;
  const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(hdr);
  hdr.dispose();generator.dispose();return target;
}

class TrailerOcclusion extends GTAOPass{
  overrideVisibility(){super.overrideVisibility();this.scene.traverse(o=>{if(o.userData.colourStudioOverlay)o.visible=false;});}
}

function renderFrame(){if(composer)composer.render();else renderer.render(scene,camera);}

function fitCamera(){
  if(!current)return;
  const {bounds}=current,center=bounds.getCenter(new THREE.Vector3());
  if(view==='detail')center.copy(current.wheelFocus);
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
  const radius=view==='detail'?2.7*zoom:Math.max(5.8,distance*zoom);
  camera.position.copy(center).addScaledVector(direction,radius);camera.lookAt(center);
  camera.near=.08;camera.far=120;camera.updateProjectionMatrix();
}

function draw(){
  if(scheduled||!renderer)return;
  scheduled=requestAnimationFrame(()=>{
    scheduled=0;if(document.hidden||renderer.getContext().isContextLost())return;
    fitCamera();renderFrame();
  });
}

function resize(){
  const width=host.clientWidth,height=host.clientHeight;if(!width||!height||!renderer)return;
  const ratio=Math.min(2,Math.max(devicePixelRatio||1,1.5),Math.sqrt(4e6/(width*height)));
  renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);
  composer?.setPixelRatio(ratio);composer?.setSize(width,height);
  camera.aspect=width/height;draw();
}

function prepare(gltf){
  const root=gltf.scene,materials=[],made=new Map();
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const convert=source=>{
      const role=materialRole(source.name,mesh.name,source.userData.colourStudioRole),key=source.uuid+'/'+role;
      if(made.has(key))return made.get(key);
      const material=source.isMeshPhysicalMaterial?source.clone():new THREE.MeshPhysicalMaterial();
      if(!source.isMeshPhysicalMaterial)THREE.MeshStandardMaterial.prototype.copy.call(material,source);
      material.name=source.name;material.side=THREE.DoubleSide;
      material.flatShading=false;material.envMapIntensity=.8;
      material.opacity=1;material.transparent=false;material.transmission=0;material.depthWrite=true;
      // Preserve the supplied normals, texture maps and physical material
      // extensions, including the separately authored metal and tire finishes.
      if(role==='decal'){
        // Use the exact supplied artwork's alpha as an ink mask. Discard its
        // baked white/cyan RGB so grey or green applies to text AND underline.
        material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = diffuse;');};
        material.customProgramCacheKey=()=> 'marvel-single-ink-v1';
        if(material.map){material.map.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());material.map.needsUpdate=true;}
      }
      if(role==='body'||role==='rubber')addSurfaceDetail(material,role==='body'?'paint':'rubber');
      material.userData.colourStudioRole=role;
      materials.push({material,role,authored:material.clone()});made.set(key,material);return material;
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);
    const roles=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>m.userData.colourStudioRole);
    mesh.castShadow=!roles.every(r=>r==='decal'||r==='stripe');mesh.receiveShadow=true;
    mesh.userData.colourStudioOverlay=roles.every(r=>r==='decal'||r==='stripe');
    if(roles.includes('decal'))mesh.renderOrder=2;
  });
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(center.x,bounds.min.y-.002,center.z));root.updateMatrixWorld(true);
  const wheelFocus=new THREE.Vector3();let wheels=0;
  root.traverse(o=>{if(o.isMesh&&o.name.startsWith('Tread')){const p=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());if(p.z>0){wheelFocus.add(p);wheels++;}}});
  if(wheels)wheelFocus.multiplyScalar(1/wheels);else wheelFocus.set(1,.5,1.2);
  wheelFocus.y+=.12;
  const shadow=createContactShadow(renderer,root);
  const result={root,materials,shadow,wheelFocus,bounds:new THREE.Box3().setFromObject(root)};
  root.visible=false;scene.add(root,shadow);return result;
}

async function selectSize(){
  const id=++request,size=selection.size;
  if(current){current.root.visible=false;current.shadow.visible=false;}
  host.setAttribute('aria-busy','true');loadState.hidden=false;loadState.classList.remove('failed');retry.hidden=true;
  loadMessage.textContent=`Preparing the ${size} ft trailer…`;
  notifyParent('loading');
  try{
    if(!cache.has(size)){
      const pending=loader.loadAsync(TRAILER_COLOUR_MODELS[size],event=>{
        if(selection.size!==size||loadState.hidden)return;
        const progress=event.lengthComputable?`${Math.round(event.loaded/event.total*100)}%`:`${(event.loaded/1e6).toFixed(1)} MB`;
        loadMessage.textContent=`Loading the ${size} ft trailer… ${progress}`;
      }).then(prepare).catch(error=>{cache.delete(size);throw error;});
      cache.set(size,pending);
    }
    const model=await cache.get(size);if(id!==request)return;
    current=model;applyFinish(model.materials,selection);model.root.visible=true;model.shadow.visible=true;
    fitCamera();renderFrame();
    if(renderer.getContext().isContextLost())throw Error('WebGL context lost');
    host.setAttribute('aria-busy','false');loadState.hidden=true;updateUI();draw();
    notifyParent('ready');
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

async function initialize(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fail(Error('WebGL context lost'));});
  renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
  scene=new THREE.Scene();scene.background=new THREE.Color(0xd8dbdd);
  scene.fog=new THREE.Fog(0xd8dbdd,22,58);camera=new THREE.PerspectiveCamera(32,1,.08,120);
  environment=await studioEnvironment();scene.environment=environment.texture;
  RectAreaLightUniformsLib.init();
  function softbox(intensity,width,height,position,target=[0,1.3,0]){
    const lamp=new THREE.RectAreaLight(0xffffff,intensity,width,height);lamp.position.set(...position);lamp.lookAt(...target);scene.add(lamp);
  }
  softbox(8,9,2.5,[-3,2.1,6]);softbox(6,8,2,[3,2,-6]);softbox(.4,7,2,[0,8,0]);softbox(4,4,2.5,[-7,2.2,0]);
  scene.add(new THREE.HemisphereLight(0xf5f7ff,0x686a6c,2.5));
  const groundMaterial=new THREE.MeshStandardMaterial({color:0xa7acaf,roughness:.87,metalness:0});addSurfaceDetail(groundMaterial,'floor');
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),groundMaterial);
  ground.rotation.x=-Math.PI/2;ground.position.y=0;scene.add(ground);
  composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:4}));
  composer.addPass(new RenderPass(scene,camera));
  occlusion=new TrailerOcclusion(scene,camera,4,4,undefined,{radius:.25,thickness:1,distanceFallOff:1,scale:1,samples:16},{radius:5,samples:16});
  occlusion.blendIntensity=.85;composer.addPass(occlusion);composer.addPass(new OutputPass());
  loader=new GLTFLoader();
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
if(embedded)window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='marvel:trailer-size'||!['16','20'].includes(event.data.size))return;
  if(selection.size===event.data.size)return;
  selection={...selection,size:event.data.size};updateUI();
  if(loader)selectSize();
});
initialize().catch(fail);
