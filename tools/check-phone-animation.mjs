import {chromium,webkit,devices} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768';
const out=process.env.REVIEW_OUTPUT||'/home/jaxon/website-review-20261109/phone-animation';
await fs.mkdir(out,{recursive:true});
const report=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true,...(name==='chromium'?{executablePath:'/opt/google/chrome/chrome',args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']}: {})});
 const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:390,height:844}});
 const row={engine:name,errors:[],routes:[]};report.push(row);
 page.on('pageerror',e=>row.errors.push(e.message));
 try{
  await page.goto(base+'/#app',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#app').dataset.phoneState==='ready'&&document.querySelector('#app').dataset.appLoaded==='true',{timeout:25000});
  await page.getByRole('button',{name:'Replay phone animation'}).click();
  const snap=()=>page.evaluate(()=>{const a=document.querySelector('#app'),p=a.querySelector('.crew-phone'),v=a.querySelector('video');return {state:a.dataset.phoneState,method:a.dataset.phonePlayback,time:v.currentTime,paused:v.paused,animations:p.getAnimations().length,transform:getComputedStyle(p).transform,header:document.querySelector('.masthead').getBoundingClientRect().bottom,phoneTop:p.getBoundingClientRect().top,inert:p.inert};});
  await page.waitForTimeout(350);row.early=await snap();await page.waitForTimeout(500);row.later=await snap();
  assert.equal(row.early.state,'entering');assert.equal(row.later.state,'entering');
  assert(row.later.time-row.early.time>.2||row.early.transform!==row.later.transform,'animation did not advance');
  await page.waitForFunction(()=>document.querySelector('#app').dataset.phoneState==='ready');
  assert.equal((await snap()).inert,false);
  for(const route of ['camera','quotes','trailers','assistant','trailer']){
   await page.locator(`[data-app-route="${route}"]`).click();
   await page.waitForFunction(route=>{const a=document.querySelector('#app');return a.dataset.appLoaded==='true'&&a.querySelector('iframe').contentWindow.location.pathname.includes('/'+route+'/');},route);
   row.routes.push(route);
  }
  await page.screenshot({path:`${out}/${name}.png`});assert.deepEqual(row.errors,[]);row.passed=true;
 }catch(e){row.failure=e.stack;console.log(JSON.stringify(row));}
 finally{await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));}
}
console.log(JSON.stringify(report));assert(report.every(r=>r.passed));
