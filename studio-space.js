import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// A real, stationary room: floor joints, wall returns and reflections keep their
// perspective as the customer moves around the trailer.
export function createStudioSpace(scene, renderer) {
 const room=new THREE.Group(),walls=[];room.name='Graphite studio';scene.add(room);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);let seed=47;
 for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=146+(seed>>>27);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}
 ctx.putImageData(pixels,0,0);
 const grain=new THREE.CanvasTexture(canvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(32,32);grain.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x373e42,roughness:.86,metalness:.08,bumpMap:grain,bumpScale:.012,roughnessMap:grain}));
 floor.name='Continuous polished concrete';floor.rotation.x=-Math.PI/2;floor.position.y=-.009;floor.receiveShadow=true;room.add(floor);

 // Quiet construction joints give the ground a measurable scale without a grid overlay.
 const jointMaterial=new THREE.MeshStandardMaterial({color:0x272d30,roughness:.95});
 for(let i=-24;i<=24;i+=6){
  for(const alongX of [true,false]){
   const joint=new THREE.Mesh(new THREE.PlaneGeometry(alongX?60:.014,alongX?.014:60),jointMaterial);
   joint.rotation.x=-Math.PI/2;joint.position.set(alongX?0:i,-.008,alongX?i:0);joint.receiveShadow=true;room.add(joint);
  }
 }

 const wallMaterial=new THREE.MeshStandardMaterial({color:0x343e43,roughness:.92});
 const trimMaterial=new THREE.MeshStandardMaterial({color:0x1b252a,roughness:.7,metalness:.15});
 function wall(x,z,angle){
  const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;room.add(group);
  walls.push({group,normal:new THREE.Vector3(Math.sin(angle),0,Math.cos(angle))});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(42,14),wallMaterial);face.position.y=7;face.receiveShadow=true;group.add(face);
  for(let i=-18;i<=18;i+=6){
   const rib=new THREE.Mesh(new THREE.BoxGeometry(.07,14,.18),trimMaterial);rib.position.set(i,7,.12);group.add(rib);
  }
  const base=new THREE.Mesh(new THREE.BoxGeometry(42,.15,.18),trimMaterial);base.position.set(0,.075,.08);group.add(base);
 }
 wall(0,20,Math.PI);wall(21,0,-Math.PI/2);wall(-21,0,Math.PI/2);wall(0,-20,0);
 const wash=new THREE.RectAreaLight(0xbad2de,24,16,4);wash.position.set(-4,6,10);wash.lookAt(-2,4,20);scene.add(wash);
 const ceilingMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(1.8,1.9,2)});
 for(const x of [-9,9]){
  const strip=new THREE.Mesh(new THREE.PlaneGeometry(.22,28),ceilingMaterial);strip.rotation.x=Math.PI/2;strip.position.set(x,11,0);room.add(strip);
 }

 // One low-resolution planar pass, softened and faded into the concrete.
 // It renders only when the main viewer is dirty, including while the ramp moves.
 const shader={
  name:'Soft concrete reflection',
  uniforms:{color:{value:new THREE.Color(0xffffff)},tDiffuse:{value:null},textureMatrix:{value:null}},
  vertexShader:`uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 ground;
   void main(){vUv=textureMatrix*vec4(position,1.0);ground=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D tDiffuse;varying vec4 vUv;varying vec2 ground;
   void main(){vec2 uv=vUv.xy/vUv.w;vec3 reflected=vec3(0.0);float spread=.005;
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)reflected+=texture2D(tDiffuse,uv+vec2(float(x),float(y))*spread).rgb/9.0;
    float fade=1.0-smoothstep(4.0,13.0,length(ground));gl_FragColor=vec4(reflected,.1*fade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 };
 const reflectionSize=matchMedia('(pointer: coarse)').matches?256:512;
 const reflection=new Reflector(new THREE.PlaneGeometry(32,32),{textureWidth:reflectionSize,textureHeight:reflectionSize,multisample:0,clipBias:.003,shader});
 reflection.name='Soft floor reflection';reflection.rotation.x=-Math.PI/2;reflection.position.y=-.005;reflection.material.transparent=true;reflection.material.depthWrite=false;reflection.renderOrder=1;room.add(reflection);
 const offset=new THREE.Vector3();
 return {update(camera){for(const {group,normal}of walls)group.visible=offset.copy(camera.position).sub(group.position).dot(normal)>3;}};
}
