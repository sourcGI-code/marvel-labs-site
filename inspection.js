import * as THREE from './assets/three.module.js';
import {createCargoModel} from './cargo-model.js?v=v4-20261023';
import {studioLight,sizeHighDefinition} from './studio.js?v=float-20261016';
export async function createInspection(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0,0);
 const scenes=[],cameras=[],models=[];let width=1,height=1,angle=0,opening=1,frame=0,drift=0;
 for(const feet of [20,16]){const scene=new THREE.Scene();studioLight(scene,renderer);scene.children.filter(o=>o.isLight).forEach(o=>o.position.z*=-1);const camera=new THREE.OrthographicCamera(-5,5,4,-4,.1,100);const model=await createCargoModel(feet);scene.add(model.root);scenes.push(scene);cameras.push(camera);models.push(model);}
 function draw(a=angle,o=opening,f=frame,d=drift){angle=a;opening=o;frame=f;drift=d;renderer.setScissorTest(true);for(let i=0;i<2;i++){const camera=cameras[i],aspect=(width/2)/height,halfW=4.05;camera.left=-halfW;camera.right=halfW;camera.top=halfW/aspect;camera.bottom=-halfW/aspect;camera.updateProjectionMatrix();camera.position.set(Math.sin(-.40+angle)*12,8.4,-Math.cos(-.40+angle)*12);camera.lookAt(-.35,1.25,0);models[i].setState(o,0,f);models[i].root.position.y=-drift*8*(i?-.7:1);models[i].root.rotation.z=-drift*.75*(i?-1:1);renderer.setViewport(i*width/2,0,width/2,height);renderer.setScissor(i*width/2,0,width/2,height);renderer.render(scenes[i],camera);}}
 function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;sizeHighDefinition(renderer,width,height);draw();}
 new ResizeObserver(resize).observe(canvas);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();canvas.parentElement.classList.remove('is-inspecting');});resize();return {draw,resize};
}
