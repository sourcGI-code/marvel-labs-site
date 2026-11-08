import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {readCampaign,campaignLink,installCampaignLinks} from '../../campaign-attribution.js';
import {checkoutURL} from '../../payment-links.js';
import {installReservationPayments} from '../../reserve-payments.js';

test('campaign labels follow landing → model → reservation without storage or unrelated query fields',()=>{
  const landing='https://marvellabs.shop/?utm_source=social&utm_medium=organic_social&utm_campaign=wave1&utm_content=buy16-square&email=private%40example.com&gclid=not-carried';
  const model=campaignLink('trailer-16.html',landing),reserve=campaignLink('reserve.html?size=16&plan=buy',model);
  const params=new URL(reserve).searchParams;
  assert.equal(params.get('size'),'16');assert.equal(params.get('plan'),'buy');assert.equal(params.get('utm_content'),'buy16-square');
  assert.equal(params.has('email'),false);assert.equal(params.has('gclid'),false);
  assert.equal(campaignLink('https://example.com/',landing),null);assert.equal(campaignLink('#story',landing),null);
  assert.deepEqual(readCampaign('?utm_source=private%40example.com&utm_medium=%3Cscript%3E&utm_campaign='+('a'.repeat(81))),{});
});

test('campaign navigation preserves destination choices and leaves native click behavior intact',()=>{
  const dom=new JSDOM('<a href="reserve.html?size=20&plan=lease">Reserve</a>',{url:'https://marvellabs.shop/trailer-20.html?utm_source=social&utm_campaign=wave1'});
  installCampaignLinks(dom.window.document,dom.window.location);const a=dom.window.document.querySelector('a');
  const event=new dom.window.Event('auxclick',{bubbles:true,cancelable:true});a.dispatchEvent(event);
  assert.equal(event.defaultPrevented,false);const p=new URL(a.href).searchParams;assert.equal(p.get('size'),'20');assert.equal(p.get('utm_source'),'social');dom.window.close();
});

test('the actual reservation review carries campaign labels into exactly one correct Shopify deposit',async()=>{
  const dom=new JSDOM(await readFile(new URL('../../reserve.html',import.meta.url),'utf8'),{url:'https://marvellabs.shop/reserve.html?size=16&plan=lease&utm_source=social&utm_campaign=wave1&utm_content=lease-vertical'});
  Object.assign(globalThis,{window:dom.window,document:dom.window.document});
  vm.runInNewContext(await readFile(new URL('../../reserve-config.js',import.meta.url),'utf8'),{window});
  const form=document.querySelector('form'),sec=document.querySelector('.reserve-stage');let destination;
  installReservationPayments({sec,form,selection:()=>({size:'16',plan:'lease'}),navigate:url=>{destination=url;}});
  form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(destination,undefined);form.querySelector('[name="consent"]').checked=true;
  form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  const url=new URL(destination);assert.equal(url.pathname,'/cart/52332951666934:1');
  assert.equal(url.searchParams.get('attributes[Campaign]'),'wave1');assert.equal(url.searchParams.get('attributes[Creative]'),'lease-vertical');assert.equal(url.searchParams.get('ref'),'social');
  assert.equal(url.searchParams.get('attributes[Plan]'),'Lease');assert.equal(form.querySelector('[data-panel="complete"]'),null);
  const injected=new URL(checkoutURL(window.MARVEL_RESERVE,{size:'16',plan:'lease'},{utm_source:'private@example.com',email:'private@example.com',amount:'1'}));
  assert.equal(injected.searchParams.has('ref'),false);assert.equal(injected.searchParams.has('email'),false);assert.equal(injected.searchParams.has('amount'),false);dom.window.close();
});

test('media and partnerships pages have canonical URLs, real inquiry links and qualified claims',async()=>{
  for(const name of ['media.html','partners.html']){
    const dom=new JSDOM(await readFile(new URL('../../'+name,import.meta.url),'utf8'),{url:'https://marvellabs.shop/'+name});const d=dom.window.document;
    assert.equal(d.querySelector('link[rel="canonical"]').href,'https://marvellabs.shop/'+name);assert.ok(d.querySelector('a[href^="mailto:jaxon@marvellabs.com"]'));
    assert.match(d.body.textContent,/not guaranteed/);assert.ok(d.querySelector('a[href="validation.html"]'));assert.ok(d.querySelector('script[src^="campaign-links.js"]'));
    assert.equal(d.querySelector('form'),null,'a mail link must not masquerade as a submitted lead');dom.window.close();
  }
});
