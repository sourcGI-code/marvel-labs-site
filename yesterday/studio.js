import * as THREE from './assets/three.module.js';

// Render at 2× CSS resolution, including ordinary HD displays. A pixel budget
// prevents ultra-wide screens from allocating unbounded framebuffers.
export function sizeHighDefinition(renderer,width,height){
  const ratio=Math.min(2,Math.sqrt(6000000/Math.max(1,width*height)),renderer.capabilities.maxTextureSize/Math.max(width,height));
  if(Math.abs(renderer.getPixelRatio()-ratio)>.01)renderer.setPixelRatio(ratio);
  renderer.setSize(width,height,false);
}

// Small manufactured radii catch the studio lights without changing study dimensions.
const boxes = new Map();
export function roundedBox(w,h,d){
  const key=[w,h,d].join('/');
  if(boxes.has(key))return boxes.get(key);
  const r=Math.min(w,h,d,.6)*.16, x=w/2-r, y=h/2-r, c=Math.min(r,x*.5,y*.5);
  const s=new THREE.Shape();
  s.moveTo(-x+c,-y);s.lineTo(x-c,-y);s.quadraticCurveTo(x,-y,x,-y+c);
  s.lineTo(x,y-c);s.quadraticCurveTo(x,y,x-c,y);s.lineTo(-x+c,y);
  s.quadraticCurveTo(-x,y,-x,y-c);s.lineTo(-x,-y+c);s.quadraticCurveTo(-x,-y,-x+c,-y);
  const source=new THREE.ExtrudeGeometry(s,{depth:d-2*r,steps:1,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:5,curveSegments:6});
  source.translate(0,0,-d/2+r);
  // Weld the face vertices so the bevels share normals and reflect smoothly.
  const vertices=[],indices=[],lookup=new Map(),position=source.attributes.position;
  for(let i=0;i<position.count;i++){
    const p=[position.getX(i),position.getY(i),position.getZ(i)],id=p.map(v=>Math.round(v*1e6)).join('/');
    if(!lookup.has(id)){lookup.set(id,vertices.length/3);vertices.push(...p);}
    indices.push(lookup.get(id));
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();source.dispose();boxes.set(key,g);return g;
}

export function studioLight(scene,renderer){
  scene.add(new THREE.HemisphereLight(0xf2f3f2,0x59636b,1.65));
  const key=new THREE.DirectionalLight(0xf2f3f2,3.1);key.position.set(-3,8,5);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:30});key.shadow.normalBias=.025;key.shadow.bias=-.0001;key.shadow.radius=3;scene.add(key);
  const rim=new THREE.DirectionalLight(0xd9e5ec,1.6);rim.position.set(4,3,-5);scene.add(rim);
  const environment=new THREE.Scene();environment.background=new THREE.Color(0x79848b);
  for(const [x,y,z,w,h] of [[-5,3,2,3,7],[5,5,-3,4,8],[0,8,0,7,6]]){
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));
    panel.position.set(x,y,z);panel.lookAt(0,1,0);environment.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.03).texture;pmrem.dispose();environment.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
}
