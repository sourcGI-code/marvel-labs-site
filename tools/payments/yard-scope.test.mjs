// The "Cameras measure" outlines of the See it work film: detected on the film itself and
// carried through its two aerial yard shots by a track (qa-tools yard_scope.py). Owner 11-20:
// the cameras are "supposed to be recording and viewing everyones place", so every property in
// view is read, each with its own house frame and its own row of sizes. These tests read the
// installed timelines only; tools/check-yard-scope.mjs checks them against the picture.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=kind=>JSON.parse(fs.readFileSync(new URL(`../../assets/scene-recovery-v2/field/${kind}.json`,import.meta.url),'utf8'));
const desktop=read('desktop'),mobile=read('mobile'),vision=desktop.vision,track=vision.track;

test('phone and laptop timelines carry the same detected scope',()=>{
 assert.deepEqual(mobile.vision,desktop.vision);
 assert.equal(desktop.width,1600);assert.equal(desktop.height,900);
 assert.equal(vision.overlay,undefined,'the outlines are on: this scope was found on this film');
});

test('every property in view is read: the stop, both neighbours and the yard across the street',()=>{
 assert.deepEqual(vision.observations.map(o=>o.id),['stop','left','right','across']);
 assert.equal(vision.total,vision.observations.length);
 for(const o of vision.observations){
  assert(o.label&&o.task&&o.detail,o.id);assert.match(o.measurement,/^≈ [\d,]+ sq ft (lawn|in view)$/,o.id);
  assert(o.box.width>0&&o.box.height>0,o.id);assert.equal(o.kinds.length,o.polygons.length,o.id);assert.equal(o.parts.length,o.boxes.length,o.id);
  assert(o.kinds.includes('lawn'),`${o.id} has turf outlined`);
  // a house stands on three of them and places that property's tag; across the street only the yard is in the picture.
  // Owner 11-21: "remove the dashed boxes on the houses": no property carries a frame.
  assert.equal(o.frame,undefined,o.id);
  // a property whose house is in the picture tags its house; a yard seen without its house carries a ground anchor
  if(o.follow)assert.equal(o.follow,`${o.id}-house`);else{assert.equal(o.cover,false);assert(o.anchor,o.id);}
 }
 const stop=vision.observations[0];
 // counts come from the detector on whatever cut of the film is installed: the stop has beds and a row of shrubs, and its mailbox post.
 // Owner 11-24: the aerial is now HIS drone clip, ~200 ft up: beds and single shrubs are not resolved there (lawn + edging + tree rings).
 const fromDrone=/drone/.test(vision.source.detector);
 if(!fromDrone){assert(stop.kinds.filter(k=>k==='bed').length>=1);assert(stop.boxes.filter(id=>id.includes('-shrub-')).length>=4);}   // a mailbox post is boxed only where the cut has one
 assert(stop.kinds.includes('edge'));
});

test('the table gives each property the five things the caption names',()=>{
 assert.deepEqual(vision.table.columns.map(c=>c[0]),['Lawn','Edging','Shrubs','Beds','Trees']);
 assert.deepEqual(vision.table.rows.map(r=>r.id),vision.observations.map(o=>o.id));
 const facts=vision.source.properties;
 vision.table.rows.forEach((row,index)=>{
  const o=vision.observations[index],f=facts[row.id];
  assert.equal(row.values.length,5,row.id);for(const v of row.values)assert.match(v,/^([\d,]+\+?|–)$/,row.id);
  // the table, the tag on the picture and the count of boxes agree
  assert.equal(row.values[0].replace('+',''),o.measurement.match(/[\d,]+/)[0],row.id);
  assert.equal(row.values[2],f.shrubs?String(o.boxes.filter(id=>id.includes('-shrub-')).length):'–',row.id);
  assert.equal(row.values[4],f.trees?String(o.boxes.filter(id=>id.includes('-tree-')).length):'–',row.id);
  // "+" marks a yard that runs past the edge of the film, and only such a yard
  assert.equal(row.values[0].endsWith('+'),f.cutOffByFrame,row.id);assert.equal(/in view$/.test(o.measurement),f.cutOffByFrame,row.id);
 });
 assert.match(vision.note,/estimated from the picture/);assert.match(vision.note,/\+ marks a yard that runs past its edge/);
 // the stop's task rows (used where one job is listed) match its table row
 assert.equal(vision.jobs[0].value,`≈ ${vision.table.rows[0].values[0]} sq ft`);if(vision.table.rows[0].values[2]!=='–')assert.equal(vision.jobs[2].value,`${vision.table.rows[0].values[2]} shrubs`);
});

test('the film runs job first: drive, unload, measure, RTK, quote, mow, then grass in, the UPS drop-off last',()=>{
 // owner 11-21: "starting a job first with driving to the destination, last should be the packaged box being taken to ups";
 // "The measure trailer part is super long"; "just fix the videos" (the film ends on the drop-off confirmation)
 for(const data of [desktop,mobile]){
  const how=data.howItWorks,last=data.frames-1;
  assert.equal(how.order,'job-first');assert.equal(how.trim.id,'aerial-5s-3s-end-on-dropoff');assert.equal(data.frames,how.trim.frames);
  assert.equal(how.field[0],0);assert.equal(how.operator[0],how.field[1]+1);assert.equal(how.delivery[0],how.operator[1]+1);assert.equal(how.delivery[1],last);
  assert.equal(how.fieldLeadFrames,0);assert.deepEqual(how.deliveryShots.map(s=>s[0]),['A','B1','B2','B3']);assert.equal(how.deliveryShots.at(-1)[2],last);
  assert.deepEqual(how.cutShots,['C']);assert.equal(data.rewind.frames,data.frames);assert(Math.abs(data.rewind.start-data.frames/30)<1e-3);
  assert((data.samples.length-1)*3===last,'a sample on the last frame');
  const at=f=>data.samples[Math.round(f/3)];
  assert.equal(at(0).segment,'field');assert.equal(at(0).mode,'towing');                                   // the rig driving to the job opens the film
  assert.equal(at(how.field[1]).segment,'field');assert.equal(at(how.operator[0]+30).segment,'operator');   // mowing, then grass in
  assert.equal(at(how.delivery[0]+30).segment,'delivery');assert.equal(at(last).delivery.shot,'B3');      // the drop-off confirmation ends the film
  assert(!data.samples.some(s=>s.delivery?.shot==='C'),'the drive-off is cut');
  for(let i=1;i<data.samples.length;i++)assert(Math.abs(data.samples[i].p*last-3*i)<.5,'samples stay on every third frame');
  assert.equal(data.stills[0].start,0);for(let i=1;i<data.stills.length;i++)assert(data.stills[i].start>data.stills[i-1].start);
  assert(data.stills.every((s,i)=>s.file.endsWith(`-step-${i}.webp`)&&s.p<=1),'step-0 is the first picture of the film');
  // the aerial is short: 5 s carry the whole Measure progression (classify -> measured) and 3 s carry RTK (localize)
  const aerial=data.samples.map((s,i)=>({f:3*i,w:s.workflowP})).filter(x=>x.w>=.16&&x.w<.46);
  const measure=aerial.filter(x=>x.w<.34),rtk=aerial.filter(x=>x.w>=.34);
  assert(measure.at(-1).f-measure[0].f<=150&&rtk.at(-1).f-rtk[0].f<=95,`Measure ${measure[0].f}-${measure.at(-1).f}, RTK ${rtk[0].f}-${rtk.at(-1).f}`);
  assert(measure.at(-1).w>.33&&rtk.at(-1).w>.45,'each part still runs its whole progression');
 }
});

test('the track covers the kept aerial and nothing else',()=>{
 // the aerial keeps one continuous stretch of the take (howItWorks.trim.keep: [film start, film end, timeline start, timeline
 // end] in job-first frames); a segment never runs across a cut in the film
 assert.equal(track.order,'job-first');assert.equal(track.trim,desktop.howItWorks.trim.id);
 const runs=[];let n=0;
 for(const [fa,fb] of desktop.howItWorks.trim.keep){const run=runs.at(-1);if(run&&run.film===fa)run.end=n+fb-fa-1,run.film=fb;else runs.push({start:n,end:n+fb-fa-1,film:fb});n+=fb-fa;}
 for(const s of track.segments)assert(runs.some(r=>s.start>=r.start&&s.end<=r.end),`segment ${s.start}-${s.end} crosses a cut`);
 assert.equal(track.segments[0].start,615);assert.equal(track.segments.at(-1).end,841);
 let previous=null;
 track.segments.forEach((segment,index)=>{
  if(previous!==null)assert(segment.start>previous);previous=segment.end;
  assert.equal(segment.frames[0],segment.start);assert.equal(segment.frames.at(-1),segment.end);
  for(let i=1;i<segment.frames.length;i++)assert(segment.frames[i]>segment.frames[i-1]&&segment.frames[i]-segment.frames[i-1]<=track.step);
  for(const key of ['H','cover','origin'])assert.equal(segment[key].length,segment.frames.length,key);
  for(const H of segment.H){assert.equal(H.length,8);assert(H.every(Number.isFinite));}
  for(const cover of segment.cover){assert(cover.length>=1);for(const flat of cover)assert(flat.length>=6&&flat.length%2===0);}
  for(const [id,series] of Object.entries(track.boxes)){assert.equal(series[index].length,segment.frames.length,id);for(const box of series[index])assert(box.length===4&&box[2]>0&&box[3]>0,id);}
 });
 // the chapters that show the scope (workflowP .20 to .46) never ask for a frame outside the track
 const shown=desktop.samples.filter(s=>s.workflowP>=.20&&s.workflowP<.46).map(s=>s.p*(desktop.frames-1));
 assert(Math.min(...shown)>=track.segments[0].start-.5&&Math.max(...shown)<=track.segments.at(-1).end+.5);
});

test('every followed thing has its boxes, and the camera path is smooth inside a shot',()=>{
 const ids=new Set(Object.keys(track.boxes)),used=new Set();
 for(const o of vision.observations){if(o.follow){assert(ids.has(o.follow),o.id);used.add(o.follow);}for(const id of o.boxes){assert(ids.has(id),id);used.add(id);}}
 assert.deepEqual([...ids].sort(),[...used].sort(),'no stray tracks');
 const apply=(H,x,y)=>{const w=H[6]*x+H[7]*y+1;return [(H[0]*x+H[1]*y+H[2])/w,(H[3]*x+H[4]*y+H[5])/w];};
 for(const segment of track.segments)for(let i=1;i<segment.H.length;i++){
  const a=apply(segment.H[i-1],800,450),b=apply(segment.H[i],800,450);
  assert(Math.hypot(b[0]-a[0],b[1]-a[1])<14,`camera jumps ${Math.hypot(b[0]-a[0],b[1]-a[1]).toFixed(1)} px at frame ${segment.frames[i]}`);
 }
 // next to the reference frame the homography is all but the identity: the outlines are drawn where they were detected.
 // (A re-shot film takes its reference frame at the start of the aerial shot, before the chapter that shows the scope; then there is no such sample.)
 const segment=track.segments.find(s=>s.start<=track.reference&&track.reference<=s.end);
 if(segment){
  const nearest=segment.frames.reduce((best,f)=>Math.abs(f-track.reference)<Math.abs(best-track.reference)?f:best);
  assert(Math.abs(nearest-track.reference)<=1);
  const [x,y]=apply(segment.H[segment.frames.indexOf(nearest)],800,450);assert(Math.hypot(x-800,y-450)<3,`reference moved ${Math.hypot(x-800,y-450).toFixed(2)} px`);
 }else assert(track.reference<track.segments[0].start&&track.segments[0].start-track.reference<120);
});

test('no dashed boxes on the houses: the other shots carry no house frames',()=>{
 // owner 11-21: "remove the dashed boxes on the houses in the video"
 assert.equal(desktop.scan,undefined);assert.equal(mobile.scan,undefined);
});
