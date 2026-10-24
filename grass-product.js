import * as THREE from './assets/three.module.js';
import {roundedBox} from './studio.js';

// A clearly identified material-development concept, not a certified product.
export function createGrassPanel(){
 const group=new THREE.Group();group.name='Grass-fiber panel / product concept';
 const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');
 let seed=773;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 ctx.fillStyle='#8d8460';ctx.fillRect(0,0,1024,1024);
 for(let i=0;i<30000;i++){
  const x=random()*1024,y=random()*1024,a=random()*Math.PI,len=2+random()*19;
  ctx.strokeStyle=['#b6ac7d','#655f43','#a79b6b','#78734f','#c4b888'][i%5];ctx.lineWidth=.4+random()*1.3;ctx.globalAlpha=.3+random()*.5;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);ctx.stroke();
 }
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshPhysicalMaterial({map,bumpMap:map,bumpScale:.0016,roughness:.8,clearcoat:.04,clearcoatRoughness:.7,color:0xffffff});
 // The shared rounded box is welded for smooth reflections and has no UVs.
 // Map each face by its dominant normal so the top and cut edges show fibers.
 const geometry=roundedBox(.78,.042,.52).clone(),position=geometry.attributes.position,normal=geometry.attributes.normal,uv=[];
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i),nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
  if(ny>=nx&&ny>=nz)uv.push(x/.78+.5,z/.52+.5);
  else if(nx>nz)uv.push(z/.52+.5,y/.042+.5);
  else uv.push(x/.78+.5,y/.042+.5);
 }
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 for(let i=0;i<3;i++){const panel=new THREE.Mesh(geometry,mat);panel.position.set(i*.008,.024+i*.047,i*.007);panel.castShadow=panel.receiveShadow=true;group.add(panel);}
 return group;
}
