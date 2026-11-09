import {chromium} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768',out=process.env.REVIEW_OUTPUT||'/home/jaxon/website-review-20261109/scene-recovery';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});
const report={checks:[],errors:[],missing:[],oldAssets:[]};
try{
 for(const theme of ['mono'])for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()===404)report.missing.push(r.url());});
  page.on('request',r=>{if(/assets\/(owner-package|marvel-v[0-9]|owner-approved|workday-stream|workday-mobile)/.test(r.url()))report.oldAssets.push(r.url());});
  await page.goto(`${base}/?theme=${theme}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__platform,{timeout:90000});
  await page.waitForFunction(()=>window.__platform.state().film.ready,{timeout:60000});
  await page.evaluate(()=>window.__platform.seek(.249));await page.waitForTimeout(1500);await page.addStyleTag({content:'#local-page-editor-link{display:none!important}'});await page.screenshot({path:`${out}/home-opening-${theme}-${mobile?'mobile':'desktop'}.png`});
  const opening=await page.locator('video.opening-film').evaluate(v=>({src:v.currentSrc,width:v.videoWidth,height:v.videoHeight}));
  assert(opening.src.includes('/scene-recovery-v2/'));
  assert.deepEqual([opening.width,opening.height],mobile?[1080,2160]:[3840,1706]);
  await page.evaluate(()=>window.__platform.seek(.885));await page.waitForFunction(()=>window.__platform.state().ready,{timeout:60000});await page.waitForTimeout(1500);
  await page.screenshot({path:`${out}/home-fleet-${theme}-${mobile?'mobile':'desktop'}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const videos=await page.locator('video').evaluateAll(v=>v.map(x=>({src:x.currentSrc||x.src,duration:x.duration,ready:x.readyState,width:x.videoWidth,height:x.videoHeight})));
  for(const v of videos.filter(v=>v.src.includes('/opening/')||v.src.includes('/cargo/'))){
   assert(v.src.includes('/scene-recovery-v2/'));
   const size=mobile?[1080,2160]:v.src.includes('/opening/')?[3840,1706]:[4608,2048];
   assert.deepEqual([v.width,v.height],size,'The browser must decode the native-resolution film.');
  }
  report.checks.push({theme,mobile,opening,videos});
  await page.close();
 }
 for(const mode of ['snapshot','reduced','save-data']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()===404)report.missing.push(r.url());});
  if(mode==='save-data')await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true}}));
  await page.goto(`${base}/?theme=mono${mode==='snapshot'?'&snapshot=1':''}`,{waitUntil:'networkidle'});
  await page.screenshot({path:`${out}/home-${mode}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const src=await page.locator('.snapshot-hero img').getAttribute('src');assert(src.includes('/scene-recovery-v2/'));report.checks.push({mode,src});await page.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);assert.deepEqual(report.oldAssets,[]);report.passed=true;
}finally{fs.writeFileSync(`${out}/home-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,missing:report.missing,oldAssets:report.oldAssets}));await browser.close();}
