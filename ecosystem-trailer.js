import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';

export async function createProductViewer(stage){
 const host=stage.querySelector('#trailer-canvas'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x0e1519,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,90),pmrem=new THREE.PMREMGenerator(renderer);
 const room=new THREE.Scene();room.background=new THREE.Color(.075,.10,.14);
 const softbox=document.createElement('canvas');softbox.width=256;softbox.height=128;
 const context=softbox.getContext('2d'),gradient=context.createRadialGradient(128,64,15,128,64,128);
 gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.62,'rgba(255,255,255,.95)');gradient.addColorStop(1,'rgba(255,255,255,0)');context.fillStyle=gradient;context.fillRect(0,0,256,128);
 const lightTexture=new THREE.CanvasTexture(softbox),panelMaterial=new THREE.MeshBasicMaterial({map:lightTexture,color:new THREE.Color(1.1,1.25,1.4),side:THREE.DoubleSide,transparent:true,depthWrite:false,toneMapped:false});
 for(const [w,h,x,y,z] of [[16,9,-12,-5,-10],[16,9,12,-5,7],[18,5,0,12,0],[12,8,1,-5,15],[12,8,-1,-5,-15]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),panelMaterial);panel.position.set(x,y,z);panel.lookAt(0,1,0);room.add(panel);}
 scene.environment=pmrem.fromScene(room,.015).texture;room.traverse(o=>o.geometry?.dispose());panelMaterial.dispose();lightTexture.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe6f5ff,0x344752,2.4));
 const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-4,9,-7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.normalBias=.035;scene.add(key);
 const fill=new THREE.DirectionalLight(0x8cdbe8,2.3);fill.position.set(6,4,5);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({color:0x000000,opacity:.24}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
 const models={},views={'16':{yaw:-2.25,elevation:.26,locked:false},'20':{yaw:-2.25,elevation:.26,locked:false}};
 let size='20',currentYaw=-2.25,currentElevation=.26,visible=false,dirty=true,last=0,drag=null;
 const loader=new GLTFLoader(),draco=new DRACOLoader();draco.setDecoderPath('vendor/three/addons/libs/draco/gltf/');loader.setDRACOLoader(draco);
 await Promise.all(['16','20'].map(async key=>{const gltf=await loader.loadAsync(`assets/package-access-v1/trailer-${key}-package-access.glb`);const root=gltf.scene;
  root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{m.envMapIntensity=1.05;});});
  const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3());root.position.set(-center.x,-box.min.y,-center.z);root.visible=key===size;scene.add(root);models[key]={root,extent:box.getSize(new THREE.Vector3())};
 }));draco.dispose();
 stage.classList.add('is-ready');const lockButton=stage.querySelector('#model-lock'),status=stage.querySelector('#model-status');
 function sync(){const locked=views[size].locked;lockButton.setAttribute('aria-pressed',String(locked));lockButton.innerHTML=locked?'View locked <span>⊙</span>':'Lock view <span>⊙</span>';status.textContent=locked?'Click Lock view to resume movement':'Move to look around · Drag on touch';stage.querySelector('#model-name').textContent=`${size} FT / MIRROR GRAPHITE`;document.querySelector('#model-footprint').textContent=`${size} ft × ${size==='16'?'7':'8.5'} ft`;const explore=document.querySelector('#model-explore');explore.textContent=`Explore ${size} ft ↗`;explore.href=`trailer-${size}.html?v=package-access-v1`;document.querySelector('#model-reserve').href=`reserve.html?size=${size}&v=package-access-v1`;stage.querySelectorAll('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.model===size)));dirty=true;}
 function select(next){if(next===size||!models[next])return;size=next;Object.entries(models).forEach(([key,m])=>m.root.visible=key===size);sync();}
 stage.querySelectorAll('[data-model]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.model)));
 lockButton.addEventListener('click',()=>{views[size].locked=!views[size].locked;sync();});
 renderer.domElement.addEventListener('click',()=>{if(drag?.moved)return;views[size].locked=!views[size].locked;sync();});
 document.addEventListener('pointermove',e=>{if(!visible||views[size].locked||e.pointerType!=='mouse'||drag||reduced.matches)return;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;views[size].yaw=-2.25+x*1.4;views[size].elevation=.28-y*.22;dirty=true;},{passive:true});
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||views[size].locked)return;drag={id:e.pointerId,x:e.clientX,start:views[size].yaw,moved:false};},{passive:true});
 renderer.domElement.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>7)drag.moved=true;views[size].yaw=drag.start-dx*.008;dirty=true;},{passive:true});
 renderer.domElement.addEventListener('pointerup',()=>{const hadMovement=drag?.moved;if(hadMovement)setTimeout(()=>drag=null,50);else drag=null;},{passive:true});renderer.domElement.addEventListener('pointercancel',()=>drag=null,{passive:true});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)dirty=true;},{threshold:.01}).observe(stage);
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();dirty=true;}new ResizeObserver(resize).observe(host);resize();sync();
 renderer.setAnimationLoop(time=>{const dt=Math.min((time-last)/1000,.05);last=time;if(!visible||document.hidden)return;const view=views[size],k=reduced.matches?1:1-Math.exp(-dt*5),delta=view.yaw-currentYaw,de=view.elevation-currentElevation;
  if(!dirty&&Math.abs(delta)<.0001&&Math.abs(de)<.0001)return;currentYaw+=delta*k;currentElevation+=de*k;
  const extent=models[size].extent,target=new THREE.Vector3(0,extent.y*.47,0),fov=THREE.MathUtils.degToRad(camera.fov),fit=Math.min(fov/2,Math.atan(Math.tan(fov/2)*camera.aspect));
  const radius=(extent.length()*.47)/Math.sin(fit)*.99;
  camera.position.copy(target).add(new THREE.Vector3(Math.cos(currentYaw)*Math.cos(currentElevation),Math.sin(currentElevation),Math.sin(currentYaw)*Math.cos(currentElevation)).multiplyScalar(radius));camera.lookAt(target);renderer.render(scene,camera);dirty=false;
 });
 window.__ecosystemViewer={scene,models,renderer,camera,select,state:()=>({size,...views[size]})};
}
