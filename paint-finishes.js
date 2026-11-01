// Surface studies share one model, camera and studio. Textures are generated
// locally and mapped in metres; door positions and all vertex positions stay intact.
export const finishes = {
  graphite:{label:'Mirror graphite',detail:'Smooth lacquer · sharp reflections',color:0x263c4a,rough:.045,metal:.72,coat:.018},
  titanium:{label:'Brushed titanium',detail:'Directional metal grain · polished clearcoat',color:0xb2bec6,rough:.36,metal:.94,coat:.022,texture:'brushed',darkLogo:true},
};
const bodyNames=new Set(['Livery / Graphite pearl','Livery / Deep graphite']);
export function prepareFinishUV(T,mesh) {
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(!materials.some(m=>bodyNames.has(m?.name)))return;
  const g=mesh.geometry.clone(),p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++) {
    const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));
    // Box projection gives the flat panels a consistent physical grain scale,
    // including the angled nose and doors, without changing their geometry.
    if(y>=x&&y>=z){uv[2*i]=p.getX(i);uv[2*i+1]=p.getZ(i);}
    else if(x>=z){uv[2*i]=p.getZ(i);uv[2*i+1]=p.getY(i);}
    else{uv[2*i]=p.getX(i);uv[2*i+1]=p.getY(i);}
  }
  g.setAttribute('uv',new T.BufferAttribute(uv,2));mesh.geometry=g;
}
export function createFinishManager(T,initial='graphite') {
  const originals=new Map(),textures=new Map();let current=finishes[initial]?initial:'graphite';
  function surface(kind) {
    if(textures.has(kind))return textures.get(kind);
    const N=512,c=document.createElement('canvas');c.width=c.height=N;const ctx=c.getContext('2d'),img=ctx.createImageData(N,N);
    const r=document.createElement('canvas');r.width=r.height=N;const rx=r.getContext('2d'),rough=rx.createImageData(N,N);
    let seed=47031;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const rows=Array.from({length:N},()=>random());
    for(let y=0;y<N;y++)for(let x=0;x<N;x++) {
      let v=1,q=1;
      v=.67+rows[y]*.25+Math.sin(x*.013+y*.21)*.035;q=.42+rows[y]*.5;
      const i=(y*N+x)*4,value=Math.round(v*255);img.data[i]=value;img.data[i+1]=value;img.data[i+2]=value;img.data[i+3]=255;
      rough.data[i]=rough.data[i+1]=rough.data[i+2]=Math.round(q*255);rough.data[i+3]=255;
    }
    ctx.putImageData(img,0,0);rx.putImageData(rough,0,0);
    const tile=.25;
    const make=(canvas,color)=>{const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1/tile,1/tile);t.anisotropy=4;t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;return t;};
    const maps={map:make(c,true),roughnessMap:make(r,false)};textures.set(kind,maps);return maps;
  }
  function applyOne(mat,base) {
    mat.copy(base);const f=finishes[current];
    if(bodyNames.has(mat.name)&&current!=='graphite') {
      mat.color.setHex(f.color);if(mat.name==='Livery / Deep graphite')mat.color.multiplyScalar(.65);
      mat.roughness=f.rough;mat.metalness=f.metal;mat.clearcoat=1;mat.clearcoatRoughness=f.coat;
      if(f.texture)Object.assign(mat,surface(f.texture));
      // The smooth clearcoat remains separate from the grain beneath it.
    }
    if(/wordmark|lettering/i.test(mat.name)&&f.darkLogo){mat.color.setHex(0x142a34);mat.metalness=.1;if(mat.emissive){mat.emissive.setHex(0x000000);mat.emissiveIntensity=0;}}
    mat.needsUpdate=true;
  }
  return {
    get current(){return current;},
    register(mat){if(!originals.has(mat)){const base=mat.clone();originals.set(mat,base);applyOne(mat,base);}return mat;},
    select(id){if(!finishes[id])return false;current=id;for(const [mat,base]of originals)applyOne(mat,base);return true;}
  };
}
