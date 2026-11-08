import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import * as THREE from '../vendor/three/three.module.min.js';
import {TRAILER_COLOUR_MODELS} from '../trailer-colour-source.js';
import {COLOURS,FINISHES,materialRole,applyFinish} from '../trailer-colour-materials.js';

const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/trailer-realism-v2/manifest.json')));
const defaults={colour:'black',finish:'matte',decal:'grey'};
let combinations=0,totalTreads=0;
function fromDefinition(source){
  const pbr=source.pbrMetallicRoughness||{},ext=source.extensions||{},coat=ext.KHR_materials_clearcoat||{};
  const m=new THREE.MeshPhysicalMaterial({name:source.name,metalness:pbr.metallicFactor??1,roughness:pbr.roughnessFactor??1,clearcoat:coat.clearcoatFactor??0,clearcoatRoughness:coat.clearcoatRoughnessFactor??0,specularIntensity:ext.KHR_materials_specular?.specularFactor??1});
  m.color.fromArray(pbr.baseColorFactor||[1,1,1]);m.emissive.fromArray(source.emissiveFactor||[0,0,0]);
  m.userData={...source.extras};m.alphaTest=source.alphaMode==='MASK'?source.alphaCutoff??.5:0;
  if(pbr.baseColorTexture)m.map=new THREE.Texture();
  return m;
}
function appearance(m){
  return [m.color.toArray(),m.roughness,m.metalness,m.clearcoat,m.clearcoatRoughness,m.specularIntensity,m.emissive.toArray()];
}
for(const size of ['16','20']){
  const data=fs.readFileSync(path.join(root,TRAILER_COLOUR_MODELS[size])),expected=manifest.models[size];
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),expected.sha256,'Model must match the owner-supplied file');
  assert.equal(data.length,expected.bytes);
  const gltf=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  assert.equal(gltf.nodes.filter(n=>n.mesh!==undefined).length,expected.meshNodes);
  const treads=gltf.nodes.filter(n=>n.name?.startsWith('Tread /'));
  assert.equal(treads.length,4);totalTreads+=treads.length;
  for(const node of treads)for(const primitive of gltf.meshes[node.mesh].primitives){
    assert(gltf.accessors[primitive.indices].count>1000,'Tread must contain modeled geometry');
    assert.equal(gltf.materials[primitive.material].extras.colourStudioRole,'rubber');
  }
  const entries=gltf.materials.map(definition=>{
    const material=fromDefinition(definition),role=materialRole(definition.name,'',definition.extras?.colourStudioRole);
    assert.equal(role,definition.extras.colourStudioRole,'Authored role must survive truncated material names');
    return {material,role,authored:material.clone()};
  });
  assert(entries.some(e=>e.material.name.includes('zinc plated')));
  applyFinish(entries,defaults);
  const defaultAppearance=entries.map(e=>appearance(e.material));
  for(const colour of Object.keys(COLOURS))for(const finish of Object.keys(FINISHES))for(const decal of ['grey','green']){
    applyFinish(entries,{colour,finish,decal,size});combinations++;
    for(const {material:m,role,authored:base} of entries){
      assert.equal(m.opacity,1);assert.equal(m.transparent,role==='decal');assert.equal(m.transmission,0);
      assert.equal(m.map,base.map,'Original texture reference retained');
      if(['hardware','rubber','lamp','interior'].includes(role))assert.deepEqual(appearance(m),appearance(base),'Metal, rubber and lamp finish must survive all colour controls');
      if(role==='body'){
        assert.equal(m.color.getHex(),COLOURS[colour].color,'All painted panels, including the roof, use the selected paint');
        assert.equal(m.roughness,FINISHES[finish].roughness);
        assert.equal(m.clearcoat,FINISHES[finish].clearcoat);
      }
      if(role==='decal'){assert.equal(m.depthWrite,false);assert(m.alphaTest>0);}
      else assert.equal(m.depthWrite,true);
    }
    const ink=entries.find(e=>e.role==='stripe').material.color.toArray();
    assert(entries.filter(e=>e.role==='decal').every(e=>JSON.stringify(e.material.color.toArray())===JSON.stringify(ink)));
  }
  applyFinish(entries,defaults);
  entries.forEach(({material},i)=>assert.deepEqual(appearance(material),defaultAppearance[i],'Returning to Jet black must restore the calibrated finish'));
}
const source=fs.readFileSync(path.join(root,'trailer-colours.js'),'utf8');
assert(source.includes("from './trailer-colour-source.js?v=realism-v2'"));
assert(!source.includes('trailer-model-source.js'),'Comparison must not change the main viewer model source');
assert(!source.includes('DRACOLoader'),'Uncompressed supplied files require no decoder');
assert(fs.readFileSync(path.join(root,'trailer-colours.html'),'utf8').includes('trailer-colours.js?v=studio-v3'));
console.log(JSON.stringify({passed:true,combinations,totalTreads,checks:['both files match the supplied GLBs','four modeled treads per trailer','physical metal and rubber properties preserved','all colour and finish combinations','calibrated black finish on body and roof','opaque bodies and antialiased artwork','comparison-only model source and cache revision']},null,2));
