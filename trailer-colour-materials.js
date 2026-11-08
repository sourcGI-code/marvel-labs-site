// Paint values use sRGB hex; Three converts them to linear light. This module is
// independent of the legacy viewer's metallic/environment and fade overrides.
export const COLOURS = Object.freeze({
  black: {label:'Jet black', color:0x17191b, metalness:.04},
  graphite: {label:'Graphite', color:0x454a4d, metalness:.12},
  forest: {label:'Forest green', color:0x244d3a, metalness:.04},
  silver: {label:'Titanium silver', color:0xa6adb0, metalness:.38},
  pearl: {label:'Pearl white', color:0xe4e3db, metalness:.04},
});
export const FINISHES = Object.freeze({
  matte: {roughness:.58, specularIntensity:.4, clearcoat:.06, clearcoatRoughness:.42},
  gloss: {roughness:.27, specularIntensity:.65, clearcoat:.8, clearcoatRoughness:.14},
});
export function readSelection(search='') {
  const p=new URLSearchParams(search), pick=(key,values,fallback)=>Object.hasOwn(values,p.get(key))?p.get(key):fallback;
  return {colour:pick('colour',COLOURS,'black'),finish:pick('finish',FINISHES,'matte'),decal:pick('decal',{grey:1,green:1},'grey'),size:p.get('size')==='16'?'16':'20'};
}
export function materialRole(materialName='',meshName='',authoredRole='') {
  if(['body','decal','stripe','hardware','rubber','lamp','interior'].includes(authoredRole))return authoredRole;
  const name=materialName.toLowerCase(),mesh=meshName.toLowerCase().replaceAll('_',' ');
  if(/wordmark|lettering/.test(name))return 'decal';
  if(/accent|cyan light/.test(name))return 'stripe';
  if(/clear-coated black paint|graphite pearl|deep graphite/.test(name)||/roof cap/.test(mesh)||/brushed door/.test(name))return 'body';
  if(/tyre|rubber|epdm|intake throat/.test(name))return 'rubber';
  if(/led lens/.test(name))return 'lamp';
  if(/plywood/.test(name))return 'interior';
  return 'hardware';
}
export function finishSpec(role,selection) {
  const paint=COLOURS[selection.colour]||COLOURS.black;
  const finish=FINISHES[selection.finish]||FINISHES.matte;
  // Darker ink maintains contrast on silver and pearl. Both choices remain
  // grey/green; the chosen stripes and lettering always share one ink.
  const light=selection.colour==='silver'||selection.colour==='pearl';
  const ink=selection.decal==='green'?(light?0x315c30:0x80b751):(light?0x46514f:0xa4acab);
  const opaque={opacity:1,transparent:false,depthWrite:true,depthTest:true,transmission:0,emissive:0x000000,emissiveIntensity:0};
  if(role==='body')return {...opaque,color:paint.color,metalness:paint.metalness,...finish};
  if(role==='decal'||role==='stripe')return {...opaque,color:ink,metalness:.02,roughness:.48,clearcoat:.08,clearcoatRoughness:.35,...(role==='decal'?{alphaTest:.35,alphaToCoverage:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}:{})};
  if(role==='hardware')return {...opaque,color:0x202326,metalness:.3,roughness:.38,clearcoat:.15,clearcoatRoughness:.28};
  if(role==='rubber')return {...opaque,color:0x101112,metalness:0,roughness:.82,clearcoat:0};
  // Road-light colours and the interior retain their authored appearance.
  return {opacity:1,transparent:false,depthWrite:true,depthTest:true,transmission:0};
}
export function applyFinish(materials,selection) {
  for(const {material,role,authored} of materials){
    let spec=finishSpec(role,selection);
    if(authored){
      // Restore the pack's material first, so a round trip through any colour
      // returns to the exact supplied Jet black paint, metals and rubber.
      material.copy(authored);
      spec={opacity:1,transparent:false,depthWrite:true,depthTest:true,transmission:0};
      if(role==='body'){
        if(selection.colour!=='black')Object.assign(spec,{color:COLOURS[selection.colour].color,metalness:COLOURS[selection.colour].metalness});
        if(selection.finish==='gloss')Object.assign(spec,FINISHES.gloss);
      }
      if(role==='decal'||role==='stripe'){
        // Grey is the supplied artwork. Green adapts to lighter body colours.
        if(selection.decal==='green'||['silver','pearl'].includes(selection.colour))spec.color=finishSpec(role,selection).color;
        if(role==='decal')Object.assign(spec,{alphaTest:.35,alphaToCoverage:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      }
    }
    for(const [key,value] of Object.entries(spec)){
      if(material[key]?.isColor)material[key].setHex(value);else material[key]=value;
    }
    material.needsUpdate=true;
  }
}
