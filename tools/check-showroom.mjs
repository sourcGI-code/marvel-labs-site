import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs');
const base=process.env.PREVIEW_URL || 'http://127.0.0.1:8768';
const out='/home/jaxon/website-review-20261109/updated-trailer';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});
const report={checks:[],errors:[],failedRequests:[]};
const sizes=[{width:1440,height:900},{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:768,height:1024}];
async function checkLayout(page,label){
  console.log('Layout:',label);
  const state=await page.evaluate(()=>{
    const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
    const header=rect(document.querySelector('.showroom-header'));
    const main=rect(document.querySelector('main'));
    const outside=[...document.querySelectorAll('main button,main a,main h1,main [role=tabpanel],main .model-specs dd')].filter(el=>el.checkVisibility()).map(el=>({text:el.textContent.trim().slice(0,60),...rect(el)})).filter(r=>r.y<header.bottom-.5||r.x<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5);
    return {viewport:[innerWidth,innerHeight],header,main,outside,scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight,scrollX,scrollY],viewer:document.querySelector('.trailer-showroom').dataset.viewer};
  });
  assert.deepEqual(state.outside,[],`${label}: content escaped its viewport/header`);
  assert.ok(state.main.y>=state.header.bottom-.5,`${label}: main overlaps header`);
  assert.ok(state.scroll[0]<=state.viewport[0]&&state.scroll[1]<=state.viewport[1],`${label}: document overflows`);
  await page.evaluate(()=>scrollTo(0,900));
  assert.equal(await page.evaluate(()=>scrollY),0,`${label}: page scrolled`);
  report.checks.push({label,...state});
}
try{
  for(const viewport of sizes){
    const page=await browser.newPage({viewport,deviceScaleFactor:1,hasTouch:viewport.width<=860});
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    console.log('Opening viewport',viewport);
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)report.failedRequests.push({url:r.url(),status:r.status()});});
    await page.goto(`${base}/trailer-16.html?debug3d=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.trailer-showroom').dataset.viewer!=='loading',{timeout:45000});
    assert.equal(await page.locator('.trailer-showroom').getAttribute('data-viewer'),'interactive',`3D failed at ${viewport.width}`);
    await page.waitForTimeout(1800);
    await checkLayout(page,`${viewport.width}x${viewport.height}-16`);
    console.log('Screenshot');await page.screenshot({timeout:15000,path:`${out}/viewer-${viewport.width}x${viewport.height}-16.png`});
    console.log('Switch to 20');await page.locator('.rs-switch button[data-size="20"]').click();
    assert.equal(await page.locator('h1 [data-model-size]').textContent(),'20');
    assert.match(await page.locator('.showroom-reserve').getAttribute('href'),/size=20/);
    console.log('Plans');await page.getByRole('tab',{name:'Plans',exact:true}).click();
    assert.match(await page.locator('#info-plans').textContent(),/49,999/);
    await checkLayout(page,`${viewport.width}x${viewport.height}-plans`);
    await page.getByRole('tab',{name:'Details',exact:true}).click();
    await checkLayout(page,`${viewport.width}x${viewport.height}-details`);
    await page.getByRole('tab',{name:'Layout',exact:true}).click();
    console.log('Ramp');await page.locator('.rs-ramp-btn').click();
    assert.equal(await page.locator('.rs-ramp-btn').textContent(),'Close the ramp');
    await page.waitForTimeout(1800);
    console.log('Screenshot');await page.screenshot({timeout:15000,path:`${out}/viewer-${viewport.width}x${viewport.height}-20-ramp.png`});
    await page.locator('.rs-back').click();
    assert.equal(await page.locator('.trailer-showroom').getAttribute('data-mode'),'overview');
    await checkLayout(page,`${viewport.width}x${viewport.height}-both`);
    if(viewport.width<=860){
      await page.getByRole('button',{name:'Menu',exact:true}).click();
      const menu=await page.locator('#showroom-menu').boundingBox(),header=await page.locator('.showroom-header').boundingBox();
      assert.ok(menu.y>=header.y+header.height-.5,`mobile menu crosses header: ${JSON.stringify({menu,header})}`);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#showroom-menu').isVisible(),false);
    }
    console.log('Switch to 20');await page.locator('.rs-switch button[data-size="20"]').click();
    await page.locator('.showroom-reserve').click();
    await page.waitForURL(/reserve\.html\?size=20/);
    assert.equal(await page.locator('[name="size"][value="20"]').isChecked(),true);
    await page.close();
  }
  const fallback=await browser.newPage({viewport:{width:390,height:844}});
  await fallback.route('**/reserve-3d-jetblack.js*',route=>route.abort());
  await fallback.goto(`${base}/trailer-16.html`,{waitUntil:'domcontentloaded'});
  await fallback.waitForFunction(()=>document.querySelector('.trailer-showroom').dataset.viewer==='image');
  await fallback.locator('.rs-switch button[data-size="20"]').click();
  assert.match(await fallback.locator('.showroom-poster img').getAttribute('src'),/jet-black-20/);
  assert.match(await fallback.locator('.showroom-reserve').getAttribute('href'),/size=20/);
  await checkLayout(fallback,'mobile-WebGL-fallback');
  await fallback.screenshot({path:`out/fallback.png`.replace('out/',out+'/')});
  await fallback.close();
  assert.deepEqual(report.errors,[]);
  assert.deepEqual(report.failedRequests,[]);
  report.passed=true;
}catch(error){report.failure=error.stack;throw error;}
finally{await fs.writeFile(`${out}/showroom-tests.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,failedRequests:report.failedRequests,failure:report.failure},null,2));await browser.close();}
