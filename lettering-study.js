// Isolated lettering study. Native models and production render inputs are untouched.
export const letteringOptions = {
  balanced: {number:'01', title:'Balanced', description:'Larger AUTONOMOUS. A cleaner two-line hierarchy, centered higher on the wall.', width:2.64, height:.67, elevation:1.77, offset:0},
  signature: {number:'02', title:'Signature', description:'One slim line, positioned high. More open space and a quieter look.', width:2.83, height:.29, elevation:1.96, offset:0},
  bold: {number:'03', title:'Bold', description:'Two equally strong lines, aligned left. Bigger lettering with a compact footprint.', width:2.39, height:.91, elevation:1.75, offset:-.08}
};

export function createLetteringStudy(THREE, renderer, invalidate) {
  const roots=[], surfaces=[], textures=new Map();
  const params=new URLSearchParams(location.search);
  let current=letteringOptions[params.get('option')] ? params.get('option') : 'balanced';

  function texture(id) {
    if (textures.has(id)) return textures.get(id);
    const spec=letteringOptions[id];
    const c=document.createElement('canvas'); c.width=4096; c.height=Math.round(c.width*spec.height/spec.width);
    const ctx=c.getContext('2d'); ctx.fillStyle='#eef5f7'; ctx.textBaseline='alphabetic';
    function line(text, size, y, align, maxWidth, tracking=0) {
      ctx.font=`700 ${size}px Lato`; ctx.textAlign='left';
      const measured=[...text].reduce((sum,ch)=>sum+ctx.measureText(ch).width,0)+tracking*(text.length-1);
      const scale=Math.min(1,maxWidth/measured);
      const start=align==='center' ? (c.width-measured*scale)/2 : 150;
      ctx.font=`700 ${size*scale}px Lato`;
      ctx.save(); ctx.translate(start,y);
      let x=0; for(const ch of text){ctx.fillText(ch,x,0); x+=ctx.measureText(ch).width+tracking*scale;} ctx.restore();
    }
    if(id==='balanced') {
      line('AUTONOMOUS',300,c.height*.40,'center',3650,12);
      line('MICROFACTORY',460,c.height*.85,'center',3770,0);
    } else if(id==='signature') {
      line('AUTONOMOUS MICROFACTORY',290,c.height*.75,'center',3780,2);
    } else {
      line('AUTONOMOUS',540,c.height*.42,'left',3770,0);
      line('MICROFACTORY',540,c.height*.85,'left',3770,0);
    }
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
    t.anisotropy=renderer.capabilities.getMaxAnisotropy();
    textures.set(id,t); return t;
  }

  function apply() {
    const spec=letteringOptions[current];
    for(const {mesh, center, size} of surfaces) {
      const scale=size==='16'?.8:1;
      mesh.scale.set(spec.width*scale,spec.height*scale,1);
      mesh.position.set(center.x+spec.offset*scale,spec.elevation,center.z);
      mesh.material.map=texture(current); mesh.material.emissiveMap=mesh.material.map; mesh.material.needsUpdate=true;
    }
    for(const b of document.querySelectorAll('[data-lettering]'))b.setAttribute('aria-pressed',String(b.dataset.lettering===current));
    const label=document.querySelector('[data-lettering-description]'); if(label)label.textContent=spec.description;
    document.querySelector('.reserve-stage').dataset.lettering=current;
    const url=new URL(location.href);url.searchParams.set('option',current);history.replaceState(null,'',url);
    invalidate();
  }

  function register(root,size) {
    roots.push(root);
    const sides={near:[],far:[]};
    root.traverse(o=>{if(o.isMesh&&/Wrap.*lettering/.test(o.name)){sides[/Near/.test(o.name)?'near':'far'].push(o);o.visible=false;}});
    for(const nodes of Object.values(sides)) {
      if(!nodes.length)continue;
      const bounds=new THREE.Box3();
      for(const node of nodes){node.geometry.computeBoundingBox();node.updateMatrix();bounds.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrix));}
      const center=bounds.getCenter(new THREE.Vector3());center.z+=Math.sign(center.z)*.003;
      const material=new THREE.MeshPhysicalMaterial({map:texture(current),transparent:true,alphaTest:.02,depthWrite:false,
        color:0xffffff,roughness:.3,metalness:.04,clearcoat:1,clearcoatRoughness:.04,
        emissive:0xffffff,emissiveMap:texture(current),emissiveIntensity:.12,envMapIntensity:1.2,
        polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
      mesh.name=`Lettering study / ${size} / ${center.z>0?'near':'far'}`;
      if(center.z<0)mesh.rotation.y=Math.PI;
      mesh.renderOrder=3;nodes[0].parent.add(mesh);surfaces.push({mesh,center,size});
    }
    apply();
  }

  function select(id) {if(letteringOptions[id]){current=id;apply();}}
  for(const button of document.querySelectorAll('button[data-lettering]'))button.addEventListener('click',()=>select(button.dataset.lettering));
  window.__letteringStudy={select, get current(){return current;}, surfaces, options:letteringOptions, textures};
  apply();
  return {register,select};
}
