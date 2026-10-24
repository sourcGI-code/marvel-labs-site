import * as THREE from './assets/three.module.js';
import {studioLight,sizeHighDefinition} from './studio.js?v=float-20261016';

export function createProcessWorld(canvas, options = {}) {
  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(2);
  renderer.setClearColor(0x0a0c0d, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  studioLight(scene,renderer);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 50);
  camera.position.set(0, 2.5, 7.8);
  camera.lookAt(0, .1, 0);
  const group = new THREE.Group();
  scene.add(group);
  let randomState = 47;
  const random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 4294967296; };
  const count = innerWidth < 761 ? 10000 : 18000;
  const raw = new Float32Array(count * 3);
  const processed = new Float32Array(count * 3);
  const formed = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const size = new Float32Array(count);
  const rawPoint = (theta, phi, extension = 0) => {
    const ripple = 1 + .1 * Math.sin(theta * 7 + phi * 3) + .06 * Math.cos(phi * 11);
    const radius = (1.25 + extension) * ripple;
    return [Math.sin(phi) * Math.cos(theta) * radius * 1.13, Math.cos(phi) * radius * .82, Math.sin(phi) * Math.sin(theta) * radius];
  };
  for (let i = 0; i < count; i++) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    raw.set(rawPoint(theta, phi, random() * .22), i * 3);
    const angle = random() * Math.PI * 2;
    const r = .45 + random() * 1.4;
    const layer = random();
    processed.set([Math.cos(angle) * r, (layer - .5) * 1.6 + Math.sin(angle * 3) * .12, Math.sin(angle) * r], i * 3);
    const wall = random() > .3;
    const y = wall ? random() * .85 : .08;
    const radius = wall ? 1.07 + .18 * y + .015 * Math.sin(theta * 90) : Math.sqrt(random()) * 1.08;
    formed.set([Math.cos(theta) * radius * 1.3, y - .45, Math.sin(theta) * radius * .92], i * 3);
    seeds[i] = random();
    size[i] = 1.5 + random() * 2.6;
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(raw, 3));
  particlesGeometry.setAttribute('aProcessed', new THREE.BufferAttribute(processed, 3));
  particlesGeometry.setAttribute('aFormed', new THREE.BufferAttribute(formed, 3));
  particlesGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  particlesGeometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const uniforms = { uStage: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } };
  const particlesMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute vec3 aProcessed;
      attribute vec3 aFormed;
      attribute float aSeed;
      attribute float aSize;
      uniform float uStage;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vSeed;
      varying float vLight;
      varying float vStage;
      void main() {
        float first = smoothstep(0., 1., uStage);
        float second = smoothstep(1., 2., uStage);
        vec3 p = mix(position, aProcessed, first);
        p = mix(p, aFormed, second);
        float energy = sin(first * 3.14159) * .15;
        p.x += sin(uTime * .32 + aSeed * 18.) * (.017 + energy) * (1.-second);
        p.y += sin(uTime * .4 + aSeed * 12.) * .025 * (1.-second);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = min(7., aSize * uPixelRatio * (4. / -mvPosition.z));
        vSeed = aSeed;
        vLight = clamp(.48 + p.y * .23 + p.x * -.1, .18, .95);
        vStage = uStage;
      }`,
    fragmentShader: `
      precision highp float;
      varying float vSeed;
      varying float vLight;
      varying float vStage;
      void main() {
        float d = length(gl_PointCoord - vec2(.5));
        if (d > .5) discard;
        vec3 green = mix(vec3(.16,.25,.08),vec3(.68,.79,.39),vSeed);
        vec3 powder = mix(vec3(.39,.35,.19),vec3(.89,.83,.52),vSeed);
        vec3 ceramic = mix(vec3(.39,.46,.3),vec3(.93,.95,.77),vSeed);
        vec3 color = mix(green,powder,smoothstep(0.,1.,vStage));
        color = mix(color,ceramic,smoothstep(1.,2.,vStage));
        float alpha = (1. - smoothstep(.24,.5,d)) * mix(.93,.30,smoothstep(1.35,2.,vStage));
        gl_FragColor = vec4(color * (.65 + vLight * .7),alpha * (1. - smoothstep(1.7,2.,vStage)));
      }`
  });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  group.add(particles);

  // Fine blades make the raw material tactile; the scene is a conceptual illustration.
  const bladeVertices = [];
  const bladeColors = [];
  for (let i = 0; i < 2200; i++) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(random() * 2 - 1);
    const root = new THREE.Vector3(...rawPoint(theta, phi, -.025));
    const normal = root.clone().normalize();
    const tangent = new THREE.Vector3(-Math.sin(theta), .15, Math.cos(theta)).normalize();
    const length = .08 + random() * .30;
    const width = .004 + random() * .013;
    const midpoint = root.clone().addScaledVector(normal, length * .55).addScaledVector(tangent, .02);
    const tip = root.clone().addScaledVector(normal, length).addScaledVector(tangent, .045);
    const vertices = [root.clone().addScaledVector(tangent,-width),root.clone().addScaledVector(tangent,width),midpoint.clone().addScaledVector(tangent,width*.5),root.clone().addScaledVector(tangent,-width),midpoint.clone().addScaledVector(tangent,width*.5),midpoint.clone().addScaledVector(tangent,-width*.5),midpoint.clone().addScaledVector(tangent,-width*.5),midpoint.clone().addScaledVector(tangent,width*.5),tip];
    const color = new THREE.Color().setHSL(.20 + random() * .055, .33 + random() * .23, .18 + random() * .18);
    vertices.forEach((vertex, index) => { bladeVertices.push(vertex.x,vertex.y,vertex.z); const c = color.clone().multiplyScalar(index === 8 ? 1.35 : 1); bladeColors.push(c.r,c.g,c.b); });
  }
  const bladesGeometry = new THREE.BufferGeometry();
  bladesGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bladeVertices,3));
  bladesGeometry.setAttribute('color',new THREE.Float32BufferAttribute(bladeColors,3));
  bladesGeometry.computeVertexNormals();
  const bladesMaterial = new THREE.MeshStandardMaterial({ vertexColors:true, side:THREE.DoubleSide, roughness:.9, transparent:true });
  const blades = new THREE.Mesh(bladesGeometry, bladesMaterial);
  group.add(blades);

  const profile = [new THREE.Vector2(.10,0),new THREE.Vector2(1.05,0),new THREE.Vector2(1.09,.08),new THREE.Vector2(1.22,.78),new THREE.Vector2(1.23,.85),new THREE.Vector2(1.19,.88),new THREE.Vector2(1.15,.84),new THREE.Vector2(1.01,.18),new THREE.Vector2(.85,.13),new THREE.Vector2(.1,.13)];
  const vesselGeometry = new THREE.LatheGeometry(profile,160);
  const positions = vesselGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), y = positions.getY(i);
    const angle = Math.atan2(z,x);
    const rib = y > .12 ? .014 * Math.cos(angle * 90) : 0;
    const radius = Math.sqrt(x*x+z*z);
    if (radius > .9) { positions.setX(i,x*(1+rib)); positions.setZ(i,z*(1+rib)); }
  }
  vesselGeometry.computeVertexNormals();
  const vesselMaterial = new THREE.MeshStandardMaterial({ color:0x526448, roughness:.48, metalness:.15, transparent:true, opacity:0, side:THREE.DoubleSide });
  const vessel = new THREE.Mesh(vesselGeometry,vesselMaterial);
  vessel.scale.set(1.3,1,.92);
  vessel.position.y=-.45;
  vessel.visible=false;
  group.add(vessel);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.85,.002,4,180),new THREE.MeshBasicMaterial({color:0x078798,transparent:true,opacity:.23}));
  ring.rotation.x=Math.PI/2;ring.position.y=-1.45;scene.add(ring);
  const ring2=ring.clone();ring2.scale.setScalar(1.12);ring2.material=ring.material.clone();ring2.material.opacity=.12;scene.add(ring2);
  const orbitDots=[];
  for(let i=0;i<80;i++){const angle=random()*Math.PI*2;const radius=2.1+random()*.9;orbitDots.push(Math.cos(angle)*radius,(random()-.5)*2.5,Math.sin(angle)*radius);}
  const dustGeo = new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(orbitDots,3));
  const dust = new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xa7bd81,size:.015,transparent:true,opacity:.4}));scene.add(dust);

  let scroll=0,stage=0,targetStage=0,paused=!!options.paused,visible=true,frame=0,lastTime=0,elapsed=0,rotation=.15,pointerX=0,pointerY=0,dragStart=null,dragRotation=0,lost=false;
  function render(){if(visible&&!lost&&!document.hidden)renderer.render(scene,camera);}
  function updateStage(){
    uniforms.uStage.value=stage;
    bladesMaterial.opacity=1-THREE.MathUtils.smoothstep(stage,0,.8);
    blades.visible=stage<.85;
    vesselMaterial.opacity=THREE.MathUtils.smoothstep(stage,1.3,2);
    vessel.visible=stage>1.3;
    const inspection=THREE.MathUtils.smoothstep(scroll,.74,.93);
    ring.position.y=-.4+inspection*(.2+.65*(.5+.5*Math.sin(scroll*50)));
    ring.material.opacity=.15+inspection*.6;ring.scale.setScalar(inspection? .68:1);
    const shrink=1-THREE.MathUtils.smoothstep(stage,0,1)*.06;
    group.scale.setScalar(shrink);
  }
  function tick(time){
    frame=0;
    if(paused||!visible||document.hidden||lost)return;
    const dt=lastTime?Math.min((time-lastTime)/1000,.25):.016;lastTime=time;elapsed+=dt;
    stage+=(targetStage-stage)*Math.min(1,dt*2.8);
    if(Math.abs(targetStage-stage)<.002)stage=targetStage;
    rotation+=dt*.055;
    group.rotation.y=scroll*1.6+.15+pointerX*.08;
    group.rotation.x=pointerY*.045;
    group.position.y=Math.sin(elapsed*.45)*.06;
    dust.rotation.y=elapsed*.02;
    uniforms.uTime.value=elapsed;
    updateStage();render();
    frame=requestAnimationFrame(tick);
  }
  function resume(){if(!frame&&!paused&&visible&&!document.hidden&&!lost){lastTime=0;frame=requestAnimationFrame(tick);}}
  function stop(){cancelAnimationFrame(frame);frame=0;}
  function resize(){const rect=container.getBoundingClientRect();sizeHighDefinition(renderer,rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.position.z=rect.width<500?7:6;camera.updateProjectionMatrix();render();}
  new ResizeObserver(resize).observe(container);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){render();resume();}else stop();},{rootMargin:'80px'});observer.observe(container);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else resume();});
  container.addEventListener('pointermove',event=>{
    if(paused)return;
    const rect=container.getBoundingClientRect();
    pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;
    if(dragStart!==null){dragRotation+=(event.clientX-dragStart)*.006;dragStart=event.clientX;}
  });
  container.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;stop();container.classList.remove('world-ready');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;render();container.classList.add('world-ready');resume();});
  updateStage();resize();render();container.classList.add('world-ready');resume();
  return {
    setProgress(value){scroll=value;targetStage=Math.min(2,value*2.9);if(paused){stage=targetStage;group.rotation.y=scroll*1.6+.15;updateStage();render();}else resume();},
    setPaused(value){paused=value;if(paused){stop();stage=targetStage;updateStage();render();}else resume();}
  };
}
