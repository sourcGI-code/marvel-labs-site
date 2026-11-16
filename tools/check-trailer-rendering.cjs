// BASE_URL=http://127.0.0.1:4248 PLAYWRIGHT_MODULE=/path/to/playwright QA_OUTPUT=/path/to/results node tools/check-trailer-rendering.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4248';
const out=process.env.QA_OUTPUT||'/tmp/marvel-trailer-rendering';fs.mkdirSync(out,{recursive:true});
const sizes=[[360,740],[390,844],[768,1024],[1440,900],[844,390]];
const report={checks:[],errors:[],badResponses:[]};
const launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'],executablePath:process.env.CHROME_PATH||'/opt/google/chrome/chrome'};
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function resetScroll(page){await page.locator('main').evaluate(e=>{e.scrollTop=0;});await settle(page);}
async function geometry(page){return page.evaluate(async()=>{
 const THREE=await import('/vendor/three/three.module.min.js');
 const {T,camera,renderer}=__rs3d,section=document.querySelector('.reserve-stage');
 const host=renderer.domElement.getBoundingClientRect(),points=[];
 for(const trailer of Object.values(T)){
  if(!trailer.group.visible)continue;
  const model=trailer.group.children[0];model.updateWorldMatrix(true,true);
  model.traverse(o=>{if(o.isMesh&&!o.userData.colourStudioOverlay){
   o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;
   for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(o.matrixWorld).project(camera));
  }});
 }
 const rect=el=>el?.getBoundingClientRect().toJSON();
 return {state:__rs3d.state(),ramp:T[section.dataset.size]?.ramp,stacked:section.dataset.reservationStacked==='true',
  projected:{left:(Math.min(...points.map(p=>p.x))+1)*host.width/2+host.left,right:(Math.max(...points.map(p=>p.x))+1)*host.width/2+host.left,top:(1-Math.max(...points.map(p=>p.y)))*host.height/2+host.top,bottom:(1-Math.min(...points.map(p=>p.y)))*host.height/2+host.top},
  host:host.toJSON(),controls:rect(section.querySelector('.rs-3d-bar')),rail:rect(section.querySelector('.rv-rail')),overflow:document.documentElement.scrollWidth>innerWidth};
});}
async function fit(page,label){
 const g=await geometry(page),p=g.projected;
 assert(!g.overflow,label+': horizontal overflow');
 assert(p.left>=g.host.left-1&&p.right<=g.host.right+1,label+': trailer cropped horizontally');
 assert(p.top>=g.host.top-1&&p.bottom<=g.host.bottom+1,label+': trailer cropped vertically');
 if(g.controls?.height)assert(p.bottom<g.controls.top,label+': trailer overlaps controls');
 if(!g.stacked)assert(p.left>g.rail.right,label+': trailer behind reservation form');
 report.checks.push({label,...g});
}
(async()=>{
 const browser=await pw.chromium.launch(launch);
 try{
  for(const [width,height]of sizes){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<900,isMobile:width<900});
   page.on('pageerror',e=>report.errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)report.badResponses.push(r.status()+' '+r.url());});
   await page.goto(base+'/reserve.html?debug3d=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('.rv')?.dataset.viewer==='interactive',null,{timeout:30000});await settle(page);
   await fit(page,`${width}-overview`);
   await page.screenshot({path:path.join(out,`${width}-overview.png`)});
   for(const size of ['20','16']){
    await page.locator(`label:has([name=size][value="${size}"])`).click();await resetScroll(page);
    await page.waitForFunction(s=>__rs3d.state().focus===s,size);
    assert.equal(await page.evaluate(()=>__rs3d.state().focus),size);
    await fit(page,`${width}-${size}-closed`);
    await page.locator('.rs-ramp-btn').click();await resetScroll(page);
    await page.waitForFunction(s=>__rs3d.T[s].ramp>.99,size);await settle(page);
    await fit(page,`${width}-${size}-open`);
    await page.screenshot({path:path.join(out,`${width}-${size}-open.png`)});
    await page.locator('.rs-ramp-btn').click();
    await page.waitForFunction(s=>__rs3d.T[s].ramp<.001,size);await settle(page);
    await fit(page,`${width}-${size}-reclosed`);
   }
   if(width<600){
    assert((await page.locator('.rs-3d').boundingBox()).height>=280,'phone stage too small');
    await page.locator('main').evaluate(e=>{e.scrollTop=e.scrollHeight;});
    assert(await page.locator('main').evaluate(e=>e.scrollTop>0),'phone form cannot scroll');
   }
   await page.getByRole('button',{name:/Review reservation/}).click();
   await page.waitForFunction(()=>document.querySelector('.rv').dataset.orderStep==='review');
   assert.match(await page.locator('[data-order]').innerText(),/16 ft/);
   await page.screenshot({path:path.join(out,`${width}-review.png`)});
   await page.getByRole('button',{name:'Edit trailer'}).click();
   await resetScroll(page);await fit(page,`${width}-return-from-review`);
   await page.close();console.log(`Passed ${width}x${height}: both models, ramp, review and return.`);
  }
  // A delayed or failed renderer must leave a real product image and usable form.
  const fallback=await browser.newPage({viewport:{width:390,height:844}});
  let release;const held=new Promise(resolve=>{release=resolve;});
  await fallback.route('**/reserve-3d-jetblack.js*',async route=>{await held;await route.abort();});
  await fallback.goto(base+'/reserve.html',{waitUntil:'domcontentloaded'});
  await fallback.waitForFunction(()=>document.querySelector('.rv-preview img').complete&&document.querySelector('.rv-preview img').naturalWidth>0);
  assert(await fallback.locator('.rv-preview').isVisible(),'product image hidden while loading');
  await fallback.screenshot({path:path.join(out,'phone-loading.png')});release();
  await fallback.waitForFunction(()=>document.querySelector('.rv').dataset.viewer==='image');
  await fallback.locator('label:has([name=size][value="16"])').click();
  await fallback.getByRole('button',{name:/Review reservation/}).click();
  assert.match(await fallback.locator('[data-order]').innerText(),/16 ft/);
  report.checks.push({label:'loading-and-WebGL-fallback',passed:true});await fallback.close();
  // Exercise normal motion independently from the stable layout screenshots.
  const motion=await browser.newPage({viewport:{width:390,height:844}});
  await motion.goto(base+'/reserve.html?size=20&debug3d=1',{waitUntil:'domcontentloaded'});
  await motion.waitForFunction(()=>window.__rs3d&&document.querySelector('.rv').dataset.viewer==='interactive',null,{timeout:30000});
  await motion.locator('.rs-ramp-btn').click();
  await motion.waitForFunction(()=>__rs3d.T['20'].ramp>.999,null,{timeout:60000});
  await fit(motion,'phone-animated-ramp');await motion.close();
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.badResponses,[]);report.passed=true;
 }catch(error){report.failure=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(out,'rendering-results.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
