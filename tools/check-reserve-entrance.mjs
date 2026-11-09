import {chromium} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768';
const out=process.env.OUTPUT_DIR||'/home/jaxon/website-review-20261109/reservation-entrance';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});
const result={};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route(/\.glb(?:\?|$)/,async route=>{await gate;await route.continue();});
 await page.goto(base+'/reserve.html?debug3d=1',{waitUntil:'domcontentloaded'});
 await page.locator('.rv-loading').waitFor({state:'visible'});
 assert.equal(await page.locator('.rv-preview').isVisible(),false,'a photo flashes while the models load');
 assert.equal(await page.getByRole('button',{name:'Review reservation'}).isEnabled(),true);
 await page.screenshot({path:out+'/loading.png'});
 release();
 await page.waitForFunction(()=>window.__rs3d?.state().entering&&document.querySelector('.rv').dataset.viewer==='interactive');
 const snap=()=>page.evaluate(()=>({camera:__rs3d.camera.position.toArray(),state:__rs3d.state(),visible:Object.entries(__rs3d.T).filter(([,t])=>t.group.visible).map(([size])=>size)}));
 const arrival=await snap();
 await page.screenshot({path:out+'/arriving.png'});
 await page.waitForFunction(()=>!window.__rs3d.state().entering);
 const settled=await snap();
 const movement=Math.hypot(...arrival.camera.map((n,i)=>n-settled.camera[i]));
 assert(movement>1,'the live camera did not glide toward the trailers');
 assert.deepEqual(settled.visible.sort(),['16','20']);
 assert.equal(await page.locator('.rv-preview').isVisible(),false);
 await page.screenshot({path:out+'/both-trailers.png'});
 result.entrance={movement,arrival,settled};
 // Resize one live page across layouts, not just separate fixed-size loads.
 result.resizes=[];
 for(const [width,height] of [[390,844],[844,390],[2560,1440],[1024,1366]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(400);
  const fit=await page.evaluate(()=>{const f=document.querySelector('.rv-rail').getBoundingClientRect(),h=document.querySelector('.masthead').getBoundingClientRect();return {top:f.top,bottom:f.bottom,width:f.width,header:h.bottom,overflow:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth,visible:Object.values(__rs3d.T).filter(t=>t.group.visible).length};});
  assert(fit.top>=fit.header-.5&&fit.bottom<=height+.5);assert.equal(fit.overflow,false);assert.equal(fit.visible,2);
  result.resizes.push({width,height,...fit});
 }
 await page.close();
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await reduced.goto(base+'/reserve.html?debug3d=1');await reduced.waitForFunction(()=>window.__rs3d);
 assert.equal(await reduced.evaluate(()=>__rs3d.state().entering||__rs3d.state().touring),false);await reduced.close();result.reducedMotion=true;
 const failed=await browser.newPage({viewport:{width:390,height:844}});
 await failed.route(/\.glb(?:\?|$)/,route=>route.abort('failed'));
 await failed.goto(base+'/reserve.html');await failed.waitForFunction(()=>document.querySelector('.rv').dataset.viewer==='image');
 assert.equal(await failed.locator('.rv-preview').isVisible(),true);
 assert.equal(await failed.locator('.rv-loading').isVisible(),false);
 assert.equal(await failed.getByRole('button',{name:'Review reservation'}).isEnabled(),true);
 await failed.close();result.failureFallback=true;
 const noJS=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});
 await noJS.goto(base+'/reserve.html');assert.equal(await noJS.locator('.rv-preview').isVisible(),true);await noJS.close();result.noJavaScriptFallback=true;
 result.passed=true;
}finally{await fs.writeFile(out+'/report.json',JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result));}
