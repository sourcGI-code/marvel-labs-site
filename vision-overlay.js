const NS='http://www.w3.org/2000/svg';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const svg=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));

export function createVisionOverlay(pin){
 const layer=document.createElement('div');layer.id='vision-overlay';layer.hidden=true;layer.setAttribute('aria-hidden','true');
 const geometry=svg('svg',{'class':'vision-geometry'}),labels=document.createElement('div');labels.className='vision-labels';layer.append(geometry,labels);
 const reference=svg('g',{'class':'vision-reference'}),cross=svg('path'),ring=svg('circle',{r:5}),referenceText=svg('text',{x:12,y:4});referenceText.textContent='RTK / SITE REFERENCE';reference.append(cross,ring,referenceText);geometry.append(reference);
 cross.setAttribute('d','M-10,0 H10 M0,-10 V10');
 const header=document.createElement('div');header.className='vision-feed';header.innerHTML='<span>CAM 02 / LANDSCAPING SCOPE</span><strong></strong><i></i>';layer.append(header);pin.append(layer);
 const summary=document.createElement('aside');summary.id='vision-summary';summary.hidden=true;summary.setAttribute('aria-label','Illustrative site classification and job measurements');
 summary.innerHTML='<p class="eyebrow">MARVEL LABS / VISION STUDY</p><h3>Reading the landscape</h3><p class="vision-current"></p><dl></dl><table class="vision-table" hidden><thead></thead><tbody></tbody></table><small></small>';pin.append(summary);
 const sceneNote='Illustrative model output. Size estimates use this 3D scene; no live model is connected.';
 const shortLandscape=matchMedia('(orientation:landscape) and (max-height:540px)');
 function placeSummary(){
  const copy=pin.querySelector('.tour-copy');
  (shortLandscape.matches&&copy&&pin.dataset.presentation!=='fullscreen'?copy:pin).append(summary);
 }
 placeSummary();shortLandscape.addEventListener('change',placeSummary);
 const transcript=document.createElement('ul');transcript.className='vision-transcript';transcript.setAttribute('aria-label','Landscaping tasks');summary.append(transcript);
 const clip=svg('clipPath',{id:'landscape-scope-clip',clipPathUnits:'userSpaceOnUse'}),clipRect=svg('rect');clip.append(clipRect);geometry.append(clip);
 const copyMask=svg('mask',{id:'landscape-copy-mask',maskUnits:'userSpaceOnUse'}),maskBase=svg('rect',{fill:'white'}),maskCopy=svg('rect',{fill:'black'}),maskSummary=svg('rect',{fill:'black'});copyMask.append(maskBase,maskCopy,maskSummary);geometry.append(copyMask);
 const coverMask=svg('mask',{id:'landscape-cover-mask',maskUnits:'userSpaceOnUse'}),coverBase=svg('rect',{fill:'white'}),coverShape=svg('path',{fill:'black'});coverMask.append(coverBase,coverShape);geometry.append(coverMask);
 const nodes=new Map();let summaryKey='',transcriptKey='';
 function node(item){
  if(nodes.has(item.id))return nodes.get(item.id);
  const group=svg('g',{'clip-path':'url(#landscape-scope-clip)',mask:'url(#landscape-copy-mask)','data-feature':item.id}),shape=svg('path',{'class':'vision-area',mask:'url(#landscape-cover-mask)'}),bounds=svg('rect',{'class':'vision-box',rx:1}),parts=svg('path',{'class':'vision-box'}),leader=svg('path',{'class':'vision-connector'});group.append(shape,bounds,parts,leader);geometry.append(group);
  const label=document.createElement('div');label.className='vision-label';label.innerHTML='<b></b><strong></strong><span></span>';labels.append(label);
  const n={group,shape,bounds,parts,leader,label};nodes.set(item.id,n);return n;
 }
 function update(state,w,h){
  const data=state?.vision,visible=!!data?.visible;layer.hidden=summary.hidden=!visible;pin.dataset.vision=String(visible);
  if(!visible)return;
  const mobile=w<=760,compact=(mobile&&pin.dataset.filmFit==='contain')||(w>h&&h<=540),measuring=data.measuring>0,complete=data.measured;
  if(mobile&&pin.dataset.presentation==='fullscreen')header.style.top=`${pin.querySelector('.tour-copy').getBoundingClientRect().bottom-pin.getBoundingClientRect().top+10}px`;
  layer.dataset.compact=String(compact);
  layer.style.opacity=data.mix;geometry.setAttribute('viewBox',`0 0 ${w} ${h}`);
  reference.style.display=data.stage==='localize'?'':'none';reference.setAttribute('transform',`translate(${data.origin.x},${data.origin.y})`);
  header.querySelector('strong').textContent=data.stage==='localize'?'RTK / SITE SCALE':complete?'SCOPE ESTIMATED':measuring?'ESTIMATING DIMENSIONS':`CLASSIFYING / ${String(data.count).padStart(2,'0')} OF ${data.total}`;
  header.querySelector('i').style.transform=`scaleX(${measuring?data.measuring:data.classification})`;
  // A timeline with a table (11-20) reads EVERY property the cameras see: one entry per property, a row of sizes for each.
  const every=data.table;
  summary.dataset.side=data.panel||'left';
  summary.querySelector('h3').textContent=every?(complete?'Every yard measured':measuring?'Measure each yard':'Find every yard in view'):complete?'A measured job scope':measuring?'Estimate the work':'Identify the landscape work';
  const active=data.observations.find(o=>o.id===data.activeId);
  summary.querySelector('.vision-current').textContent=complete?(every?(compact?'Numbered properties · a measured scope for each':`${data.count} properties in view · a measured scope for each`):compact?'Numbered areas · measured job scope':`${data.count} landscape regions · ready for the quote`):active?`${compact?String(data.observations.indexOf(active)+1).padStart(2,'0')+' ':''}${active.label} → ${active.task}`:every?'Finding houses, lawns, edges, shrubs, beds and trees':'Finding lawn, edges, hedges, beds and trees';
  const note=summary.querySelector(':scope > small'),noteText=data.note||sceneNote;if(note.textContent!==noteText)note.textContent=noteText;
  const compactJobs={'Mow lawn':'01 Lawn','Lawn edging':'02 Edging','Trim hedge':'03 Hedge','Refresh mulch':'04 Beds','Tree rings':'05–08 Trees'};
  const shownJobs=every?[]:data.jobs.slice(0,Math.ceil(data.measuring*data.jobs.length)),shownRows=every?every.rows.slice(0,Math.ceil(data.measuring*every.rows.length)):[],nextSummary=JSON.stringify([compact,shownJobs,shownRows]);
  if(nextSummary!==summaryKey){
   const table=summary.querySelector('.vision-table');table.hidden=!shownRows.length;
   if(every){
    const cell=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;},head=document.createElement('tr');head.append(cell('th',''));
    for(const [name,unit] of every.columns){const th=cell('th',name);th.scope='col';if(unit)th.append(cell('span',unit));head.append(th);}
    table.tHead.replaceChildren(head);
    table.tBodies[0].replaceChildren(...shownRows.map(row=>{const tr=document.createElement('tr'),th=cell('th','');th.scope='row';th.append(cell('b',String(every.rows.indexOf(row)+1).padStart(2,'0')),row.label);tr.append(th,...row.values.map(v=>cell('td',v)));return tr;}));
   }
   summaryKey=nextSummary;summary.querySelector('dl').replaceChildren(...shownJobs.map(job=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=compact?(job.short||compactJobs[job.label]||job.label):job.label;dt.title=job.label;dd.textContent=job.value;row.append(dt,dd);return row;}));
  }
  const nextTranscript=data.observations.map(item=>item.id).join(',')+complete;
  if(nextTranscript!==transcriptKey){transcriptKey=nextTranscript;transcript.replaceChildren(...data.observations.map(item=>{const li=document.createElement('li');li.textContent=`${item.label}: ${item.task}${complete?'; '+item.measurement+'; '+item.detail:''}`;return li;}));}
  summary.dataset.measured=String(measuring);
  for(const n of nodes.values()){n.group.style.display='none';n.label.hidden=true;}
  const placed=[],margin=mobile?14:24;
  const pinRect=pin.getBoundingClientRect();
  const labelTop=mobile?Math.max(header.getBoundingClientRect().bottom,pin.querySelector('.tour-copy')?.getBoundingClientRect().bottom||pinRect.top)-pinRect.top+10:h*.24;
  const labelBottom=mobile?summary.getBoundingClientRect().top-pinRect.top-8:h*.80;
  // Clip to the film viewport only. Label-safe bands must not cut the surveyed
  // lawn, beds or tree outlines, or move their boundaries away from the film.
  // Outlines of yards that run off the film are carried a little past its edge (they are cut off there): never draw beyond the picture.
  const fx=Math.max(0,data.film?.x??0),fy=Math.max(0,data.film?.y??0),fr=Math.min(w,data.film?data.film.x+data.film.width:w),fb=Math.min(h,data.film?data.film.y+data.film.height:h);
  for(const [k,v] of Object.entries({x:fx,y:fy,width:Math.max(0,fr-fx),height:Math.max(0,fb-fy)}))clipRect.setAttribute(k,v);
  // Keep labels off the page copy and controls; connectors retain their real
  // projected anchors when a label is moved to avoid another annotation.
  const rect=element=>{if(!element)return {x:0,y:0,w:0,h:0};const r=element.getBoundingClientRect();return {x:r.x-pinRect.x-8,y:r.y-pinRect.y-8,w:r.width+16,h:r.height+16};};
  const exclusions=mobile?[{x:0,y:0,w,h:labelTop},{x:0,y:labelBottom,w,h:h-labelBottom}]:[rect(pin.querySelector('.tour-copy')),rect(summary),{x:0,y:0,w,h:h*.18},{x:0,y:h*.84,w,h:h*.16}];
  // In the RTK chapter the site reference and its caption sit on the trailer: no tag may cover them.
  if(data.stage==='localize')exclusions.push({x:data.origin.x-18,y:data.origin.y-18,w:200,h:36});
  maskBase.setAttribute('width',w);maskBase.setAttribute('height',h);
  // The trailer and pickup stand in front of the turf: areas drawn on the ground pass behind them.
  coverBase.setAttribute('width',w);coverBase.setAttribute('height',h);coverShape.setAttribute('d',(data.cover||[]).map(p=>'M'+p.map(v=>`${v.x},${v.y}`).join(' L')+' Z').join(' '));
  // Protect only the actual copy and scope panel, never entire horizontal
  // bands. Trees and lawn elsewhere remain visible right to the viewport edge.
  [maskCopy,maskSummary].forEach((mask,i)=>{const r=rect(i?summary:pin.querySelector('.tour-copy'));for(const [key,value] of Object.entries({x:r.x,y:r.y,width:r.w,height:r.h}))mask.setAttribute(key,value);});
  const ordered=data.observations;
  for(const item of ordered){
   const n=node(item),index=data.observations.indexOf(item),context=false;
   const actual=item.box;
   const x=clamp(actual.x,0,w),y=clamp(actual.y,0,h),right=clamp(actual.x+actual.width,0,w),bottom=clamp(actual.y+actual.height,0,h);
   if(right<=x||bottom<=y)continue;
   n.group.style.display='';n.bounds.style.display=item.frame||!(item.polygons?.length||item.parts?.length)?'':'none';n.group.dataset.frame=String(!!item.frame);
   // Turf on the camera's side of the street (cover:false) is in front of the trailer, not behind it.
   if(item.cover===false)n.shape.removeAttribute('mask');else n.shape.setAttribute('mask','url(#landscape-cover-mask)');
   // A group (the shrubs of the front beds) is one entry with a box around each member.
   n.parts.setAttribute('d',(item.parts||[]).map(b=>`M${b.x},${b.y}h${b.width}v${b.height}h${-b.width}Z`).join(' '));n.group.dataset.context=String(context);n.group.dataset.active=String(item.id===data.activeId);
   // Keep the real projected rectangle; SVG clips any off-screen part. Clamping
   // each edge would invent new tree/hedge edges along the screen boundary.
   for(const [k,v] of Object.entries(actual))n.bounds.setAttribute(k,v);
   n.shape.setAttribute('d',(item.polygons||[]).map(p=>'M'+p.map(v=>`${v.x},${v.y}`).join(' L')+' Z').join(' '));
   // On a narrow screen, keep the landscape labels and their projected boxes.
   // Put the work measurements together in the scope below the image.
   const showSize=!mobile&&index<Math.ceil(data.measuring*data.total),labelW=compact?24:mobile?112:155,labelH=compact?24:mobile?(item.label.length>15?37:27):showSize?38:27;
   const candidates=[{x,y:y-labelH-5},{x:right-labelW,y:y-labelH-5},{x:right+8,y},{x:x-labelW-8,y},{x,y:bottom+5},{x:right-labelW,y:bottom+5}];
   // An area too large for its corners to say where it is (the lawn, the edging) names the spot its label points at.
   const at=item.anchor,home=at?{x:at.x-(compact?labelW/2:0),y:at.y-(compact?labelH/2:0)}:{x,y};
   if(at&&!compact)candidates.unshift({x:at.x+14,y:at.y-labelH/2},{x:at.x-labelW-14,y:at.y-labelH/2},{x:at.x-labelW/2,y:at.y-labelH-12},{x:at.x-labelW/2,y:at.y+12});
   // A property's tag may sit inside the frame around its house, wherever the page copy leaves room.
   if(item.frame&&!compact)for(let yy=y+6;yy<=bottom-labelH-4;yy+=12)for(const xx of [x+6,right-labelW-6])candidates.push({x:xx,y:yy});
   if(compact)candidates.unshift(at?home:{x:(x+right-labelW)/2,y:(y+bottom-labelH)/2});
   if(mobile)for(let yy=labelTop;yy<labelBottom-labelH;yy+=30)for(const xx of [margin,w-labelW-margin])candidates.push({x:xx,y:yy});
   else for(let yy=h*.26;yy<h*.8;yy+=46)candidates.push({x:w-labelW-margin,y:yy});
   let best;
   for(const candidate of candidates){const r={x:clamp(candidate.x,margin,w-labelW-margin),y:clamp(candidate.y,labelTop,labelBottom-labelH),w:labelW,h:labelH};const cost=[...placed,...exclusions].reduce((s,a)=>s+overlap(r,a)*25,0)+Math.hypot(r.x-home.x,r.y-home.y);if(!best||cost<best.cost)best={...r,cost};}
   placed.push(best);n.label.hidden=false;n.label.style.cssText=`left:0;top:0;transform:translate3d(${best.x}px,${best.y}px,0);width:${labelW}px`;
   n.label.dataset.active=String(item.id===data.activeId);n.label.dataset.context=String(context);
   n.label.querySelector('b').textContent=String(index+1).padStart(2,'0');n.label.querySelector('strong').textContent=item.label;n.label.querySelector('span').textContent=showSize?item.measurement:'';
   const anchor=at||{x:clamp(best.x+best.w/2,x,right),y:clamp(best.y+best.h/2,y,bottom)};
   n.leader.setAttribute('d',`M${anchor.x},${anchor.y} L${best.x+8},${best.y+labelH/2}`);
  }
 }
 return {update};
}

// The cameras' boxes in every other shot with houses in view (state.scan): a frame on each house as it comes into the
// picture, numbered in the order they appear. No sizes here: a house going past a moving camera is only marked as seen.
export function createScanOverlay(pin){
 const layer=document.createElement('div');layer.id='scan-overlay';layer.hidden=true;layer.setAttribute('aria-hidden','true');
 const geometry=svg('svg',{'class':'scan-geometry'}),tags=document.createElement('div');tags.className='scan-tags';layer.append(geometry,tags);pin.append(layer);
 const clip=svg('clipPath',{id:'scan-clip',clipPathUnits:'userSpaceOnUse'}),clipRect=svg('rect');clip.append(clipRect);geometry.append(clip);
 const nodes=[];
 function node(i){
  if(nodes[i])return nodes[i];
  const frame=svg('rect',{'class':'scan-frame','clip-path':'url(#scan-clip)',rx:1}),tag=document.createElement('div');tag.className='scan-tag';tag.innerHTML='<b></b><span>Property</span><i></i>';
  geometry.append(frame);tags.append(tag);return nodes[i]={frame,tag};
 }
 function update(state,w,h){
  const data=state?.scan,visible=!!data?.visible;layer.hidden=!visible;pin.dataset.scan=String(visible);
  if(!visible)return;
  geometry.setAttribute('viewBox',`0 0 ${w} ${h}`);layer.dataset.compact=String(w<=760);
  const fx=Math.max(0,data.film.x),fy=Math.max(0,data.film.y),fr=Math.min(w,data.film.x+data.film.width),fb=Math.min(h,data.film.y+data.film.height);
  for(const [k,v] of Object.entries({x:fx,y:fy,width:Math.max(0,fr-fx),height:Math.max(0,fb-fy)}))clipRect.setAttribute(k,v);
  for(const n of nodes)if(n){n.frame.style.display='none';n.tag.hidden=true;}
  const pinRect=pin.getBoundingClientRect(),copyBox=pin.querySelector('.tour-copy')?.getBoundingClientRect();
  const copy=copyBox?{x:copyBox.x-pinRect.x-6,y:copyBox.y-pinRect.y-6,w:copyBox.width+12,h:copyBox.height+12}:null;
  for(const house of data.houses){
   const n=node(house.n),b=house.box,x=Math.max(b.x,fx),y=Math.max(b.y,fy),right=Math.min(b.x+b.width,fr),bottom=Math.min(b.y+b.height,fb);
   if(right-x<14||bottom-y<14)continue;
   const seen=clamp(house.age/.35,0,1);n.frame.style.display='';n.frame.style.opacity=seen;
   for(const [k,v] of Object.entries(b))n.frame.setAttribute(k,v);
   // the tag sits inside the top left corner of its frame, unless the page copy is there
   const tag={x:x+5,y:y+5,w:w<=760?52:132,h:19};
   if(right-x<tag.w+10||bottom-y<tag.h+10||(copy&&overlap(tag,copy)>0))continue;
   n.tag.hidden=false;n.tag.style.cssText=`transform:translate3d(${tag.x}px,${tag.y}px,0);opacity:${seen}`;
   n.tag.querySelector('b').textContent=String(house.n+1).padStart(2,'0');n.tag.querySelector('i').textContent=house.age<1?'Scanning':'Recorded';
  }
 }
 return {update};
}
