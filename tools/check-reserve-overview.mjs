import {chromium} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768',out='/home/jaxon/website-review-20261109/reserve-both-trailers';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});const rows=[];
try{
 for(const [width,height] of [[1440,900],[390,844],[360,640],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}});await page.goto(base+'/reserve.html?debug3d=1');await page.waitForFunction(()=>document.querySelector('.rv').dataset.viewer==='interactive'&&window.__rs3d);
  const snap=()=>page.evaluate(()=>({state:__rs3d.state(),camera:__rs3d.camera.position.toArray(),visible:Object.entries(__rs3d.T).filter(([,t])=>t.group.visible).map(([s])=>s),calls:__rs3d.renderer.info.render.calls,overflow:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth}));
  await page.waitForTimeout(1000);const a=await snap();await page.waitForTimeout(1500);const b=await snap();
  const moved=Math.hypot(...a.camera.map((v,i)=>v-b.camera[i]));assert.equal(b.state.mode,'overview');assert.deepEqual(b.visible.sort(),['16','20']);assert(b.state.touring&&moved>.01&&b.calls>0);assert.equal(b.overflow,false);
  await page.screenshot({path:`${out}/${width}-${height}.png`});
  await page.locator('.rs-lock').click();await page.waitForTimeout(2500);const paused=await snap();await page.waitForTimeout(500);const still=await snap();assert(Math.hypot(...paused.camera.map((v,i)=>v-still.camera[i]))<.01);
  // Even the initially checked 20 ft option must enter the single-model view.
  await page.locator('label:has([name=size][value="20"])').click();assert.equal((await snap()).state.focus,'20');
  await page.locator('.rs-back').click();assert.equal((await snap()).state.mode,'overview');await page.waitForTimeout(100);
  await page.locator('label:has([name=size][value="16"])').click();assert.equal((await snap()).state.focus,'16');
  rows.push({width,height,moved,visible:b.visible,calls:b.calls});await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.goto(base+'/reserve.html?debug3d=1');await reduced.waitForFunction(()=>window.__rs3d);assert.equal(await reduced.evaluate(()=>__rs3d.state().touring),false);await reduced.close();
 fs.writeFileSync(out+'/report.json',JSON.stringify({passed:true,rows,reducedMotion:true},null,2));console.log(JSON.stringify({passed:true,rows,reducedMotion:true}));
}finally{await browser.close();}
