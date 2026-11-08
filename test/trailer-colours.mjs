import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../vendor/three/three.module.min.js';
import {COLOURS, FINISHES, readSelection, materialRole, applyFinish} from '../trailer-colour-materials.js';

const root=path.resolve(import.meta.dirname,'..');
assert.deepEqual(readSelection('?colour=bad&finish=bad&decal=bad&size=bad'),{colour:'black',finish:'matte',decal:'grey',size:'20'});
assert.deepEqual(readSelection('?colour=forest&finish=gloss&decal=green&size=16'),{colour:'forest',finish:'gloss',decal:'green',size:'16'});
assert.equal(Object.keys(COLOURS).length,5);
let configurations=0,bodySurfaces=0;
for(const size of ['16','20']){
  const bytes=fs.readFileSync(path.join(root,`assets/owner-approved-trailer-v1/trailer-${size}-approved.glb`));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const materials=gltf.meshes.flatMap(mesh=>mesh.primitives.map(primitive=>{
    const source=gltf.materials[primitive.material],role=materialRole(source.name,mesh.name);
    const material=new THREE.MeshPhysicalMaterial({name:source.name,color:0xff0000,transparent:true,opacity:.2,transmission:.8});
    if(role==='lamp')material.emissive.setHex(0xff3300);
    return {material,role,mesh:mesh.name};
  }));
  const roofs=materials.filter(m=>/roof.cap/i.test(m.mesh));
  assert(roofs.length>0);assert(roofs.every(m=>m.role==='body'),'The roof must use body paint, not reflective aluminum');
  const body=materials.filter(m=>m.role==='body');bodySurfaces+=body.length;
  assert(body.length>4);assert(materials.some(m=>m.role==='stripe'));assert(materials.some(m=>m.role==='decal'));
  for(const colour of Object.keys(COLOURS))for(const finish of Object.keys(FINISHES))for(const decal of ['grey','green']){
    const selection={size,colour,finish,decal};applyFinish(materials,selection);
    for(const {material,role} of materials){
      assert.equal(material.opacity,1);assert.equal(material.transparent,false);assert.equal(material.transmission,0);
      if(role!=='decal')assert.equal(material.depthWrite,true);
      if(role==='body'){
        assert.equal(material.color.getHex(),COLOURS[colour].color);
        assert.equal(material.roughness,FINISHES[finish].roughness);
        assert.equal(material.clearcoat,FINISHES[finish].clearcoat);
        assert.equal(material.flatShading,false);assert.equal(material.emissiveIntensity,0);
      }
      if(role==='decal'){assert(material.alphaTest>0);assert.equal(material.depthWrite,false);}
      if(role==='lamp')assert.equal(material.emissive.getHex(),0xff3300,'Road lamps retain their authored colour');
    }
    const ink=materials.find(m=>m.role==='stripe').material.color.getHex();
    assert(materials.filter(m=>m.role==='decal').every(m=>m.material.color.getHex()===ink),'Lettering and stripes use the same ink');
    configurations++;
  }
  // Switching back after every other option must restore the original selection.
  applyFinish(materials,{colour:'black',finish:'matte',decal:'grey'});
  assert(body.every(m=>m.material.color.getHex()===0x17191b));
}
const html=fs.readFileSync(path.join(root,'trailer-colours.html'),'utf8');
for(const colour of Object.keys(COLOURS))assert(html.includes(`data-colour="${colour}"`));
for(const [,url] of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)){
  if(!url.startsWith('http'))assert(fs.existsSync(path.join(root,url)),`Missing page asset ${url}`);
}
for(const dependency of ['loaders/GLTFLoader.js','loaders/DRACOLoader.js','libs/draco/gltf/draco_decoder.wasm','libs/draco/gltf/draco_wasm_wrapper.js'])assert(fs.existsSync(path.join(root,'vendor/three/addons',dependency)));
console.log(JSON.stringify({passed:true,configurations,bodySurfaces,checks:['all five colours, both finishes, both inks, both sizes','opaque panels including the roof','matching lettering and stripe ink','masked decal depth handling','road lamp preservation','selection round trips','local page and decoder assets']},null,2));
