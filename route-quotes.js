// Drive-by auto quote as live camera recognition (v3 test, Claude 10-30). Owner 10-30: "when it drives by act like its
// live camera recognition with bounding boxes and details square footage instead of just pricing ... like we did in
// '04 / 07 UNDERSTAND THE JOB'". As a house comes into view its box draws itself (thin outline, corner brackets, a
// reticle that locks, a scan sweep, a confidence tick), then the measured scope counts up line by line (lawn, edging,
// hedge, beds, tree rings) and the estimate comes last and small. Every value is a pure function of the house's scan
// clock (property.scan.t, built from the film frame in recorded-scene-hqworld4.js): scrubbing backwards undraws it and
// nothing runs on a timer. The boxes come with the film json (render-town-prefix-v6.py house_boxes -> states[i].route
// .properties[k].box in canvas px + boxInView; the player scales them to the displayed film); a film without boxes
// falls back to a frame around the property point. Lawn and edging are the json's area/edges; hedge, beds and tree
// rings are derived from the house id so each house differs (the selected stop takes the vision chapter's jobs, so
// the drive-by and "Understand the job" agree). The 10-29 price card and the quoted-history chips are gone.
const NS='http://www.w3.org/2000/svg';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const span=(t,a,b)=>clamp((t-a)/(b-a));
const ease=t=>1-(1-clamp(t))**3;                    // ease-out: the count-up settles on its number
const svg=(tag,cls,attrs={})=>{const e=document.createElementNS(NS,tag);if(cls)e.setAttribute('class',cls);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
const html=(tag,cls,inner='')=>{const e=document.createElement(tag);e.className=cls;e.innerHTML=inner;return e;};
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
const num=v=>Math.round(v).toLocaleString('en-US');
const pad=n=>String(n).padStart(2,'0');
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
// The scan clock t (0..1) of one house: outline draws, corners and reticle lock, the sweep reads the lot, the tag
// shows the lock confidence, then the panel's rows count up one after another and the quote comes last.
const T={draw:[0,.22],corners:[.1,.3],lockIn:[.04,.14],lockOut:[.46,.62],lockScale:[.04,.3],sweep:[.14,.5],tag:[.16,.26],conf:[.18,.52],panel:[.24,.34],rows:{start:.3,step:.105,dur:.16},quote:[.88,1]};
const ROWS=5,PANEL_W=178,PANEL_H=146;             // panel size at --hud 1 (full height reserved so a panel never moves while it fills)
function scopeFor(p,jobs){
 const h=fnv(p.id);
 let hedge=24+((h>>>3)%21)*2,beds=140+((h>>>8)%25)*10,trees=2+(h>>>13)%5;const conf=.93+((h>>>17)%7)/100;
 if(p.selected)for(const j of jobs||[]){const v=parseFloat(String(j.value).replace(/[^\d.]/g,''));if(!Number.isFinite(v))continue;if(/hedge/i.test(j.label))hedge=v;else if(/mulch|bed/i.test(j.label))beds=v;else if(/tree/i.test(j.label))trees=v;}
 return {conf,rows:[['Lawn',p.area||0,'sq ft'],['Edging',p.edges||0,'linear ft'],['Hedge',hedge,'linear ft'],['Beds',beds,'sq ft'],['Tree rings',trees,'']]};
}
export function createRouteQuotes(host){
 const root=html('div','route-quotes');root.hidden=true;
 const boxes=svg('svg','route-boxes'),defs=svg('defs'),grad=svg('linearGradient',null,{id:'route-scan-grad',x1:0,y1:0,x2:0,y2:1});
 grad.append(svg('stop',null,{offset:0,'stop-opacity':0}),svg('stop',null,{offset:1,'stop-opacity':.3}));defs.append(grad);boxes.append(defs);
 const panels=html('div','route-panels');
 const feed=html('div','route-feed','<span>CAM 01 / DRIVE-BY · PROPERTY SCAN</span><strong></strong><i></i>');
 const ledger=html('div','route-ledger');ledger.hidden=true;ledger.setAttribute('aria-label','Properties measured so far');
 root.append(boxes,panels,feed,ledger);host.append(root);
 const feedState=feed.querySelector('strong'),feedBar=feed.querySelector('i');
 const nodes=new Map(),scopes=new Map();let ledgerKey='';
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const g=svg('g','route-box'),frame=svg('rect','rb-frame',{pathLength:1,rx:1}),band=svg('rect','rb-band',{fill:'url(#route-scan-grad)'}),sweep=svg('line','rb-sweep'),corners=svg('path','rb-corners'),reticle=svg('g','rb-reticle'),leader=svg('path','rb-leader'),tag=svg('text','rb-tag');
  reticle.append(svg('circle',null,{r:3}),svg('path',null,{d:'M-10,0H-5 M5,0H10 M0,-10V-5 M0,5V10'}));
  g.append(frame,band,sweep,corners,reticle,leader,tag);boxes.append(g);
  const panel=html('div','route-panel','<div class="route-panel-head"><span class="route-panel-kicker"></span><span class="route-panel-state"></span></div><div class="route-panel-note">Selected stop · the job</div><dl class="route-panel-rows"></dl><div class="route-panel-quote"><span>Auto quote</span><strong></strong></div>');
  const rows=[];for(let i=0;i<ROWS;i++){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');row.append(dt,dd);panel.querySelector('dl').append(row);rows.push({row,dt,dd});}
  panels.append(panel);
  const n={g,frame,band,sweep,corners,reticle,leader,tag,panel,rows,kicker:panel.querySelector('.route-panel-kicker'),state:panel.querySelector('.route-panel-state'),note:panel.querySelector('.route-panel-note'),quote:panel.querySelector('.route-panel-quote'),price:panel.querySelector('.route-panel-quote strong')};
  nodes.set(id,n);return n;
 }
 const rectOf=e=>{if(!e||e.hidden)return null;const r=e.getBoundingClientRect();if(!r.width||!r.height)return null;const o=host.getBoundingClientRect();return {x:r.x-o.x-8,y:r.y-o.y-8,w:r.width+16,h:r.height+16};};
 return {update(state,width,height){
  const route=state?.route,active=!!route?.active;root.hidden=!active;host.dataset.route=String(active);
  if(!active)return;
  if(state.playback==='recorded'&&Math.abs(state.videoTime-state.videoTarget)>.16){root.hidden=true;return;}
  const w=width,h=height,s=clamp(Math.min(w/1920,h/1200)**.8,.85,2);   // the HUD grows with the film, gently
  root.style.setProperty('--hud',s.toFixed(3));
  boxes.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const jobs=state.vision?.jobs,margin=18*s,PW=PANEL_W*s,PH=PANEL_H*s,top=h*.11,bottom=h*.86;
  // Keep the panels off the chapter copy, the fact card, the feed line and the page chrome bands.
  const exclusions=[rectOf(host.querySelector('.tour-copy')),rectOf(host.querySelector('#route-fact')||document.getElementById('route-fact')),rectOf(feed),{x:0,y:0,w,h:top},{x:0,y:bottom,w,h:h-bottom}].filter(Boolean);
  const placed=[],seen=new Set(),settled=[];let total=0,done=0,progress=0;
  const ordered=(route.properties||[]).filter(p=>p.scan).sort((a,b)=>a.scan.order-b.scan.order);   // route order: earlier houses claim their spot first
  for(const p of ordered){
   const t=p.scan.t;total++;progress+=t;if(t>=1){done++;settled.push(p);}
   if(!(p.box?(p.boxInView??p.inView):p.inView))continue;
   const b=p.box||{x0:p.x-.11*w,y0:p.y-.16*h,x1:p.x+.11*w,y1:p.y+.06*h};
   const bw=b.x1-b.x0,bh=b.y1-b.y0;if(!(bw>0&&bh>0)||bw>1.6*w||bh>1.6*h)continue;   // beside the camera: the projection blew up
   const x0=clamp(b.x0,2,w-2),y0=clamp(b.y0,2,h-2),x1=clamp(b.x1,2,w-2),y1=clamp(b.y1,2,h-2);
   if(x1-x0<24||y1-y0<16)continue;
   const off=(Math.max(0,-b.x0)+Math.max(0,b.x1-w))/bw;   // the house leaving the frame fades its reading out
   const alpha=1-(p.selected?span(off,.55,.85):span(off,.35,.65));
   if(alpha<=0)continue;
   seen.add(p.id);
   const n=node(p.id),scope=scopes.get(p.id+(p.selected?JSON.stringify(jobs||null):''))||scopeFor(p,jobs);scopes.set(p.id+(p.selected?JSON.stringify(jobs||null):''),scope);
   const house=p.house||String(p.id).split('-').at(-1),kicker=p.selected?'Selected stop · House '+house:'House '+house;
   const phase=t<=0?'candidate':t>=1?'settled':'scan';
   n.g.style.display='';n.g.dataset.phase=phase;n.g.dataset.selected=String(!!p.selected);n.g.style.opacity=alpha.toFixed(3);
   // Outline: draws itself around the house (pathLength 1, offset 1 -> 0); a candidate is a faint dotted frame.
   for(const [k,v] of Object.entries({x:x0,y:y0,width:x1-x0,height:y1-y0}))n.frame.setAttribute(k,v);
   n.frame.setAttribute('stroke-dashoffset',phase==='candidate'?0:(1-span(t,...T.draw)).toFixed(4));
   // Corner brackets lock on once the outline is around.
   const L=Math.min(16*s,.22*Math.min(x1-x0,y1-y0));
   n.corners.setAttribute('d',`M${x0},${y0+L}V${y0}H${x0+L} M${x1-L},${y0}H${x1}V${y0+L} M${x1},${y1-L}V${y1}H${x1-L} M${x0+L},${y1}H${x0}V${y1-L}`);
   n.corners.style.opacity=span(t,...T.corners).toFixed(3);
   // Reticle: appears large at the house's centre, shrinks as it locks, then gives way to the reading.
   const cx=(x0+x1)/2,cy=(y0+y1)/2,lock=span(t,...T.lockIn)*(1-span(t,...T.lockOut)),k=(1.8-.8*ease(span(t,...T.lockScale)))*s;
   n.reticle.style.opacity=lock.toFixed(3);n.reticle.style.display=lock>0?'':'none';n.reticle.setAttribute('transform',`translate(${cx.toFixed(1)},${cy.toFixed(1)}) scale(${k.toFixed(3)})`);
   // Scan sweep: a soft band reads the lot top to bottom once.
   const u=span(t,...T.sweep),bandH=Math.max(10*s,.12*(y1-y0)),sy=y0+(y1-y0)*u,bandOn=u>0&&u<1;
   n.band.style.display=n.sweep.style.display=bandOn?'':'none';
   if(bandOn){const bo=Math.sin(u*Math.PI);for(const [kk,v] of Object.entries({x:x0,y:Math.max(y0,sy-bandH),width:x1-x0,height:Math.min(bandH,sy-y0)}))n.band.setAttribute(kk,v);n.band.style.opacity=bo.toFixed(3);
    for(const [kk,v] of Object.entries({x1:x0,x2:x1,y1:sy,y2:sy}))n.sweep.setAttribute(kk,v);n.sweep.style.opacity=bo.toFixed(3);}
   // Tag above the box: the lock confidence counts up, then the box is marked measured.
   const conf=.40+(scope.conf-.40)*ease(span(t,...T.conf)),tagOn=span(t,...T.tag);
   n.tag.style.opacity=tagOn.toFixed(3);n.tag.style.display=tagOn>0?'':'none';
   // Above the box's top-left corner; when the page copy covers that spot, inside the box's bottom-left instead.
   const tagW=150*s,tagH=10*s,tagX=Math.max(x0+1,margin);let tagY=y0>=22*s?y0-7*s:y0+13*s;
   const covered=y=>exclusions.some(a=>overlap({x:tagX,y:y-tagH,w:tagW,h:tagH},a)>0);
   if(covered(tagY)&&!covered(y1-6*s))tagY=y1-6*s;
   n.tag.setAttribute('x',tagX.toFixed(1));n.tag.setAttribute('y',tagY.toFixed(1));
   n.tag.textContent=(kicker+' · '+(t>=1?'measured':'lock '+conf.toFixed(2))).toUpperCase();
   // Panel: appears beside the box once the lock holds; rows count up one after another, the quote comes last.
   const po=span(t,...T.panel)*alpha;
   n.panel.hidden=po<=0;n.leader.style.display=po>0?'':'none';
   if(po>0){
    n.panel.dataset.selected=String(!!p.selected);n.panel.style.opacity=po.toFixed(3);n.panel.style.width=PW+'px';
    n.kicker.textContent='House '+house;n.note.hidden=!p.selected;n.state.textContent=t>=1?'Measured':'Measuring';
    scope.rows.forEach(([label,value,unit],i)=>{
     const r=n.rows[i],ru=span(t,T.rows.start+i*T.rows.step,T.rows.start+i*T.rows.step+T.rows.dur);
     r.row.hidden=ru<=0;if(ru<=0)return;
     r.row.style.opacity=Math.min(1,ru*3).toFixed(3);r.dt.textContent=label;
     const v=value*ease(ru);r.dd.textContent=unit?'≈ '+num(v)+' '+unit:num(v);
    });
    const q=span(t,...T.quote);n.quote.hidden=q<=0;
    if(q>0){n.quote.style.opacity=q.toFixed(3);n.quote.style.transform=`translateY(${((1-q)*6*s).toFixed(2)}px)`;n.price.textContent='$'+num(p.estimate||0);}
    // Place the panel: beside the box when there is room, otherwise inside its top corner or below; never on the copy.
    const gap=10*s,cands=[{x:x1+gap,y:y0},{x:x1+gap,y:cy-PH/2},{x:x0-gap-PW,y:y0},{x:x0-gap-PW,y:cy-PH/2},{x:x0,y:y1+gap},{x:x1-PW,y:y1+gap},{x:x0,y:y0-gap-PH},{x:x1-PW-gap,y:y0+gap},{x:x0+gap,y:y0+gap}];
    for(let yy=top+gap;yy<bottom-PH;yy+=PH+gap)cands.push({x:w-margin-PW,y:yy});
    const own={x:x0,y:y0,w:x1-x0,h:y1-y0};let best=null;
    for(const c of cands){
     const r={x:clamp(c.x,margin,w-margin-PW),y:clamp(c.y,top,bottom-PH),w:PW,h:PH};
     const cost=[...placed,...exclusions].reduce((sum,a)=>sum+overlap(r,a)*30,0)+overlap(r,own)*1.5+Math.hypot(Math.max(0,x0-(r.x+r.w),r.x-x1),Math.max(0,y0-(r.y+r.h),r.y-y1))*2;
     if(!best||cost<best.cost)best={...r,cost};
    }
    placed.push(best);n.panel.style.transform=`translate3d(${best.x.toFixed(1)}px,${best.y.toFixed(1)}px,0)`;
    // Leader from the reading to the nearest point of the box, unless the panel sits on the box.
    const pcx=best.x+best.w/2,pcy=best.y+Math.min(best.h/2,24*s),ax=clamp(pcx,x0,x1),ay=clamp(pcy,y0,y1),ex=clamp(ax,best.x,best.x+best.w),ey=clamp(ay,best.y,best.y+best.h);
    const inside=ax>best.x&&ax<best.x+best.w&&ay>best.y&&ay<best.y+best.h;
    n.leader.style.display=inside?'none':'';n.leader.style.opacity=(po*.8).toFixed(3);n.leader.setAttribute('d',`M${ax.toFixed(1)},${ay.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`);
   }
  }
  for(const [id,n] of nodes)if(!seen.has(id)){n.g.style.display='none';n.panel.hidden=true;}
  // Feed line: how far the drive-by reading has come.
  feedState.textContent=total?done>=total?`${total} OF ${total} MEASURED`:done<ordered.length&&ordered[done].scan.t>0?`MEASURING ${pad(done+1)} OF ${pad(total)}`:`SCANNING · ${pad(total)} PROPERTIES`:'SCANNING';
  feedBar.style.transform=`scaleX(${total?(progress/total).toFixed(4):0})`;
  // Ledger: what has been measured so far (square footage, not price), so a house keeps its reading after it passes.
  const key=settled.map(p=>p.id).join();
  if(key!==ledgerKey){ledgerKey=key;ledger.hidden=!settled.length;ledger.replaceChildren(...settled.map(p=>{const item=document.createElement('span');item.innerHTML=`<b>${p.selected?'Stop':'House'} ${p.house||String(p.id).split('-').at(-1)}</b> · ${num(p.area||0)} sq ft`;return item;}));}
 }};
}
