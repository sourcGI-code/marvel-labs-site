import {chromium} from '/home/jaxon/marvel_site/marvel-crew-app/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8768';
const out=process.env.REVIEW_OUTPUT||'/home/jaxon/website-review-20261109/fullscreen-workday';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--enable-gpu','--use-angle=gl','--disable-dev-shm-usage']});
const report={checks:[],errors:[],missing:[]};
try{
 for(const [width,height] of [[1440,900],[390,844],[360,640],[844,390],[768,1024]]){
  const page=await browser.newPage({viewport:{width,height}});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()===404)report.missing.push(r.url());});
  await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{effectiveType:'4g',downlink:10,saveData:false}}));
  await page.goto(base+'/#inside');await page.waitForFunction(()=>window.__officialJourneyState);
  await page.addStyleTag({content:'#local-page-editor-link{display:none!important}'});
  for(const [name,p] of [['grass',.058],['pickup',.241],['handoff',.32],['dropoff',.35],['phone',.4],['unload',.61],['measure',.76],['quote',.88],['mow',.97]]){
   await page.evaluate(p=>{document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#inside'}}));const slot=document.querySelector('#inside').previousElementSibling;scrollTo({top:slot.offsetTop+innerHeight*.75+p*(slot.offsetHeight-innerHeight*1.5),behavior:'instant'});},p);
   await page.waitForFunction(p=>{const s=window.__officialJourneyState,v=document.querySelector('#tour-visual video');return s?.videoReady&&Math.abs(s.targetProgress-p)<.002&&!v.seeking&&Math.abs(v.currentTime-s.videoTarget)<.15;},p,{timeout:45000});
   await page.waitForTimeout(400);
   const row=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    return {viewport:[innerWidth,innerHeight],film:rect('#tour-visual video'),header:rect('.masthead'),copy:rect('.tour-copy'),status:rect('#field-status'),title:document.querySelector('#tour-title').textContent,chapter:document.querySelector('.tour-chapters li[aria-current]')?.textContent.trim(),buttons:[...document.querySelectorAll('.tour-chapters button')].map(b=>b.getBoundingClientRect().toJSON()),labels:[...document.querySelectorAll('.vision-label:not([hidden]) strong')].map(l=>l.textContent),vision:document.querySelector('.official-tour').dataset.vision,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(row.film.left<=1&&row.film.top<=row.header.bottom+1&&row.film.right>=width-1&&row.film.bottom>=height-1,JSON.stringify({name,width,film:row.film}));
   assert(row.copy.top>=row.header.bottom&&row.status.top>=row.header.bottom,JSON.stringify({name,width,row}));
   assert.equal(row.buttons.length,7);assert(row.buttons.every(r=>r.width>0&&r.left>=0&&r.right<=width+1&&r.bottom<=height&&r.top>=row.header.bottom));
   assert(row.chapter&&row.title);assert.equal(row.overflow,false);
   if(name==='measure'){assert.equal(row.vision,'true');assert(row.labels.length>0);}
   if(['grass','measure','dropoff','pickup','handoff','phone'].includes(name))await page.screenshot({path:`${out}/${width}-${height}-${name}.png`});
   report.checks.push({width,height,name,...row});
  }
  await page.getByRole('button',{name:'Grass into the factory',exact:true}).click();
  await page.waitForFunction(()=>window.__officialJourneyState?.operator?.active,{timeout:15000});
  await page.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.passed=true;
}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,missing:report.missing}));await browser.close();}
