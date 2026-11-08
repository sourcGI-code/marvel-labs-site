import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {selectVideoFile, isStillOnly} from '../../video-delivery.js';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const documentFor = async path => new JSDOM(await read(path), {url:`https://marvellabs.shop/${path}`}).window.document;

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
    assert.match(doc.body.textContent,/Monthly lease charges/);
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

test('reservation viewer failure keeps the static image and form available',async()=>{
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
  // The browser import map/WebGL renderer is deliberately absent in this fixture.
  await import('../../reserve-viewer.js?test=renderer-unavailable');
  await recovered;
  assert.equal(section.classList.contains('rs-live'),false);
  assert.match(section.querySelector('.rv-preview img').src,/thumb-20\.png$/);
  assert.ok(section.querySelector('form'));
  section.dispatchEvent(new window.CustomEvent('rs:size',{detail:'16'}));
  assert.match(section.querySelector('.rv-preview img').src,/thumb-16\.png$/);
  dom.window.close();
});
