import {chromium,devices} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768';
const out=process.env.REVIEW_OUTPUT||'/home/jaxon/website-review-20261109/mobile-films';
await fs.mkdir(out,{recursive:true});
const result={errors:[],failed:[],checks:[]};
try{
 const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:390,height:844}});
 page.on('pageerror',e=>result.errors.push(e.message));page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')result.failed.push({url:r.url(),error:r.failure()?.errorText});});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.opening-film')?.currentTime>.15,{timeout:30000});
 const a=await page.locator('.opening-film').evaluate(v=>({time:v.currentTime,src:v.currentSrc}));await page.waitForTimeout(900);
 const b=await page.locator('.opening-film').evaluate(v=>v.currentTime);assert(b>a.time+.3);assert(a.src.includes('/mobile-web.mp4'));result.checks.push({scene:'opening',start:a.time,end:b,src:a.src});
 await page.evaluate(()=>window.__platform.seek(.5));
 await page.waitForFunction(()=>{const v=document.querySelector('#hero-visual .recorded-scene');return v?.readyState>=2&&!v.seeking;},null,{timeout:30000}).catch(async()=>{console.log(await page.evaluate(()=>[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,time:v.currentTime,ready:v.readyState,parent:v.parentElement.id}))));throw Error('cargo did not load');});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y:650}]});await page.waitForTimeout(120);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330,y:590}]});await page.waitForTimeout(120);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>document.body.dataset.animationPlayback==='playing');
 const ca=await page.locator('#hero-visual video.recorded-scene').evaluate(v=>v.currentTime);await page.waitForTimeout(900);const cb=await page.locator('#hero-visual video.recorded-scene').evaluate(v=>v.currentTime);assert(cb>ca+.3);result.checks.push({scene:'cargo',start:ca,end:cb});
 await page.getByRole('button',{name:'Menu'}).click();await page.locator('#mobile-menu a[href="#inside"]').click();
 await page.waitForFunction(()=>window.__officialJourneyState?.videoReady,null,{timeout:45000});
 await page.getByRole('button',{name:'Grass into the factory',exact:true}).click();await page.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y:540}]});await page.waitForTimeout(120);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330,y:480}]});await page.waitForTimeout(120);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>document.body.dataset.animationPlayback==='playing');
 const fa=await page.locator('#tour-visual video').evaluate(v=>v.currentTime);await page.waitForTimeout(900);const fb=await page.locator('#tour-visual video').evaluate(v=>v.currentTime);assert(fb>fa+.3);result.checks.push({scene:'workday',start:fa,end:fb});
 const fit=await page.evaluate(()=>({header:document.querySelector('.masthead').getBoundingClientRect().bottom,copy:document.querySelector('.tour-copy').getBoundingClientRect().top,status:document.querySelector('#field-status').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth}));assert(fit.copy>=fit.header&&fit.status>=fit.header&&!fit.overflow);result.mobileLayout=fit;
 await page.screenshot({path:out+'/mobile.png'});assert.deepEqual(result.errors,[]);assert.deepEqual(result.failed,[]);result.passed=true;
}finally{await fs.writeFile(out+'/report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
