// The "Cameras measure" outlines were detected on the See it work film itself and follow its camera
// (timeline vision.track). Every property the trailer's cameras can see is read: the stop, the house next
// door on each side, and the yard across the street. This check opens the chapter at frames across both
// aerial shots and proves, from the pixels of the film, that the outlines sit on what they name:
//   - each property's lawn outline is filled with grass, and the stop's outline moved onto the street is not;
//   - the frame around each house holds a roof, not grass; each tree box holds a tree;
//   - the trailer reference sits on the trailer's light roof; nothing is drawn after the cut to the phone shot.
// PREVIEW_URL=http://127.0.0.1:8768 node tools/check-yard-scope.mjs
import {chromium} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768',out=process.env.REVIEW_OUTPUT||'/home/jaxon/website-review-20261109/yard-scope';
fs.mkdirSync(out,{recursive:true});
// Frames are named on the 10-26 cut (grass in 0-299, drop-off 300-1415, the job from 1416). The installed film may be in the
// owner's job-first order (11-21, field_order.py: the same film rotated at 1416) and trimmed (the aerial shortened, the
// drive-off cut; howItWorks.timeMap = knots [job-first timeline frame, film frame]); at() turns a 10-26 frame into the
// installed film frame that carries the same moment of the timeline (same caption, same stage of the yard overlay).
const timeline=JSON.parse(fs.readFileSync(new URL('../assets/scene-recovery-v2/field/desktop.json',import.meta.url),'utf8'));
const jobFirst=timeline.howItWorks?.order==='job-first',knots=timeline.howItWorks?.timeMap;
const through=s=>{if(!knots)return s;for(let i=1;i<knots.length;i++)if(s<=knots[i][0]){const [a,x]=knots[i-1],[b,y]=knots[i];return x+(s-a)*(y-x)/(b-a);}return knots.at(-1)[1];};
const at=f=>Math.round(through(jobFirst?(f>=1416?f-1416:f+1672):f));
const FRAMES=timeline.frames,SHOWN=[2112,2200,2300,2355,2365,2470,2480,2585],AFTER_CUT=2597;
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});const report={checks:[],errors:[]};
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,200));});
  await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{effectiveType:'4g',downlink:10,saveData:false}}));
  await page.goto(`${base}/#inside`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__officialJourneyState,{timeout:90000});
  await page.addStyleTag({content:'#local-page-editor-link{display:none!important}'});
  const visit=async frame=>{
   const p=at(frame)/(FRAMES-1);
   await page.evaluate(p=>{document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#inside'}}));const slot=document.querySelector('#inside').previousElementSibling;scrollTo({top:slot.offsetTop+innerHeight*.75+p*(slot.offsetHeight-innerHeight*1.5),behavior:'instant'});},p);
   await page.waitForFunction(p=>{const s=window.__officialJourneyState,v=document.querySelector('#tour-visual video');return s?.videoReady&&Math.abs(s.targetProgress-p)<.002&&v&&!v.seeking&&v.readyState>=2&&Math.abs(v.currentTime-s.videoTarget)<.1;},p,{timeout:45000});
   await page.waitForTimeout(900);
  };
  for(const frame of SHOWN){
   await visit(frame);
   const row=await page.evaluate(()=>{
    const s=window.__officialJourneyState,video=document.querySelector('#tour-visual video'),pin=document.querySelector('.official-tour');
    const vr=video.getBoundingClientRect(),pr=pin.getBoundingClientRect(),canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0);
    const pixel=(x,y)=>{const vx=Math.round((x+pr.left-vr.left)/vr.width*canvas.width),vy=Math.round((y+pr.top-vr.top)/vr.height*canvas.height);if(vx<0||vy<0||vx>=canvas.width||vy>=canvas.height)return null;return ctx.getImageData(vx,vy,1,1).data;};
    const inside=(poly,x,y)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;};
    // Measured on the film: sunlit turf is olive (about 115,108,65), paving, roofs, the street and the vehicles are grey (green minus blue under 10).
    // Turf keeps that olive balance in shadow too, so the test is relative to brightness (green over blue by a fifth).
    const grass=d=>(d[1]-d[2])/Math.max(d[1],1)>.2,plant=d=>(d[1]-d[2])/Math.max(d[1],1)>.12;
    const vision=s.vision,cover=vision.cover||[];
    // every polygon of an area, sampled on a grid; points behind the trailer or pickup, or off the picture, do not count
    const share=(polys,test,dx=0,dy=0)=>{let n=0,yes=0;for(const poly of polys){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const v of poly){x0=Math.min(x0,v.x);y0=Math.min(y0,v.y);x1=Math.max(x1,v.x);y1=Math.max(y1,v.y);}
      const step=Math.max(3,Math.sqrt((x1-x0)*(y1-y0)/900));for(let y=y0;y<=y1;y+=step)for(let x=x0;x<=x1;x+=step){if(!inside(poly,x,y)||cover.some(c=>inside(c,x+dx,y+dy)))continue;const d=pixel(x+dx,y+dy);if(!d)continue;n++;if(test(d))yes++;}}return {n,share:n?yes/n:0};};
    const boxShare=(b,test)=>{let n=0,yes=0;for(let y=b.y+b.height*.2;y<=b.y+b.height*.7;y+=Math.max(1,b.height/14))for(let x=b.x+b.width*.3;x<=b.x+b.width*.7;x+=Math.max(1,b.width/10)){const d=pixel(x,y);if(!d)continue;n++;if(test(d))yes++;}return {n,share:n?yes/n:0};};
    const around=[];for(let dy=-10;dy<=10;dy+=5)for(let dx=-10;dx<=10;dx+=5){const d=pixel(vision.origin.x+dx,vision.origin.y+dy);if(d)around.push(d);}   // the roof around the point: a vent or a seam under the exact pixel is still roof
    around.sort((a,b)=>Math.min(a[0],a[1],a[2])-Math.min(b[0],b[1],b[2]));const roof=around.length?around[Math.floor(around.length/2)]:null;
    const properties=vision.observations.map(o=>{
     const lawns=o.polygons.filter((_,i)=>o.kinds[i]==='lawn');let top=Infinity,bottom=-Infinity;for(const v of lawns.flat()){top=Math.min(top,v.y);bottom=Math.max(bottom,v.y);}
     return {id:o.id,lawn:share(lawns,plant),lawnMoved:share(lawns,plant,0,(bottom-top)*.55),house:o.frame?boxShare(o.box,grass):null,
      trees:o.parts.filter((_,i)=>o.boxes[i].includes('-tree-')).map(b=>boxShare(b,plant)),shrubs:o.boxes.filter(id=>id.includes('-shrub-')).length,beds:o.kinds.filter(k=>k==='bed').length};});
    return {time:s.presentationTime,visible:vision.visible,pinVision:pin.dataset.vision,count:vision.observations.length,stage:vision.stage,aspect:vr.width/vr.height,properties,
     roof:roof&&[...roof].slice(0,3),labels:[...document.querySelectorAll('.vision-label:not([hidden]) strong')].map(l=>l.textContent),
     rows:[...document.querySelectorAll('#vision-summary .vision-table tbody tr')].map(r=>[...r.cells].map(c=>c.textContent).join(' | ')),
     clip:['x','y','width','height'].map(k=>+document.querySelector('#landscape-scope-clip rect').getAttribute(k)),film:[vr.left-pr.left,vr.top-pr.top,vr.width,vr.height]};
   });
   const tag=`${mobile?'phone':'laptop'} frame ${at(frame)} (${frame} of the 10-26 cut): ${JSON.stringify(row)}`;
   assert(row.visible&&row.pinVision==='true',tag);assert(Math.abs(row.time*30-at(frame))<1.6,tag);assert(Math.abs(row.aspect-16/9)<.01,tag);
   const stop=row.properties.find(q=>q.id==='stop');
   assert(stop&&stop.lawn.n>300&&stop.lawn.share>.75,tag);                          // the stop's outline is on grass. 11-21 (20 ft re-shoot): this take's turf is paler and half in the house's shadow, so lawns are read with the plant test (green over blue by an eighth), which still rejects road, paving and roofs; the moved-outline check below still catches a misplaced outline. About a tenth of this lawn lies in near-black shade (house, trees), which no colour test calls grass, hence .75 (measured .78 on-lawn vs .28 moved off)
   assert(stop.lawnMoved.n>100&&stop.lawnMoved.share<stop.lawn.share-.3,tag);       // and moving it off the lawn is noticed
   for(const q of row.properties){
    // every yard in view, not only the stop's. Across the street the turf is dry and under the trailer's shadow (71% reads as grass on the
    // reference frame, the street and paving read 0%), so its bar is lower.
    if(q.lawn.n>80)assert(q.lawn.share>(q.id==='across'?.4:.75),`${q.id} lawn: ${tag}`);   // house lawns: see the shade note above (tree and house shadows on this take)
    if(q.house&&q.house.n>20)assert(q.house.share<.35,`${q.id} house frame: ${tag}`);   // a house frame holds roof and wall, not turf
    for(const tree of q.trees)assert(tree.n<6||tree.share>.3,`${q.id} tree: ${tag}`);   // 11-21 (20 ft re-shoot): the left neighbour's young tree has sparse brown-olive leaves (.375-.475; the box was checked by eye on it at 2200, 2250, 2300, 2318); a box on paving or roof reads near 0
   }
   // outlines stop at the edge of the picture (yards cut off by it are carried a little further in the data)
   assert(row.clip[0]>=row.film[0]-1&&row.clip[1]>=row.film[1]-1&&row.clip[0]+row.clip[2]<=row.film[0]+row.film[2]+1&&row.clip[1]+row.clip[3]<=row.film[1]+row.film[3]+1,tag);
   if(frame>=2240){assert.deepEqual(row.properties.map(q=>q.id),['stop','left','right','across'],tag);assert(row.properties[0].shrubs>=4,tag);assert(row.properties[0].beds>=1,tag);
    assert(row.properties.reduce((n,q)=>n+q.trees.length,0)>=2,tag);}
   if(frame>=2340)assert.equal(row.rows.length,4,tag);
   if(frame>=2365){assert.equal(row.stage,'localize',tag);assert(row.roof&&Math.max(...row.roof)<140&&Math.max(...row.roof)-Math.min(...row.roof)<25,tag);}     // RTK reference on the trailer's roof: a neutral grey, not turf. 11-23 the aerial is one sharp drone still (owner: 'blurry'); its black roof catches the sun and reads ~115 (was ~65 on the repainted 11-22 take)
   if([2300,2470].includes(frame))await page.screenshot({path:`${out}/${mobile?'phone':'laptop'}-${at(frame)}.png`});
   report.checks.push({mobile,frame:at(frame),stage:row.stage,lawns:Object.fromEntries(row.properties.map(q=>[q.id,+q.lawn.share.toFixed(2)])),stopMoved:+stop.lawnMoved.share.toFixed(2),houses:Object.fromEntries(row.properties.filter(q=>q.house).map(q=>[q.id,+q.house.share.toFixed(2)])),trees:row.properties.flatMap(q=>q.trees.map(x=>+x.share.toFixed(2)))});
  }
  // owner 11-21: "remove the dashed boxes on the houses in the video": no house frame in any shot
  for(const frame of [420,1500,1700,1850,2300,2470,2900,3040]){
   await visit(frame);
   const row=await page.evaluate(()=>({scan:document.querySelector('.official-tour').dataset.scan,
    drawn:[...document.querySelectorAll('.scan-frame')].filter(f=>f.style.display!=='none').length,
    framed:[...document.querySelectorAll('.vision-geometry [data-frame=true]')].filter(g=>g.style.display!=='none').length}));
   const tag=`${mobile?'phone':'laptop'} frame ${at(frame)}: ${JSON.stringify(row)}`;
   assert.notEqual(row.scan,'true',tag);assert.equal(row.drawn,0,tag);assert.equal(row.framed,0,tag);
   report.checks.push({mobile,frame:at(frame),houseFrames:0});
  }
  // a shot with no house in the picture (the grass chute close-up) has no boxes
  await visit(120);
  assert.equal(await page.evaluate(()=>document.querySelector('.official-tour').dataset.scan),'false',`${mobile?'phone':'laptop'}: boxes on a shot with no house`);
  await visit(AFTER_CUT);
  const after=await page.evaluate(()=>({visible:window.__officialJourneyState.vision.visible,pin:document.querySelector('.official-tour').dataset.vision,hidden:document.querySelector('#vision-overlay').hidden}));
  assert.deepEqual(after,{visible:false,pin:'false',hidden:true},`${mobile?'phone':'laptop'} after the cut: ${JSON.stringify(after)}`);
  report.checks.push({mobile,frame:at(AFTER_CUT),visible:false});
  await page.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
