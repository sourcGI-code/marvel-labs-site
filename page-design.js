// Authoring preferences are saved with the page's text edits, never in the model.
export const palettes={
 charcoal:{name:'Graphite / Cyan',body:'#10191c',accent:'#43d5e4',trim:'#647476',rubber:'#101416',label:'#f3f6f4'},
 ivory:{name:'Ivory / Forest',body:'#eeeadd',accent:'#285f49',trim:'#64746b',rubber:'#101416',label:'#152e24'},
 midnight:{name:'Midnight / Lime',body:'#101a30',accent:'#c8ee68',trim:'#6d7891',rubber:'#101416',label:'#f4f7ed'},
 burgundy:{name:'Burgundy / Coral',body:'#401c30',accent:'#ff947f',trim:'#97878b',rubber:'#101416',label:'#fff3eb'}
};
export const defaultFrame=()=>({x:0,y:0,zoom:1});
export const frameViewport=()=>innerWidth<=760?'mobile':'desktop';
export function frameFor(design,page,scene,viewport=frameViewport()){
 return {...defaultFrame(),...design?.frames?.[page]?.[scene]?.[viewport]};
}
export function applyDesign(design={},page=location.pathname.replace(/index\.html$/,'')){
 const palette=new URLSearchParams(location.search).get('palette')||design.palette;
 if(palettes[palette]){
  document.documentElement.dataset.palette=palette;
  document.dispatchEvent(new CustomEvent('design:palette',{detail:{palette}}));
 }
 applyFraming(design,page);
 document.dispatchEvent(new CustomEvent('design:change',{detail:structuredClone(design)}));
}
export function applyFraming(design={},page=location.pathname.replace(/index\.html$/,'')){
 for(const [scene,selector] of [['top','#hero-visual'],['inside','#tour-visual'],['arrival','#arrival .scene-host'],['bay','#bay .scene-host'],['route','#route .scene-host'],['production','#production .scene-host']]){
  const value=frameFor(design,page,scene);
  for(const el of document.querySelectorAll(selector+(scene==='inside'?',#vision-overlay':''))){
   el.style.transform=`translate(${value.x}%, ${value.y}%) scale(${value.zoom})`;
   el.style.transformOrigin='50% 50%';
  }
 }
}
