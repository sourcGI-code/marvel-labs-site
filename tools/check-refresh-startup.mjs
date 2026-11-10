import {chromium,webkit} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768';
const out=process.env.REVIEW_OUTPUT||'/home/jaxon/website-review-20261110/refresh';
await fs.mkdir(out,{recursive:true});
const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(engine==='chromium'?{executablePath:'/opt/google/chrome/chrome',args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']}: {})});
 try{
  for(const [width,height] of [[1440,900],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(/\/atlas-hqworld4\.js\?/,async route=>{await new Promise(resolve=>setTimeout(resolve,1000));await route.continue();});
   await page.addInitScript(()=>{
    window.__startupFrames=[];
    const visible=el=>{
     const r=el.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight||r.width<=0||r.height<=0)return false;
     for(let node=el;node&&node.nodeType===1;node=node.parentElement){const s=getComputedStyle(node);if(s.visibility==='hidden'||s.display==='none'||Number(s.opacity)===0)return false;}return true;
    };
    function sample(){
     if(document.body){const ids=[...document.querySelectorAll('main>section,body>.site-footer')].filter(visible).map(el=>el.id||'footer');window.__startupFrames.push({loading:document.documentElement.hasAttribute('data-site-loading'),active:document.body.dataset.activeScene,ids});}
     if(window.__startupFrames.length<400)requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
   });
   const ready=()=>page.waitForFunction(()=>document.documentElement.classList.contains('immersive')&&!document.documentElement.hasAttribute('data-site-loading'));
   const verify=async(expected,label)=>{
    await ready();await page.waitForTimeout(200);
    const frames=await page.evaluate(()=>window.__startupFrames);
    assert(frames.some(f=>f.loading),'did not observe delayed startup');
    assert(frames.filter(f=>f.loading).every(f=>f.ids.length===0),'stacked sections painted while loading');
    const painted=frames.filter(f=>f.ids.length);
    assert(painted.length&&painted.every(f=>f.ids.length===1&&f.ids[0]===expected),JSON.stringify({engine,width,label,painted}));
    assert.equal(await page.evaluate(()=>document.body.dataset.activeScene),expected);
    results.push({engine,width,height,label,frames:frames.length,firstVisible:painted[0].ids,passed:true});
   };
   await page.goto(base+'/#app',{waitUntil:'domcontentloaded'});await verify('app','deep link');
   await page.evaluate(()=>{
    document.querySelector('a[href="#story"]').click();
    const slot=document.querySelector('#story').previousElementSibling;
    scrollTo({top:slot.offsetTop+innerHeight*.75+.31*(slot.offsetHeight-innerHeight*1.5),behavior:'instant'});
   });
   await page.waitForFunction(()=>document.body.dataset.activeScene==='story');await page.waitForTimeout(100);
   await page.reload({waitUntil:'domcontentloaded'});await verify('story','reload');
   const progress=await page.locator('#story').getAttribute('data-scene-progress');assert(Math.abs(Number(progress)-.31)<.01,progress);
   await page.screenshot({path:`${out}/${engine}-${width}-reload.png`});
   await page.evaluate(()=>history.replaceState(null,'',location.pathname+location.search));
   await page.reload({waitUntil:'domcontentloaded'});await verify('story','reload without hash');
   assert(Math.abs(Number(await page.locator('#story').getAttribute('data-scene-progress'))-.31)<.01);
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});await verify('top','fresh home');
   assert.deepEqual(errors,[]);await page.close();
  }
  for(const mode of ['entry-failed','stage-failed','no-js','snapshot']){
   const page=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:mode!=='no-js'});
   if(mode==='entry-failed')await page.route(/\/website-entry\.js\?/,r=>r.abort());
   if(mode==='stage-failed')await page.route(/\/atlas-hqworld4\.js\?/,r=>r.abort());
   await page.goto(base+'/?'+(mode==='snapshot'?'snapshot=1':''),{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-site-loading'));
   assert.equal(await page.locator('main').evaluate(el=>getComputedStyle(el).opacity),'1');
   assert.equal(await page.locator('#hero-title').isVisible(),true);
   results.push({engine,label:mode,passed:true});await page.close();
  }
 }finally{await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify(results,null,2));}
}
console.log(JSON.stringify({passed:true,checks:results.length,results}));
