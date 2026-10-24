// Scroll-driven demonstration cards follow the rendered property anchors.
export function createRouteQuotes(host){
 const root=document.createElement('div');root.className='route-quotes';root.hidden=true;
 root.innerHTML='<div class="route-quote-card"><span class="route-quote-kicker">AUTO-QUOTE DEMO</span><strong class="route-property"></strong><div class="route-price"></div><p class="route-scope"></p><small>Illustrative estimate · operator review</small></div><div class="route-quote-history" aria-label="Properties quoted"></div>';
 host.append(root);const card=root.firstElementChild,history=root.lastElementChild;
 let last='';
 return {update(state,width,height){
  const route=state?.route;root.hidden=!route?.active;host.dataset.route=String(!!route?.active);
  if(!route?.active)return;
  if(state.playback==='recorded'&&Math.abs(state.videoTime-state.videoTarget)>.16){root.hidden=true;return;}
  const properties=route.properties||[];const property=properties.find(p=>p.id===route.property);
  if(!property){root.hidden=true;return;}
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
