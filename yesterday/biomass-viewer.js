import * as THREE from './assets/three.module.js';
import {studioLight,sizeHighDefinition} from './studio.js?v=float-20261016';
import {createBiomassSpecimens} from './journey-biomass.js?v=2';

export async function createBiomassViewer(canvas,{paused=false}={}){
  const host=canvas.parentElement,renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(2);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,40);studioLight(scene,renderer);
  let specimens;
  try{specimens=await createBiomassSpecimens(renderer);}catch(error){renderer.dispose();throw error;}
  const groups=['grass','seaweed','wood','coffee'].map(name=>specimens[name]);
  groups.forEach(g=>scene.add(g));
  const materials=groups.map(g=>{const set=new Set();g.traverse(n=>{if(n.material)set.add(n.material);});return [...set];});
  let target=0,progress=0,frame=0,last=0,elapsed=0,active=true,visible=false,lost=false;
  function draw(){if(!active||lost||!visible||document.hidden)return;
    groups.forEach((group,i)=>{
      const enter=i===0?1:THREE.MathUtils.smoothstep(progress,i/4-.025,i/4+.025),leave=i===3?0:THREE.MathUtils.smoothstep(progress,(i+1)/4-.025,(i+1)/4+.025),weight=enter*(1-leave);
      group.visible=weight>.003;
      if(!group.visible)return;
      group.rotation.y=(progress-i/4)*Math.PI*2.2-.45;group.rotation.z=Math.sin(progress*Math.PI*2)*.07;
      group.position.y=(i===3?.15:0)+(1-weight)*-.22+(paused?0:Math.sin(elapsed*.65)*.035);
      group.scale.setScalar((.9+weight*.1)*[1.22,1.1,1.22,1.1][i]);
      for(const m of materials[i]){const transparent=weight<.999;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=weight;m.depthWrite=weight>.6;}
    });renderer.render(scene,camera);host.dataset.renderProgress=progress.toFixed(3);
  }
  function tick(time){frame=0;if(!active||!visible||document.hidden||lost)return;const dt=last?Math.min((time-last)/1000,.25):1/60;last=time;if(!paused)elapsed+=dt;
    progress=paused?target:THREE.MathUtils.lerp(progress,target,1-Math.exp(-dt*9));draw();if(!paused)frame=requestAnimationFrame(tick);
  }
  function schedule(){if(!frame&&active&&visible&&!document.hidden&&!lost){last=0;frame=requestAnimationFrame(tick);}}
  function stop(){cancelAnimationFrame(frame);frame=0;}
  function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;sizeHighDefinition(renderer,r.width,r.height);camera.aspect=r.width/r.height;
    const fit=Math.max(1,1/camera.aspect);camera.position.set(2.1*fit,1.8*fit,4.8*fit);camera.lookAt(0,.25,0);camera.updateProjectionMatrix();draw();}
  new ResizeObserver(resize).observe(host);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){resize();schedule();}else stop();}).observe(host);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():schedule());
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;stop();host.classList.remove('sample-ready');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;resize();host.classList.add('sample-ready');schedule();});
  resize();await renderer.compileAsync(scene,camera);host.dataset.specimens='supplied-grass,algae-cutouts,supplied-wood,coffee';host.classList.add('sample-ready');
  return {setActive(value){if(active===value)return;active=value;if(active){progress=target;resize();schedule();}else stop();},setProgress(value){target=THREE.MathUtils.clamp(value,0,1);if(paused){progress=target;draw();}else schedule();},setPaused(value){paused=value;if(paused){progress=target;stop();draw();}else schedule();}};
}
