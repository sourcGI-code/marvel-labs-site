import {showroomPose} from './scroll-story-mapping.js?v=2';
import {suppliedTrailerURL,prepareSuppliedMaterials,suppliedTireFloor} from './supplied-trailer-body.js?v=11';
// One locally loaded renderer, shared by the final two fullscreen displays.
export async function installTrailerShowroom(){
 const [THREE,{GLTFLoader}]=await Promise.all([import('./assets/three.module.js'),import('./assets/GLTFLoader.js')]);
 const hosts=[...document.querySelectorAll('.new-model-stage')];if(!hosts.length)return;
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene();scene.background=new THREE.Color('#080e11');scene.fog=new THREE.Fog('#080e11',16,35);
 const camera=new THREE.PerspectiveCamera(38,1,.05,80);const target=new THREE.Vector3(0,1.2,0);
 scene.add(new THREE.HemisphereLight(0xe8f5ff,0x51606a,2.5));
 function light(color,intensity,x,y,z){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);return l;}
 const key=light(0xffffff,4,3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:22});key.shadow.bias=-.0003;
 light(0xb9e7f5,3,-5,4,-3);light(0xffffff,1.5,6,2,-1);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:0x162126,roughness:.63,metalness:.15}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 let model,active;
 function draw(){
  if(!active||document.hidden)return;
  const {angle,distance,height}=showroomPose(document.body.dataset.activeScene,Number(document.body.dataset.activeProgress)||0,innerWidth<761);
  camera.position.set(Math.cos(angle)*distance,height,Math.sin(angle)*distance);camera.lookAt(target);renderer.render(scene,camera);
 }
 function sync(){
  const host=hosts.find(h=>h.closest('.display').id===document.body.dataset.activeScene);active=host||null;if(!active||!model)return;
  if(renderer.domElement.parentNode!==active){active.append(renderer.domElement);resize();}active.classList.add('model-ready');draw();
 }
 function resize(){if(!active)return;renderer.setSize(active.clientWidth,active.clientHeight,false);camera.aspect=active.clientWidth/active.clientHeight;camera.updateProjectionMatrix();draw();}
 document.addEventListener('story:progress',sync);document.addEventListener('visibilitychange',sync);addEventListener('resize',resize);
 try{const gltf=await new GLTFLoader().loadAsync(suppliedTrailerURL(20));model=gltf.scene;prepareSuppliedMaterials(model);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const scale=6/size.x;
  const support=suppliedTireFloor(model);model.scale.setScalar(scale);model.position.set(-center.x*scale,-support*scale,-center.z*scale);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model);sync();
 }catch(error){console.warn('Trailer preview remains on its still image.',error);renderer.dispose();}
}
