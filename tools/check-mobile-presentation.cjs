// BASE_URL=http://127.0.0.1:4236 PLAYWRIGHT_MODULE=/path/to/playwright
// CHROME_PATH=/usr/bin/google-chrome EDGE_PATH=/path/to/msedge
// PLAYWRIGHT_BROWSERS_PATH=/path/to/cache QA_OUTPUT=/path/to/results node tools/check-mobile-presentation.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=(process.env.BASE_URL||'http://127.0.0.1:4236').replace(/\/$/,'');
const out=process.env.QA_OUTPUT||'/tmp/marvel-mobile-qa';fs.mkdirSync(out,{recursive:true});
const chromiumOptions={headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
const browsers=[['chrome',pw.chromium,{...chromiumOptions,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome'}],['webkit',pw.webkit,{headless:true}]];
if(process.env.EDGE_PATH)browsers.push(['edge',pw.chromium,{...chromiumOptions,executablePath:process.env.EDGE_PATH}]);
const results=[];
async function check(name,type,options){let browser;try{
 browser=await type.launch(options);
 for(const [width,height] of (process.env.QA_SIZES?JSON.parse(process.env.QA_SIZES):[[360,740],[390,844],[768,1024],[1440,900],[844,390]])){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:width<800,hasTouch:width<800});const p=await ctx.newPage();p.setDefaultTimeout(12000);const errors=[],bad=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url())});
  const row={browser:name,width,height};
  try{
   await p.goto(base+'/?qa=portrait#inside',{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>document.querySelector('#inside .recorded-scene')?.style.width);
   row.h264=await p.evaluate(()=>document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"'));
   for(const chapter of ['operator','dropoff','equipment','vision','rtk','quote','work']){
    const button=p.locator(`[data-display-target="${chapter}"]`);
    if(await button.count())await button.click();
    await p.waitForTimeout(900);
    const geometry=await p.evaluate(()=>{const box=e=>e.getBoundingClientRect().toJSON(),v=document.querySelector('#inside video');return {film:box(v),copy:box(document.querySelector('#inside .tour-copy')),controls:box(document.querySelector('#inside .tour-chapters')),fit:document.querySelector('.official-tour').dataset.filmFit,overflow:document.documentElement.scrollWidth>innerWidth+1,frame:v.parentElement.dataset.filmFrame,still:document.querySelector('#inside .recorded-still')?.naturalWidth}});
    assert(!geometry.overflow,'horizontal overflow');
    if(width<height){assert.equal(geometry.fit,'contain');assert(geometry.film.left>=-1&&geometry.film.right<=width+1,'cropped film');assert(geometry.film.top>=geometry.copy.bottom-1,'film behind caption');assert(geometry.film.bottom<=geometry.controls.top+1,'film behind chapter controls');}
    if(width===390&&['operator','vision','quote'].includes(chapter))await p.screenshot({path:path.join(out,`${name}-${width}-${chapter}.png`)});
   }
   await p.goto(base+'/?qa=portrait#app',{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>{const a=document.querySelector('#app');return a?.dataset.appLoaded==='true'&&a.dataset.phoneState==='ready'},{},{timeout:20000});
   assert(!/Unmatched Route|Page could not be found/.test(await p.frameLocator('.crew-phone iframe').locator('body').innerText()),'app route missing');
   const app=await p.evaluate(()=>{const a=document.querySelector('#app'),s=document.querySelector('.crew-phone-screen');return{screen:s.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth+1,scrollable:a.scrollHeight>a.clientHeight+1}});
   assert(!app.overflow,'app overflow');
   if(width<=450&&height>width){assert(app.screen>=width*.68,'unreadable handset');assert(app.scrollable,'phone needs reachable scroll area');await p.mouse.move(width-12,Math.round(height*.55));if(name==='webkit')await p.locator('#app').evaluate(e=>e.scrollBy(0,340));else await p.mouse.wheel(0,340);await p.waitForTimeout(500);assert(await p.locator('#app').evaluate(e=>e.scrollTop>100),'app cannot scroll down');assert.equal(await p.locator('body').getAttribute('data-active-scene'),'app');await p.screenshot({path:path.join(out,`${name}-${width}-app.png`)});if(name==='webkit')await p.locator('#app').evaluate(e=>e.scrollBy(0,-340));else await p.mouse.wheel(0,-340);await p.waitForTimeout(500);assert(await p.locator('#app').evaluate(e=>e.scrollTop<15),'app cannot scroll up');}
   assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);row.passed=true;row.app=app;
  }catch(e){row.error=e.message;await p.screenshot({path:path.join(out,`${name}-${width}-failure.png`)}).catch(()=>{});}finally{results.push(row);await ctx.close();}
  console.log(JSON.stringify(row));
 }
}catch(e){results.push({browser:name,error:e.message});}finally{await browser?.close();}}
(async()=>{for(const [n,t,o]of browsers)if(!process.env.QA_BROWSER||n===process.env.QA_BROWSER)await check(n,t,o);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));if(results.some(x=>x.error))process.exitCode=1;})().catch(e=>{console.error(e);process.exit(1)});
