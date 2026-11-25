import {chromium} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768',out=process.env.REVIEW_OUTPUT||'/home/jaxon/website-review-20261109/scene-recovery';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});const report={checks:[],errors:[],missing:[]};
try{
 for(const theme of ['mono'])for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()===404)report.missing.push(r.url());});
  // Verify the full-resolution release independently of the test machine's
  // estimated connection speed. Slow connections deliberately receive lite video.
  await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{effectiveType:'4g',downlink:10,saveData:false}}));
  await page.goto(`${base}/?theme=${theme}#inside`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__officialJourneyState,{timeout:90000});
  await page.addStyleTag({content:'#local-page-editor-link{display:none!important}'});
  for(const [name,p] of [['grass',.058],['pickup',.241],['carry',.35],['phone',.4],['ramp',.608],['mower-exit',.63],['mower-road',.66],['yard',.84],['mowing',.97]]){
   await page.evaluate(p=>{document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#inside'}}));const slot=document.querySelector('#inside').previousElementSibling;scrollTo({top:slot.offsetTop+innerHeight*.75+p*(slot.offsetHeight-innerHeight*1.5),behavior:'instant'});},p);
   await page.waitForFunction(p=>Math.abs((window.__officialJourneyState?.targetProgress??-1)-p)<.002,p,{timeout:20000});
   await page.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>v.currentSrc.includes('/field/')&&v.readyState>=2&&!v.seeking),{timeout:45000});await page.waitForTimeout(1000);
   await page.screenshot({path:`${out}/workday-${theme}-${mobile?'mobile':'desktop'}-${name}.png`});
  }
  const media=await page.locator('video').evaluateAll(vs=>vs.filter(v=>v.currentSrc.includes('/field/')).map(v=>({src:v.currentSrc,duration:v.duration,width:v.videoWidth,height:v.videoHeight,film:(v.dataset.filmDuration||'').slice(0,8)})));assert.equal(media.length,1);
  // The film is 3088 frames; the file carries the same frames once more in reverse order for scrolling back.
  assert(Math.abs(media[0].duration-2*3088/30)<.05,String(media[0].duration));assert.equal(media[0].film,String(3088/30).slice(0,8));assert(media[0].src.includes('/scene-recovery-v2/'));
  // A headless browser reports a slow line and is given the 960 px film; a normal line gets 1920 (1280 on phones).
  assert([960,mobile?1280:1920].includes(media[0].width),String(media[0].width));assert.equal(media[0].width/media[0].height,16/9);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);report.checks.push({theme,mobile,media});await page.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.passed=true;
}finally{fs.writeFileSync(`${out}/workday-check-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
