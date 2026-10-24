import * as THREE from './assets/three.module.js';
import {createGrassPanel} from './grass-product.js?v=2';
import {studioLight,sizeHighDefinition} from './studio.js';

export async function createGrassStory(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.01,20);studioLight(scene,renderer);
 const panel=createGrassPanel();scene.add(panel);let p=0,active=false,lastWidth=0,lastHeight=0;
 function draw(){if(!active)return;const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(w!==lastWidth||h!==lastHeight){sizeHighDefinition(renderer,w,h);lastWidth=w;lastHeight=h;}camera.aspect=w/h;camera.position.set(1.05,1.1,1.6);camera.position.multiplyScalar(Math.max(1,.9/camera.aspect)*(h<200?.7:1));camera.lookAt(0,.07,0);camera.updateProjectionMatrix();
  panel.rotation.set(.05,(-.5+p)*1.8,-.06);panel.position.y=Math.sin(p*Math.PI)*.09;
  renderer.render(scene,camera);
 }
 addEventListener('resize',draw);
 canvas.parentElement.classList.add('product-ready');
 return {setActive(v){active=v;draw();},setProgress(v){p=v;draw();},setPaused(){},setPalette(){draw();}};
}
