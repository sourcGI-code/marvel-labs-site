const playwright=await import(process.env.PLAYWRIGHT_MODULE || '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs');
const engine=process.env.BROWSER || 'chromium';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768';
const out=process.env.OUTPUT_DIR || '/home/jaxon/website-review-20261109/updated-trailer';
await fs.mkdir(out,{recursive:true});
const browser=await playwright[engine].launch(engine==='webkit'?{headless:true}:{executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});
const report={checks:[],errors:[],missing:[]};
async function measure(page,label){
 await page.waitForTimeout(150);
 const state=await page.evaluate(()=>{
  const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const header=box(document.querySelector('.masthead')),form=box(document.querySelector('.rv-rail'));
  const outside=[...document.querySelectorAll('.rv-rail button,.rv-rail a,.rv-rail label,.rv-rail h1,.rv-rail [data-panel]:not([hidden]) p,.rv-rail [data-order] div')].filter(e=>e.checkVisibility()).map(e=>({text:e.textContent.trim().slice(0,55),...box(e)})).filter(r=>r.y<header.bottom-.5||r.bottom>innerHeight+.5||r.x<-.5||r.right>innerWidth+.5);
  const section=document.querySelector('.rv');
  const viewerOutside=[...section.querySelectorAll('.rs-3d-bar,.rs-back,.rv-metrics')].filter(e=>e.checkVisibility()).map(box).filter(r=>r.y<header.bottom-.5||r.bottom>innerHeight+.5||r.x<-.5||r.right>innerWidth+.5);
  const scale=Number(getComputedStyle(document.querySelector('.rv-rail')).zoom);
  const copy=section.dataset.orderStep==='review'?section.querySelector('.rd-consent'):section.querySelector('[data-panel=configure] .rv-due small');
  const logo=document.querySelector('.site-brand-logo');
  return {header,form,outside,viewerOutside,stacked:section.dataset.reservationStacked==='true',viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],scale,step:section.dataset.orderStep,copySize:parseFloat(getComputedStyle(copy).fontSize)*scale,submitHeight:section.querySelector('.rv-submit').getBoundingClientRect().height,stageHeight:section.querySelector('.rv-show').getBoundingClientRect().height,logo:logo?{...box(logo),loaded:logo.complete&&logo.naturalWidth===1247}:null};
 });
 assert.deepEqual(state.outside,[],label+' content outside viewport');
 assert.deepEqual(state.viewerOutside,[],label+' viewer controls outside viewport');
 assert.ok(state.form.y>=state.header.bottom-.5,label+' form crosses header');
 assert.ok(state.form.bottom<=state.viewport[1]+.5,label+' form below viewport');
 assert.ok(state.scroll[0]<=state.viewport[0]&&state.scroll[1]<=state.viewport[1],label+' scrolling document');
 const filled=state.form.height/(state.viewport[1]-state.header.bottom);
 if(state.stacked&&state.viewport[0]<600){
  assert.ok(state.copySize>=9.5,label+' phone body text is too small');
  assert.ok(state.submitHeight>=38,label+' phone submit control is too small');
  if(state.step==='configure')assert.ok(state.stageHeight>=100,label+' phone trailer stage is too short');
 }else assert.ok(filled>=(state.stacked?(state.step==='review'?.84:.63):.9),label+' form is too small for the screen');
 assert.ok(state.logo?.loaded&&state.logo.y>=state.header.y&&state.logo.bottom<=state.header.bottom,label+' original logo must fit inside the header');
 if(!state.stacked&&state.viewport[1]>580)assert.ok(state.form.width/state.viewport[0]>=.25&&state.form.width/state.viewport[0]<=.37,label+' panel is not proportional to the screen');
 await page.mouse.move(8,80);await page.mouse.wheel(0,800);
 assert.equal(await page.evaluate(()=>scrollY),0,label+' wheel scrolled the page');
 assert.equal(await page.locator('.rv-rail').evaluate(e=>e.scrollHeight>e.clientHeight+1),false,label+' internally scrolling form');
 report.checks.push({label,...state});console.log(label,'scale',state.scale);
}
try{
 for(const [width,height] of [[1440,900],[1920,1080],[2560,1440],[3840,2160],[3440,1440],[1280,720],[1024,768],[390,844],[375,667],[320,568],[844,390],[768,1024],[1024,1366]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<=860});page.setDefaultTimeout(15000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
  await page.goto(base+'/reserve.html?size=20',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('.rv-submit').disabled);
  await page.waitForFunction(()=>document.querySelector('.rv').dataset.viewer==='interactive',{timeout:45000});
  await page.waitForTimeout(1200);
  await measure(page,`${width}x${height}-configure`);
  await page.screenshot({path:`${out}/reserve-fit-${width}x${height}.png`});
  await page.locator('label:has([name=size][value="16"])').click();
  await page.locator('label:has([name=plan][value=free])').click();
  await page.getByRole('button',{name:'Review reservation'}).click();
  await measure(page,`${width}x${height}-review`);
  assert.match(await page.locator('[data-order]').textContent(),/16 ft/);
  assert.match(await page.locator('[data-order]').textContent(),/Lease/);
  assert.equal(await page.locator('[name=consent]').isChecked(),false);
  await page.screenshot({path:`${out}/reserve-review-${width}x${height}.png`});
  await page.locator('[name=consent]').check();
  assert.equal(await page.locator('[name=consent]').isChecked(),true);
  await page.getByRole('button',{name:'Edit trailer'}).click();
  assert.equal(await page.locator('[name=size][value="16"]').isChecked(),true);
  if(width<=860){
   await page.getByRole('button',{name:'Menu',exact:false}).click();
   const menu=await page.locator('#mobile-menu').boundingBox();
   assert.ok(menu.y>=(await page.locator('.masthead').boundingBox()).height-.5);
   await page.keyboard.press('Escape');
  }
  await page.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.passed=true;
}catch(e){report.failure=e.stack;throw e;}
finally{await fs.writeFile(out+'/reserve-fit-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,missing:report.missing,failure:report.failure}));await browser.close();}
