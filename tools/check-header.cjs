// Uses the same BASE_URL, PLAYWRIGHT_MODULE, browser and QA_OUTPUT variables
// as check-mobile-presentation.cjs. Checks scene changes and internal scrolling.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4236';
const out=process.env.QA_OUTPUT||'/tmp/marvel-header-qa';fs.mkdirSync(out,{recursive:true});
const options={headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
const browsers=[['chrome',pw.chromium,{...options,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome'}],['webkit',pw.webkit,{headless:true}]];
if(process.env.EDGE_PATH)browsers.push(['edge',pw.chromium,{...options,executablePath:process.env.EDGE_PATH}]);
const sizes=process.env.QA_SIZES?JSON.parse(process.env.QA_SIZES):[[360,740],[390,844],[768,1024],[1440,900],[1920,1080],[844,390]];
const results=[];
async function inspect(p,width,previous){
 const state=await p.evaluate(()=>{const h=document.querySelector('.masthead'),r=h.getBoundingClientRect(),c=getComputedStyle(h),logo=h.querySelector('.brand').getBoundingClientRect();return{rect:r.toJSON(),logo:logo.toJSON(),background:c.backgroundColor,opacity:c.opacity,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}});
 assert(Math.abs(state.rect.top)<.1,'top gap exposes moving text');assert(Math.abs(state.rect.left)<.1,'left gutter exposes moving text');assert(Math.abs(state.rect.width-state.viewport)<2,'header does not cover viewport');
 assert(!state.background.startsWith('rgba(')&&state.background!=='transparent','header is translucent');assert.equal(state.opacity,'1');assert(!state.overflow,'horizontal overflow');
 assert(state.logo.top>=0&&state.logo.bottom<=state.rect.bottom,'logo outside header');
 if(!previous){
  // A bright layer behind the navigation must change zero header pixels.
  const clip={x:0,y:0,width:Math.min(width,state.viewport),height:Math.floor(state.rect.bottom)};
  const before=await p.screenshot({clip});
  await p.evaluate(height=>{const e=document.createElement('div');e.id='qa-header-underlay';Object.assign(e.style,{position:'fixed',zIndex:19,top:0,left:0,width:'100vw',height:height+'px',background:'#ff00ff',pointerEvents:'none'});document.body.append(e)},state.rect.bottom);
  const after=await p.screenshot({clip});await p.locator('#qa-header-underlay').evaluate(e=>e.remove());
  if(!before.equals(after)){fs.writeFileSync(path.join(out,'header-before-'+width+'.png'),before);fs.writeFileSync(path.join(out,'header-after-'+width+'.png'),after);}assert(before.equals(after),'content remains visible through header pixels');
 }
 if(previous)for(const key of ['x','y','width','height'])assert(Math.abs(state.logo[key]-previous.logo[key])<1,`logo shifts between scenes: ${key}`);
 return state;
}
(async()=>{for(const [name,type,opts]of browsers){if(process.env.QA_BROWSER&&process.env.QA_BROWSER!==name)continue;const b=await type.launch(opts);try{for(const [width,height]of sizes){const ctx=await b.newContext({viewport:{width,height},isMobile:width<800,hasTouch:width<800});const p=await ctx.newPage();p.setDefaultTimeout(10000);const row={browser:name,width,height};const errors=[];p.on('pageerror',e=>errors.push(e.message));try{
 await p.goto(base+'/?qa=opaque-header#sizes',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.body.dataset.activeScene==='sizes');await p.evaluate(()=>document.fonts.ready);
 let previous;
 for(const id of ['sizes','story','inside','app','top']){
  await p.evaluate(id=>location.hash=id,id);await p.waitForFunction(id=>document.body.dataset.activeScene===id,id);await p.waitForTimeout(250);previous=await inspect(p,width,previous);
  await p.locator('#'+id).evaluate(e=>e.scrollTop=240);await p.waitForTimeout(100);await inspect(p,width,previous);
  if(width===390&&['sizes','app'].includes(id))await p.screenshot({path:path.join(out,`${name}-${id}-${width}.png`)});
  await p.locator('#'+id).evaluate(e=>e.scrollTop=0);
 }
 // Check the fixed header while both adjacent scenes are visibly moving.
 await p.evaluate(()=>{document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#story'}}));const slot=document.querySelector('#story').previousElementSibling;scrollTo(0,slot.offsetTop)});await p.waitForTimeout(150);await inspect(p,width,previous);
 if(width===390||width===1440)await p.screenshot({path:path.join(out,`${name}-transition-${width}.png`)});
 if(await p.locator('.menu-button').isVisible()){
  await p.locator('.menu-button').click();assert(await p.locator('#mobile-menu').isVisible());
  const menu=await p.locator('#mobile-menu').boundingBox();assert(menu.y>=previous.rect.bottom-1,'menu overlaps header');await p.locator('#mobile-menu a[href="#sizes"]').click();await p.waitForFunction(()=>document.body.dataset.activeScene==='sizes');assert(!(await p.locator('#mobile-menu').isVisible()));
 }else{await p.locator('.desktop-nav a[href="#sizes"]').click();await p.waitForFunction(()=>document.body.dataset.activeScene==='sizes');}
 assert.deepEqual(errors,[]);row.passed=true;row.header=previous.rect;
 }catch(e){row.error=e.message;await p.screenshot({path:path.join(out,`${name}-${width}-failure.png`)}).catch(()=>{});}finally{results.push(row);console.log(JSON.stringify(row));await ctx.close();}}}finally{await b.close();}}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));if(results.some(r=>r.error))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
