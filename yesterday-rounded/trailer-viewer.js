import * as THREE from './assets/three.module.js';
import {createCargoModel} from './cargo-model.js?v=float-20261016';
import {studioLight,sizeHighDefinition} from './studio.js?v=float-20261016';

// Native scrolling is the timeline; no wheel interception or required view switches.
export async function createTrailerViewer(canvas,{paused=false}={}){
  const host=canvas.parentElement;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(2);renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.05,80);
  studioLight(scene,renderer);scene.children.filter(o=>o.isLight).forEach(o=>o.position.z*=-1);
  renderer.localClippingEnabled=true;
  const model=await createCargoModel(20);scene.add(model.root);
  model.root.traverse(n=>{if(n.isLineSegments)n.visible=false;if(n.isMesh)n.material.envMapIntensity=.75;});
  // Hold each view briefly, then travel continuously into the next one.
  const poses=[
    {p:0,eye:[-8.8,5.3,10.5],look:[-.5,1.5,0],open:0,explode:0},
    {p:.10,eye:[-8.4,5.1,10.4],look:[-.5,1.5,0],open:0,explode:0},
    {p:.19,eye:[-5.8,6,10.8],look:[-.3,1.6,0],open:1,explode:0},
    {p:.28,eye:[-5.6,6,10.8],look:[-.3,1.6,0],open:1,explode:0},
    {p:.34,eye:[-7,7.6,13],look:[-.3,2,0],open:1,explode:1},
    {p:.42,eye:[-6.5,7.4,13],look:[-.3,2,0],open:1,explode:1},
    {p:.48,eye:[-3.6,3.5,5.8],look:[-2.05,1.7,-.1],open:1,explode:0},
    {p:.565,eye:[-3.5,3.45,5.7],look:[-2.05,1.7,-.1],open:1,explode:0},
    {p:.62,eye:[-1.7,3.25,5.2],look:[-.72,1.75,-.1],open:1,explode:0},
    {p:.71,eye:[-1.6,3.2,5.2],look:[-.72,1.75,-.1],open:1,explode:0},
    {p:.77,eye:[.05,3.25,5.7],look:[.79,1.8,-.1],open:1,explode:0},
    {p:.85,eye:[.15,3.2,5.7],look:[.79,1.8,-.1],open:1,explode:0},
    {p:.91,eye:[2.65,3.2,5.5],look:[2.15,1.65,0],open:1,explode:0},
    {p:1,eye:[3,3.1,5.6],look:[2.15,1.65,0],open:1,explode:0}
  ];
  let progress=0,target=0,frame=0,last=0,visible=false,lost=false;
  const eye=new THREE.Vector3(),look=new THREE.Vector3();
  function draw(){
    if(lost||!visible||document.hidden)return;
    let i=poses.findIndex((pose,index)=>index<poses.length-1&&progress<=poses[index+1].p);if(i<0)i=poses.length-2;
    const a=poses[i],b=poses[i+1],t=THREE.MathUtils.smoothstep(progress,a.p,b.p);
    const opening=THREE.MathUtils.lerp(a.open,b.open,t),explode=THREE.MathUtils.lerp(a.explode,b.explode,t);
    model.setState(opening,explode,0);
    model.root.position.y=paused?0:Math.sin(progress*Math.PI*2)*.06;
    look.fromArray(a.look).lerp(new THREE.Vector3(...b.look),t);eye.fromArray(a.eye).lerp(new THREE.Vector3(...b.eye),t);
    eye.z*=-1;look.z*=-1;
    const fit=Math.max(1,1.05/camera.aspect);eye.sub(look).multiplyScalar(fit).add(look);
    camera.position.copy(eye);camera.lookAt(look);renderer.render(scene,camera);
    host.dataset.renderProgress=progress.toFixed(3);
  }
  function tick(time){frame=0;if(!visible||document.hidden||lost)return;const dt=last?Math.min((time-last)/1000,.25):1/60;last=time;
    progress=paused?target:THREE.MathUtils.lerp(progress,target,1-Math.exp(-dt*9));if(Math.abs(progress-target)<.0001)progress=target;draw();
    if(progress!==target)frame=requestAnimationFrame(tick);
  }
  function schedule(){if(!frame&&visible&&!document.hidden&&!lost){last=0;frame=requestAnimationFrame(tick);}}
  function stop(){cancelAnimationFrame(frame);frame=0;}
  function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;sizeHighDefinition(renderer,r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();draw();schedule();}
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){resize();schedule();}else stop();},{rootMargin:'100px'}).observe(host);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():schedule());
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;stop();host.classList.remove('cad-ready');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;resize();host.classList.add('cad-ready');schedule();});
  resize();host.classList.add('cad-ready');
  return {setJourney(value,immediate=false){target=THREE.MathUtils.clamp(value,0,1);if(paused||immediate){progress=target;draw();}else schedule();},setPaused(value){paused=value;if(paused){progress=target;draw();stop();}else schedule();},resize};
}
