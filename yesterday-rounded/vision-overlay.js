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
 summary.innerHTML='<p class="eyebrow">MARVEL LABS / VISION STUDY</p><h3>Reading the landscape</h3><p class="vision-current"></p><dl></dl><small>Illustrative model output. Size estimates use this 3D scene; no live model is connected.</small>';pin.append(summary);
 const transcript=document.createElement('ul');transcript.className='vision-transcript';transcript.setAttribute('aria-label','Landscaping tasks');summary.append(transcript);
 const clip=svg('clipPath',{id:'landscape-scope-clip',clipPathUnits:'userSpaceOnUse'}),clipRect=svg('rect');clip.append(clipRect);geometry.append(clip);
 const copyMask=svg('mask',{id:'landscape-copy-mask',maskUnits:'userSpaceOnUse'}),maskBase=svg('rect',{fill:'white'}),maskCopy=svg('rect',{fill:'black'}),maskSummary=svg('rect',{fill:'black'});copyMask.append(maskBase,maskCopy,maskSummary);geometry.append(copyMask);
 const nodes=new Map();let summaryKey='',transcriptKey='',layoutKey='',layoutBounds={};
 function node(item){
  if(nodes.has(item.id))return nodes.get(item.id);
  const group=svg('g',{'clip-path':'url(#landscape-scope-clip)',mask:'url(#landscape-copy-mask)'}),shape=svg('path',{'class':'vision-area'}),bounds=svg('rect',{'class':'vision-box',rx:1}),leader=svg('path',{'class':'vision-connector'});group.append(shape,bounds,leader);geometry.append(group);
  const label=document.createElement('div');label.className='vision-label';label.innerHTML='<b></b><strong></strong><span></span>';labels.append(label);
  const n={group,shape,bounds,leader,label};nodes.set(item.id,n);return n;
 }
 function update(state,w,h){
  const data=state?.vision,visible=!!data?.visible;layer.hidden=summary.hidden=!visible;pin.dataset.vision=String(visible);
  if(!visible)return;
  const mobile=w<=760,measuring=data.measuring>0,complete=data.measured;
  layer.style.opacity=data.mix;geometry.setAttribute('viewBox',`0 0 ${w} ${h}`);
  reference.style.display=data.stage==='localize'?'':'none';reference.setAttribute('transform',`translate(${data.origin.x},${data.origin.y})`);
  header.querySelector('strong').textContent=data.stage==='localize'?'RTK / SITE SCALE':complete?'SCOPE ESTIMATED':measuring?'ESTIMATING DIMENSIONS':`CLASSIFYING / ${String(data.count).padStart(2,'0')} OF ${data.total}`;
  header.querySelector('i').style.transform=`scaleX(${measuring?data.measuring:data.classification})`;
  summary.querySelector('h3').textContent=complete?'A measured job scope':measuring?'Estimate the work':'Identify the landscape work';
  const active=data.observations.find(o=>o.id===data.activeId);
  summary.querySelector('.vision-current').textContent=complete?`${data.count} landscape regions · ready for the quote`:active?`${active.label} → ${active.task}`:'Finding lawn, edges, hedges, beds and trees';
  const shownJobs=data.jobs.slice(0,Math.ceil(data.measuring*data.jobs.length)),nextSummary=JSON.stringify(shownJobs);
  if(nextSummary!==summaryKey){summaryKey=nextSummary;summary.querySelector('dl').replaceChildren(...shownJobs.map(job=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=job.label;dd.textContent=job.value;row.append(dt,dd);return row;}));}
  const nextTranscript=data.observations.map(item=>item.id).join(',')+complete;
  if(nextTranscript!==transcriptKey){transcriptKey=nextTranscript;transcript.replaceChildren(...data.observations.map(item=>{const li=document.createElement('li');li.textContent=`${item.label}: ${item.task}${complete?'; '+item.measurement+'; '+item.detail:''}`;return li;}));}
  summary.dataset.measured=String(measuring);
  for(const n of nodes.values()){n.group.style.display='none';n.label.hidden=true;}
  const placed=[],margin=mobile?14:24;
  const nextLayout=[w,h,summaryKey,data.stage,measuring,complete].join(':');
  if(nextLayout!==layoutKey){layoutKey=nextLayout;layoutBounds={top:mobile?header.getBoundingClientRect().bottom+10:h*.24,bottom:mobile?summary.getBoundingClientRect().top-8:h*.80};}
  const labelTop=layoutBounds.top,labelBottom=layoutBounds.bottom;
  for(const [k,v] of Object.entries({x:margin,y:labelTop,width:w-margin*2,height:Math.max(0,labelBottom-labelTop)}))clipRect.setAttribute(k,v);
  // Keep labels off the page copy and controls; connectors retain their real
  // projected anchors when a label is moved to avoid another annotation.
  const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x-8,y:r.y-8,w:r.width+16,h:r.height+16};};
  const exclusions=mobile?[{x:0,y:0,w,h:labelTop},{x:0,y:labelBottom,w,h:h-labelBottom}]:[rect(pin.querySelector('.tour-copy')),rect(summary),{x:0,y:0,w,h:h*.18},{x:0,y:h*.84,w,h:h*.16}];
  maskBase.setAttribute('width',w);maskBase.setAttribute('height',h);
  [maskCopy,maskSummary].forEach((mask,i)=>{const r=exclusions[i];for(const [key,value] of Object.entries({x:r.x,y:r.y,width:r.w,height:r.h}))mask.setAttribute(key,value);});
  const ordered=data.observations;
  for(const item of ordered){
   const n=node(item),index=data.observations.indexOf(item),context=false;
   const left=margin;
   const x=clamp(item.box.x,left,w-margin),y=clamp(item.box.y,h*.24,h*.80),right=clamp(item.box.x+item.box.width,left,w-margin),bottom=clamp(item.box.y+item.box.height,h*.24,h*.80);
   if(right<=x||bottom<=y)continue;
   n.group.style.display='';n.bounds.style.display=(item.polygons?.length||0)>1?'none':'';n.group.dataset.context=String(context);n.group.dataset.active=String(item.id===data.activeId);
   for(const [k,v] of Object.entries({x,y,width:right-x,height:bottom-y}))n.bounds.setAttribute(k,v);
   n.shape.setAttribute('d',(item.polygons||[]).map(p=>'M'+p.map(v=>`${v.x},${v.y}`).join(' L')+' Z').join(' '));
   // On a narrow screen, keep the landscape labels and their projected boxes.
   // Put the work measurements together in the scope below the image.
   const showSize=!mobile&&index<Math.ceil(data.measuring*data.total),labelW=mobile?84:155,labelH=mobile?19:showSize?36:24;
   const candidates=[{x,y:y-labelH-5},{x:right-labelW,y:y-labelH-5},{x:right+8,y},{x:x-labelW-8,y},{x,y:bottom+5},{x:right-labelW,y:bottom+5}];
   if(mobile)for(let yy=labelTop;yy<labelBottom-labelH;yy+=25)for(const xx of [margin,w-labelW-margin])candidates.push({x:xx,y:yy});
   else for(let yy=h*.26;yy<h*.8;yy+=46)candidates.push({x:w-labelW-margin,y:yy});
   let best;
   for(const candidate of candidates){const r={x:clamp(candidate.x,margin,w-labelW-margin),y:clamp(candidate.y,labelTop,labelBottom-labelH),w:labelW,h:labelH};const cost=[...placed,...exclusions].reduce((s,a)=>s+overlap(r,a)*25,0)+Math.hypot(r.x-x,r.y-y);if(!best||cost<best.cost)best={...r,cost};}
   placed.push(best);n.label.hidden=false;n.label.style.cssText=`left:0;top:0;transform:translate3d(${best.x}px,${best.y}px,0);width:${labelW}px`;
   n.label.dataset.active=String(item.id===data.activeId);n.label.dataset.context=String(context);
   n.label.querySelector('b').textContent=String(index+1).padStart(2,'0');n.label.querySelector('strong').textContent=item.label;n.label.querySelector('span').textContent=showSize?item.measurement:'';
   const anchor={x:clamp(best.x+best.w/2,x,right),y:clamp(best.y+best.h/2,y,bottom)};
   n.leader.setAttribute('d',`M${anchor.x},${anchor.y} L${best.x+8},${best.y+labelH/2}`);
  }
 }
 return {update};
}
