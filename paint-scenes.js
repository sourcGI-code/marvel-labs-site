// Preview environments: the visible architecture also supplies the reflection map.
export const scenePresets = {
  terrace: {exposure: .95, hemi: [0xd7e2ed,0x8b6c50,.85], head: .45, frame:[.2,8.5,3.2], bloom:[.04,.4,3.5],floor:.55,bg:0xd1b39b,fog:[45,120],floorColor:0x8b7765,floorRough:.65,deck:0x8b7765,vinyl:.02,sigma:0,envIntensity:1.1},
  tunnel: {exposure:1,hemi:[0x9bbdcf,0x111b24,.55],head:.8,frame:[.5,8.5,3.2],bloom:[.18,.3,2.5],floor:.4,bg:0x060c13,fog:[28,85],floorColor:0x101c27,floorRough:.32,deck:0x101c27,vinyl:.02,sigma:0,envIntensity:1.25},
  gallery: {exposure:.9,hemi:[0xffffff,0x9eaaa9,.9],head:.3,frame:[.25,8.5,3.2],bloom:[.02,.4,4],floor:.6,bg:0xcbd2d1,fog:[45,110],floorColor:0xb8c0bf,floorRough:.55,deck:0xb8c0bf,vinyl:.02,sigma:0,envIntensity:.85}
};
export const sceneLabels = {paint:'Reflective studio',terrace:'Sunset terrace',tunnel:'Light tunnel',gallery:'White gallery'};

export function createPaintScene(T, kind) {
  const world=new T.Group();world.name=`Paint scene / ${kind}`;
  const environment=new T.Scene();
  const colors=kind==='terrace' ? [[-1,[.10,.075,.055]],[0,[.8,.48,.28]],[.15,[.70,.60,.53]],[.6,[.3,.45,.62]],[1,[.16,.28,.43]]]
    : kind==='gallery' ? [[-1,[.18,.20,.20]],[0,[.45,.5,.5]],[1,[.68,.73,.74]]]
    : [[-1,[.012,.022,.035]],[0,[.015,.03,.045]],[1,[.025,.05,.08]]];
  function sky() {
    const g=new T.SphereGeometry(130,64,32),p=g.attributes.position,c=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++) {const y=p.getY(i)/130;let k=0;while(k<colors.length-2&&y>colors[k+1][0])k++;
      const[a,ca]=colors[k],[b,cb]=colors[k+1],u=T.MathUtils.clamp((y-a)/(b-a),0,1);
      for(let j=0;j<3;j++)c[i*3+j]=ca[j]+(cb[j]-ca[j])*u;
    }
    g.setAttribute('color',new T.BufferAttribute(c,3));return new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide}));
  }
  world.add(sky());environment.add(sky());
  function material(color,roughness=.6) {return new T.MeshStandardMaterial({color,roughness,metalness:.08});}
  function box(w,h,d,x,y,z,mat) {const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);world.add(m);return m;}
  function glow(color,k=1) {return new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(k),toneMapped:false});}
  const ground=material(scenePresets[kind].floorColor);
  box(180,.12,180,0,-.08,0,ground);
  if(kind==='terrace') {
    const stone=material(0xb69d81),trim=material(0x6f6257),joint=material(0x6e6052),glass=material(0x324c56,.15);
    // Wide terraces, an architectural colonnade, and a low distant horizon.
    for(let x=-42;x<=42;x+=6)box(.025,.008,90,x,.003,0,joint);
    for(let z=-42;z<=42;z+=6)box(90,.008,.025,0,.003,z,joint);
    for(const z of [-24,24]) {
      box(64,.7,5,0,8.4,z,stone);box(64,.28,5.5,0,8.85,z,trim);
      for(let x=-28;x<=28;x+=8)box(.7,8.2,.9,x,4.1,z,stone);
      box(56,3,.3,0,1.5,z+Math.sign(z)*4,stone);
      for(let x=-24;x<=24;x+=8)box(7.1,4.2,.15,x,5.1,z+Math.sign(z)*3,glass);
    }
    const sun=new T.Mesh(new T.SphereGeometry(3.6,48,24),glow(0xffd3a1,1.9));sun.position.set(-60,15,-82);world.add(sun);
    for(let i=0;i<11;i++) {
      const hill=new T.Mesh(new T.SphereGeometry(1,48,24),material(i%2?0x827e78:0x9a8d7b));
      const a=i*Math.PI*2/11;hill.position.set(Math.cos(a)*95,-8,Math.sin(a)*95);hill.scale.set(27,12+(i%3)*3,20);world.add(hill);
    }
  } else if(kind==='tunnel') {
    const structure=material(0x33465b,.34),strip=glow(0x64e7ff,1.5),edge=glow(0xceeef6,.85),seam=material(0x314554);
    // Repeated three-dimensional portals surround the product; ample orbit clearance.
    for(const x of [-34,-26,-18,18,26,34]) {
      for(const z of [-11,11]) {
        box(.55,9,.55,x,4.5,z,structure);
        box(.08,8.6,.09,x-.3,4.5,z-Math.sign(z)*.3,strip);
      }
      box(.55,.55,22.55,x,9,0,structure);box(.1,.08,21.4,x-.3,8.7,0,edge);
    }
    for(const z of [-10.1,10.1])box(90,.015,.065,0,.012,z,strip);
    for(let x=-40;x<=40;x+=4)box(.035,.008,80,x,.004,0,seam);
    for(const z of [-18,18]) {box(90,10,.3,0,5,z,structure);box(90,.12,.1,0,3,z-Math.sign(z)*.2,strip);}
    box(90,.18,38,0,22,0,structure);
    const diffusePanel=glow(0xb8dbe4,1.1);
    for(const z of [-17.7,17.7])for(const x of [-24,-12,0,12,24])box(3.8,4.5,.08,x,3.4,z,diffusePanel);
  } else {
    const wall=material(0xd4dad7),dark=material(0x697978,.4),window=glow(0xe2f0ed,.78),line=material(0x9caaa6);
    // Pale gallery with deep window reveals and a floating coffered ceiling.
    for(const z of [-23,23]) {
      box(62,12,.8,0,6,z,wall);
      for(let x=-24;x<=24;x+=8) {
        box(6,9,.12,x,5.8,z-Math.sign(z)*.48,dark);
        box(5.4,8.4,.14,x,5.8,z-Math.sign(z)*.56,window);
        box(.12,8.4,.2,x,5.8,z-Math.sign(z)*.68,wall);
        box(5.4,.12,.2,x,5.8,z-Math.sign(z)*.68,wall);
      }
    }
    for(const x of [-24,24])box(.8,12,46,x,6,0,wall);
    for(let x=-24;x<=24;x+=8){box(.35,.4,46,x,21,0,wall);box(.025,.01,70,x,.006,0,line);}
    for(let z=-24;z<=24;z+=8){box(48,.4,.35,0,21,z,wall);box(70,.01,.025,0,.006,z,line);}
    for(const x of [-12,0,12])for(const z of [-12,0,12])box(10,.15,10,x,21.3,z,window);
  }
  // Capture the same architecture at trailer height. Unlit capture materials
  // provide deterministic environment illumination without circular lighting.
  const reflected=world.clone(true);reflected.remove(reflected.children[0]);reflected.position.y=-1.5;
  reflected.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial)o.material=new T.MeshBasicMaterial({color:o.material.color,side:T.DoubleSide});});
  environment.add(reflected);
  return {world,environment};
}
