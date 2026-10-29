// Scroll-driven demonstration cards follow the rendered property anchors.
export function createRouteQuotes(host){
 const root=document.createElement('div');root.className='route-quotes';root.hidden=true;
 root.innerHTML='<div class="route-quote-card"><span class="route-quote-kicker">AUTO-QUOTE DEMO</span><strong class="route-property"></strong><div class="route-price"></div><p class="route-scope"></p><small>Illustrative estimate · operator review</small></div><div class="route-quote-history" aria-label="Properties quoted"></div>';
 // 10-29 owner: "the bounding boxes for each house it drives by to display the autoquote feature better": one box per
 // house in view, with its estimate; the box comes with the film json (render-town-prefix-v6.py house_boxes)
 const NS='http://www.w3.org/2000/svg';const boxes=document.createElementNS(NS,'svg');boxes.setAttribute('class','route-boxes');root.append(boxes);
 const boxNodes=new Map();
 host.append(root);const card=root.firstElementChild,history=root.children[1];
 let last='';
 return {update(state,width,height){
  const route=state?.route;root.hidden=!route?.active;host.dataset.route=String(!!route?.active);
  if(!route?.active)return;
  if(state.playback==='recorded'&&Math.abs(state.videoTime-state.videoTarget)>.16){root.hidden=true;return;}
  const properties=route.properties||[];const property=properties.find(p=>p.id===route.property);
  if(!property){root.hidden=true;return;}
  boxes.setAttribute('viewBox',`0 0 ${width} ${height}`);boxes.setAttribute('width',width);boxes.setAttribute('height',height);
  const seen=new Set();
  for(const p of properties){
   const b=p.box;if(!b||!(p.boxInView??p.inView))continue;
   const x0=Math.max(4,b.x0),y0=Math.max(4,b.y0),x1=Math.min(width-4,b.x1),y1=Math.min(height-4,b.y1);
   if(x1-x0<24||y1-y0<16)continue;
   seen.add(p.id);
   let n=boxNodes.get(p.id);
   if(!n){
    const g=document.createElementNS(NS,'g');g.setAttribute('class','route-box');
    const rect=document.createElementNS(NS,'rect');rect.setAttribute('rx','2');
    const tag=document.createElementNS(NS,'text');const id=document.createElementNS(NS,'text');id.setAttribute('class','route-box-id');
    g.append(rect,tag,id);boxes.append(g);n={g,rect,tag,id};boxNodes.set(p.id,n);
   }
   n.g.dataset.active=String(p.id===route.property);n.g.dataset.done=String(route.completed.includes(p.id));n.g.style.display='';
   n.rect.setAttribute('x',x0);n.rect.setAttribute('y',y0);n.rect.setAttribute('width',x1-x0);n.rect.setAttribute('height',y1-y0);
   n.tag.setAttribute('x',x0+6);n.tag.setAttribute('y',y0-8);n.tag.textContent=(route.completed.includes(p.id)?'QUOTED ':'')+'$'+p.estimate;
   n.id.setAttribute('x',x0+6);n.id.setAttribute('y',y1+14);n.id.textContent=(p.selected?'SELECTED STOP':'PROPERTY '+p.id.split('-').at(-1))+' · '+p.area.toLocaleString()+' SQ FT';
  }
  for(const [id,n] of boxNodes)if(!seen.has(id))n.g.style.display='none';
  const number=property.id.split('-').at(-1);
  card.querySelector('.route-property').textContent=property.selected?'Selected stop':'Property '+number;
  card.querySelector('.route-price').textContent='$'+property.estimate;
  card.querySelector('.route-scope').textContent=property.area.toLocaleString()+' sq ft lawn · '+property.edges+' ft edging';
  card.dataset.selected=String(!!property.selected);
  const mobile=width<=760,cardWidth=mobile?190:240;
  card.style.left=Math.max(width>=1000?Math.min(width*.32,430):16,Math.min(width-cardWidth-16,property.x-cardWidth/2))+'px';
  card.style.top=Math.max(mobile?(height>720?270:235):130,Math.min(height*.54,property.y-150))+'px';
  const key=JSON.stringify(route.completed);
  if(key!==last){
   last=key;history.replaceChildren(...properties.filter(p=>route.completed.includes(p.id)).map(p=>{
    const item=document.createElement('span');item.textContent='Property '+p.id.split('-').at(-1)+' · $'+p.estimate+' ✓';return item;
   }));
  }
 }};
}
