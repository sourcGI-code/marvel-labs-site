import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {selectVideoFile, isStillOnly} from '../../video-delivery.js';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const documentFor = async path => new JSDOM(await read(path), {url:`https://marvellabs.shop/${path}`}).window.document;

test('hover cannot silently change the selected deposit; explicit choices still work',async()=>{
  const dom=new JSDOM(await read('reserve.html'),{url:'https://marvellabs.shop/reserve.html?size=16&plan=lease'});
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,CustomEvent:dom.window.CustomEvent});
  vm.runInNewContext(await read('reserve-config.js'),{window});
  await import(new URL('reserve-page.js?test=explicit-selection',root));
  const form=document.querySelector('form'),sec=document.querySelector('.rv'),other=form.querySelector('[name="size"][value="20"]');
  const event=new window.Event('pointerenter',{bubbles:true});Object.defineProperty(event,'pointerType',{value:'mouse'});other.closest('label').dispatchEvent(event);
  await new Promise(resolve=>setTimeout(resolve,220));
  assert.equal(form.querySelector('[name="size"]:checked').value,'16');
  assert.match(form.querySelector('.rv-summary').textContent,/16 ft/);
  other.click();assert.equal(form.querySelector('[name="size"]:checked').value,'20');
  sec.dispatchEvent(new window.CustomEvent('rs:size',{detail:'16'}));assert.equal(form.querySelector('[name="size"]:checked').value,'16','explicit stage selection is supported');
  form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  sec.dispatchEvent(new window.CustomEvent('rs:size',{detail:'20'}));assert.equal(form.querySelector('[name="size"]:checked').value,'16','review selection is locked');
  assert.match(form.querySelector('[data-order]').textContent,/16 ft/);dom.window.close();
});

test('deposit and applicable tax are clear in initial HTML, review and consent',async()=>{
  for(const page of ['reserve.html','reserve-studio.html','reserve-light-outdoor.html','reserve-light-white.html','reserve-light-reveal.html']){
    const doc=await documentFor(page);assert.match(doc.querySelector('[data-panel="configure"] .rv-due').textContent,/applicable tax/i);
    assert.match(doc.querySelector('[data-panel="review"] .rv-due').textContent,/applicable tax/i);
  }
  const dom=new JSDOM(await read('reserve.html'),{url:'https://marvellabs.shop/reserve.html'});
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,CustomEvent:dom.window.CustomEvent});
  vm.runInNewContext(await read('reserve-config.js'),{window});await import(new URL('reserve-page.js?test=tax-copy',root));
  const form=document.querySelector('form');form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  assert.match(form.querySelector('.rd-consent').textContent,/\$100 USD plus applicable tax/);
  assert.match(form.querySelector('[data-order]').textContent,/TaxApplicable tax/);
  assert.match(form.querySelector('.rd-payment').textContent,/installment.*not the trailer lease/);
  assert.equal(form.querySelector('[type="submit"]').textContent,'Continue to Shopify checkout ↗');dom.window.close();
});

test('initial reservation HTML agrees with live checkout without requiring JavaScript to read policies', async () => {
  const context = {window:{}};
  vm.runInNewContext(await read('reserve-config.js'),context);
  assert.equal(context.window.MARVEL_RESERVE.mode,'shopify-live');
  for (const name of ['reserve.html','reserve-studio.html','reserve-light-outdoor.html','reserve-light-white.html','reserve-light-reveal.html']) {
    const doc = await documentFor(name);
    assert.match(doc.body.textContent,/RESERVATIONS OPEN/);
    assert.doesNotMatch(doc.body.textContent,/CHECKOUT NOT OPEN|checkout is not open|checkout is simulated|\$100 now/i);
    const policies=doc.querySelector('.rd-policies');
    assert.equal(policies.hidden,false);
    assert.ok([...policies.querySelectorAll('a')].some(a=>a.href==='https://cr1bpi-qf.myshopify.com/policies/terms-of-service'));
    assert.equal(doc.querySelector('[type="submit"]').disabled,true,'payment cannot run before validation initializes');
  }
});

test('model pages describe distinct products and link to a separate selected reservation',async()=>{
  const descriptions=[];
  for(const size of ['16','20']) {
    const doc=await documentFor(`trailer-${size}.html`);
    descriptions.push(doc.querySelector('meta[name="description"]').content);
    assert.equal(doc.querySelector('form'),null);
    assert.ok(doc.querySelector(`a[href="reserve.html?size=${size}"]`));
    assert.equal(doc.querySelector('link[rel="canonical"]').href,`https://marvellabs.shop/trailer-${size}.html`);
    const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
    const product=graph.find(x=>x['@type']==='Product');
    assert.equal(product.model,`${size} ft`);
    assert.equal(product.offers,undefined,'a deposit cannot be represented as the trailer sale price');
    assert.match(doc.body.textContent,/GVWR/);
    assert.match(doc.body.textContent,/\$0\s+monthly lease fee/);
    assert.ok(doc.querySelector('meta[property="og:image"]'));
    assert.ok(doc.querySelector('meta[name="twitter:card"]'));
  }
  assert.notEqual(...descriptions);
});

test('legacy local policies redirect to the current authoritative Shopify policies',async()=>{
  for(const [page,policy] of [['privacy.html','privacy-policy'],['terms.html','terms-of-service'],['reservation-agreement.html','terms-of-service'],['reservation-refunds.html','refund-policy']]) {
    const doc=await documentFor(page),url=`https://cr1bpi-qf.myshopify.com/policies/${policy}`;
    assert.equal(doc.querySelector('link[rel="canonical"]').href,url);
    assert.equal(doc.querySelector('meta[http-equiv="refresh"]').content,`0;url=${url}`);
    assert.ok([...doc.querySelectorAll('a')].some(a=>a.href===url));
    assert.doesNotMatch(doc.body.textContent,/No payment processor|checkout is simulated|No funds are collected/i);
  }
});

test('all size and plan deep links select the intended live form and review',async()=>{
  for(const size of ['16','20'])for(const plan of ['buy','lease']) {
    const dom=new JSDOM(await read('reserve.html'),{url:`https://marvellabs.shop/reserve.html?size=${size}&plan=${plan}`});
    Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,CustomEvent:dom.window.CustomEvent});
    vm.runInNewContext(await read('reserve-config.js'),{window});
    await import(new URL(`reserve-page.js?test=${size}-${plan}`,root));
    const form=document.querySelector('form');
    assert.equal(form.querySelector('[name="size"]:checked').value,size);
    assert.equal(form.querySelector('[name="plan"]:checked').value,plan==='lease'?'free':'buy');
    form.dispatchEvent(new window.Event('submit',{cancelable:true,bubbles:true}));
    assert.match(form.querySelector('[data-order]').textContent,new RegExp(`${size} ft`));
    assert.match(form.querySelector('[data-order]').textContent,plan==='lease'?/Lease/:/Buy/);
    if(plan==='lease')assert.match(form.querySelector('[data-order]').textContent,/\$0 monthly lease fee/);
    assert.equal(form.querySelector('[name="consent"]').checked,false);
    dom.window.close();
  }
});

test('media selects a lighter complete video on slow connections and stills for Data Saver',async()=>{
  const manifest=JSON.parse(await read('film-sources-hqworld4.json'));
  for(const key of ['field','fieldMobile']) {
    const source=manifest[key];
    assert.equal(selectVideoFile(source,source.kind,{effectiveType:'4g',downlink:10}),`${source.kind}.mp4`);
    assert.equal(selectVideoFile(source,source.kind,{effectiveType:'3g'}),`${source.kind}-lite.mp4`);
    for(const file of [source.videoFile,source.liteVideoFile])await access(new URL(`${source.mediaBase}/${file}`,root));
  }
  assert.equal(isStillOnly(false,{saveData:true}),true);
  assert.equal(isStillOnly(true,{}),true);
  assert.equal(isStillOnly(false,{}),false);
  for(const file of ['recorded-scene-hqworld4.js','opening-film-hqworld4.js']) {
    const source=await read(file);
    assert.doesNotMatch(source,/response\.blob\(|localCopy\(|preload='auto'/,'playback failures must not fetch whole movies');
  }
});

test('website assistant acknowledges real payments and distinguishes final lease terms',async()=>{
  const {answerQuestion}=await import('../../crew-chat-answers.mjs');
  for(const question of ['How does the reservation work?','How much does the trailer cost?']) {
    const answer=answerQuestion(question,{}).answer.join(' ');
    assert.match(answer,/Shopify/);
    assert.doesNotMatch(answer,/no payment is taken|does not collect payment|checkout is a preview/);
  }
});

test('cargo loading waits for its chapter while explicit playback and fallback remain available',async()=>{
  const source=(await read('platform-hqworld4.js')).replace(/^import .*;\n/gm,'').replace('export async function createPlatform','async function createPlatform');
  async function fixture({reduced=false,failed=false}={}) {
    const dom=new JSDOM(await read('index.html'),{url:'https://marvellabs.shop/'});
    const {document}=dom.window;
    let progress=.18,loads=0,callbacks=[],timers=[],changed;
    const video=document.createElement('video');
    const film={video,failed,ready:!failed,playing:true,bufferedAhead:3,time:7.2,presentedTime:7.2,seek(){},opacity(){},pause(){},setActive(){},resize(){},retry(){},async play(){return true;}};
    const context={window:dom.window,document,location:dom.window.location,history:dom.window.history,URL,URLSearchParams,console,
      matchMedia:()=>({matches:reduced}),addEventListener:dom.window.addEventListener.bind(dom.window),
      requestAnimationFrame:fn=>{callbacks.push(fn);return callbacks.length;},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
      createFleetLabelMotion:()=>({update(){}}),createArrivalReveal:()=>({update(){},clear(){}}),
      createScrollMotion:()=>({snap:v=>v,step:v=>v,moving:false}),loadFilmSources:async()=>{},
      createOpeningFilm:(_,options)=>{changed=options.onChange;return film;},filmPose:v=>v,filmDuration:10,DELIVERY_END:.885,cargoProgress:v=>Math.max(0,(v-.25)/.635),revealDetails(){},
      createRecordedScene:async()=>{loads++;return {ready:true,atTarget:true,failed:false,video:document.createElement('video'),duration:18,draw:()=>({labels:[],split:0}),setVisible(){},setActive(){},async retry(){}};}
    };
    vm.createContext(context);vm.runInContext(source+'\nthis.makePlatform=createPlatform;',context);
    const api=await context.makePlatform(document.querySelector('#hero-canvas'),{readProgress:()=>progress,writeProgress:v=>{progress=v;},isActive:()=>true,paused:true});
    async function flush(){for(let i=0;i<4;i++){await Promise.resolve();const current=callbacks;callbacks=[];current.forEach(fn=>fn(i*16));const pending=timers;timers=[];pending.forEach(fn=>fn());}}
    return {api,flush,changed,loads:()=>loads,progress:v=>{progress=v;api.setProgress();},close:()=>dom.window.close()};
  }
  const page=await fixture();
  page.changed();await page.flush();assert.equal(page.loads(),0,'buffered opening must not preload cargo');
  page.progress(.25);await page.flush();assert.equal(page.loads(),0,'autoplay ending must not preload cargo');
  page.progress(.27);await page.flush();assert.equal(page.loads(),1,'entering the cargo chapter loads it');
  page.progress(.6);await page.flush();assert.equal(page.loads(),1,'the chapter reuses the existing player');page.close();
  const playback=await fixture();await playback.api.preparePlayback({progress:.25});await playback.flush();assert.equal(playback.loads(),1);playback.close();
  for(const options of [{reduced:true},{failed:true}]){const fallback=await fixture(options);await fallback.flush();assert.equal(fallback.loads(),1);fallback.close();}
});

test('confirmed zero monthly lease fee stays separate from the reservation and operating costs',async()=>{
  for(const file of ['index.html','overview.html','reserve.html','trailer-16.html','trailer-20.html','economics.html','reservation-help.html']) {
    const doc=await documentFor(file),text=doc.body.textContent;
    assert.match(text,/\$0\s*(?:\/\s*month|monthly lease fee)/,file);
    assert.match(text,/\$100/,file);
    assert.match(text,/operating costs/i,file);
    assert.doesNotMatch(text,/monthly (?:lease )?(?:charges|fees?).{0,80}(?:pending|finalized)/i,file);
  }
  const {answerQuestion}=await import('../../crew-chat-answers.mjs');
  for(const question of ['Compare Buy and Lease','What is the monthly lease cost?']) {
    assert.match(answerQuestion(question,{}).answer.join(' '),/\$0 monthly lease fee/);
  }
});

test('historical previews disclose their status and cannot compete as current search pages',async()=>{
  for(const folder of ['yesterday','yesterday-rounded','yesterday-rounded-new-trailer']) {
    for(const file of ['index.html','trailer-16.html','trailer-20.html','marvel/index.html','marvel/sources.html']) {
      const doc=await documentFor(`${folder}/${file}`);
      assert.match(doc.querySelector('meta[name="robots"]').content,/noindex/);
      assert.match(doc.querySelector('[aria-label="Archived design"]').textContent,/does not describe the current offer/);
    }
    const doc=await documentFor(`${folder}/privacy.html`);
    assert.equal(doc.querySelector('link[rel="canonical"]').href,'https://cr1bpi-qf.myshopify.com/policies/privacy-policy');
  }
  const company=await documentFor('marvel/index.html');
  assert.equal(company.querySelector('link[rel="canonical"]').href,'https://marvellabs.shop/about.html');
  assert.match(company.querySelector('meta[http-equiv="refresh"]').content,/url=https:\/\/marvellabs.shop\/about.html/);
  assert.doesNotMatch(await read('robots.txt'),/Disallow: \/yesterday\//,'archive HTML must be crawlable to expose noindex');
  assert.match(await read('robots.txt'),/Disallow: \/crew\//,'interactive app remains excluded');
});

test('reservation iframe failure keeps the matching static image and form available',async()=>{
  const dom=new JSDOM(await read('reserve.html'),{url:'https://marvellabs.shop/reserve.html'});
  Object.assign(globalThis,{window:dom.window,document:dom.window.document});
  const section=document.querySelector('.reserve-stage');
  const recovered=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{observer.disconnect();reject(new Error('Viewer did not recover'));},1500);
    const observer=new window.MutationObserver(()=>{
      if(section.dataset.viewer==='image'){clearTimeout(timer);observer.disconnect();resolve();}
    });
    observer.observe(section,{attributes:true,attributeFilter:['data-viewer']});
  });
  let frame;
  try {
    // The current viewer is an iframe. Exercise its real failure event rather
    // than waiting for the removed direct WebGL import to reject.
    await import('../../reserve-viewer.js?test=renderer-unavailable');
    frame=section.querySelector('iframe');
    assert.ok(frame);
    frame.dispatchEvent(new window.Event('error'));
    await recovered;
    assert.equal(section.classList.contains('rs-live'),false);
    assert.equal(section.querySelector('.rs-3d').getAttribute('aria-busy'),'false');
    assert.match(section.querySelector('.rv-preview img').src,/jet-black-20\.png$/);
    assert.ok(section.querySelector('form'));
    section.dispatchEvent(new window.CustomEvent('rs:size',{detail:'16'}));
    assert.match(section.querySelector('.rv-preview img').src,/jet-black-16\.png$/);
    frame.dispatchEvent(new window.Event('error'));
    assert.equal(section.dataset.viewer,'image');
  } finally {
    frame?.dispatchEvent(new window.Event('error'));
    dom.window.close();
  }
});
