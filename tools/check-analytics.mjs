import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM, VirtualConsole} from 'jsdom';
import {installSiteAnalytics} from '../site-analytics.js';
import {installReservationPayments} from '../reserve-payments.js';

const homepage = await readFile(new URL('../index.html', import.meta.url),'utf8');
const reserve = await readFile(new URL('../reserve.html', import.meta.url),'utf8');
const configSource = await readFile(new URL('../reserve-config.js', import.meta.url),'utf8');
const consentKey = 'marvel-analytics-consent-v1';
const project = {projectId:'test12345'};
function page({url='https://marvellabs.shop/', html=homepage, consent, optout}={}) {
  const dom = new JSDOM(html,{url,pretendToBeVisual:true,runScripts:'outside-only',virtualConsole:new VirtualConsole()});
  const win=dom.window,doc=win.document;
  doc.documentElement.removeAttribute('data-site-loading');
  if(consent) win.localStorage.setItem(consentKey,JSON.stringify({version:1,choice:consent,expires:Date.now()+60000}));
  if(optout) Object.defineProperty(win.navigator,optout,{value:optout==='globalPrivacyControl'?true:'1'});
  return {dom,win,doc,events:()=>win.clarity?.q?.filter(a=>a[0]==='event').map(a=>a[1])||[],
    choose:choice=>doc.querySelector('#marvel-analytics-consent').shadowRoot.querySelector(`[data-choice="${choice}"]`).click()};
}
const tick = () => new Promise(resolve=>setTimeout(resolve,35));
const tags = f => f.win.clarity?.q?.filter(a=>a[0]==='set') || [];

test('missing ID and localhost never load analytics or show a consent prompt',()=>{
  for(const url of ['http://localhost:8779/','http://127.0.0.1:8779/','https://preview.example.com/','https://marvellabs.shop/']){
    const f=page({url});
    installSiteAnalytics(f.win,url==='https://marvellabs.shop/'?{projectId:''}:project);
    assert.equal(f.doc.querySelector('[data-marvel-analytics]'),null);
    assert.equal(f.doc.querySelector('#marvel-analytics-consent'),null);
    assert.equal(f.win.clarity,undefined);f.win.close();
  }
});
test('no tracking before consent or after declining; acceptance loads once and denies ad storage',()=>{
  const f=page();const controller=installSiteAnalytics(f.win,project);
  assert.equal(controller.active,false);assert.equal(f.win.clarity,undefined);
  f.choose('declined');assert.equal(f.win.clarity,undefined);
  f.doc.querySelector('#marvel-analytics-settings').shadowRoot.querySelector('button').click();
  f.choose('accepted');assert.equal(controller.active,true);
  assert.equal(f.doc.querySelectorAll('[data-marvel-analytics]').length,1);
  assert.deepEqual(f.win.clarity.q[0],['consentv2',{ad_Storage:'denied',analytics_Storage:'granted'}]);
  assert.equal(installSiteAnalytics(f.win,project),controller);
  assert.equal(f.doc.querySelectorAll('[data-marvel-analytics]').length,1);
  assert.equal(f.doc.querySelector('iframe').getAttribute('data-clarity-mask'),'true');
  f.choose('declined');assert.equal(controller.active,false);
  assert.equal(JSON.parse(f.win.localStorage.getItem(consentKey)).choice,'declined');
  assert.deepEqual(f.win.clarity.q.at(-1),['consent',false]);
  f.win.close();
});
test('GPC and Do Not Track override even a saved acceptance',()=>{
  for(const optout of ['globalPrivacyControl','doNotTrack']){
    const f=page({consent:'accepted',optout});
    const controller=installSiteAnalytics(f.win,project);
    assert.equal(controller.active,false);assert.equal(f.win.clarity,undefined);
    f.doc.querySelector('#marvel-analytics-settings').shadowRoot.querySelector('button').click();
    assert.equal(f.doc.querySelector('#marvel-analytics-consent').shadowRoot.querySelector('[data-choice="accepted"]').hidden,true);
    f.win.close();
  }
});
test('expired consent asks again; saved rejection and chat/app pages stay off',()=>{
  const f=page({consent:'accepted'});
  f.win.localStorage.setItem(consentKey,JSON.stringify({version:1,choice:'accepted',expires:1}));
  assert.equal(installSiteAnalytics(f.win,project).active,false);assert.equal(f.win.clarity,undefined);f.win.close();
  for(const path of ['/crew-chat.html','/crew/trailer-app/','/']){
    const f=page({url:'https://marvellabs.shop'+path,consent:path==='/'?'declined':'accepted'});
    installSiteAnalytics(f.win,project);assert.equal(f.win.clarity,undefined);f.win.close();
  }
});
test('counts only the active presentation scene and deduplicates revisits',async()=>{
  const f=page({consent:'accepted'});
  f.doc.body.dataset.activeScene='top';f.doc.body.dataset.activeDisplay='arrival';
  installSiteAnalytics(f.win,project);await tick();
  assert.deepEqual(f.events(),['section_top','scene_arrival']);
  f.doc.body.dataset.activeScene='story';await tick();
  assert.deepEqual(f.events(),['section_top','scene_arrival','section_story']);
  f.doc.body.dataset.activeScene='inside';f.doc.body.dataset.activeDisplay='operator';await tick();
  f.doc.body.dataset.activeDisplay='dropoff';await tick();
  f.doc.body.dataset.activeDisplay='operator';await tick();
  assert.equal(f.events().filter(e=>e==='scene_operator').length,1);
  assert.ok(f.events().includes('scene_dropoff'));
  assert.ok(!f.events().includes('section_sizes'));assert.ok(!f.events().includes('section_app'));
  f.win.close();
});
test('static-page section tracking requires visible content',async()=>{
  const f=page({consent:'accepted'});
  f.doc.getElementById('story').getBoundingClientRect=()=>({height:300,top:150,bottom:450});
  f.doc.getElementById('sizes').getBoundingClientRect=()=>({height:300,top:2000,bottom:2300});
  installSiteAnalytics(f.win,project);await tick();
  assert.deepEqual(f.events(),['section_story']);f.win.close();
});
test('both pricing links and reservation navigation are tracked without changing their destinations',()=>{
  const f=page({consent:'accepted'});installSiteAnalytics(f.win,project);
  for(const size of ['16','20']){
    const link=f.doc.querySelector(`[data-analytics-event="price_${size}_click"]`);
    link.addEventListener('click',e=>e.preventDefault());link.click();
    assert.equal(link.href,'https://marvellabs.shop/reserve.html');
  }
  assert.deepEqual(f.events(),['price_16_click','reserve_click','price_20_click','reserve_click']);
  assert.ok(tags(f).some(a=>a[1]==='reserve_cta_section'&&a[2]==='story'));f.win.close();
});
test('reservation funnel records review and validated checkout handoff, never a purchase',async()=>{
  const f=page({url:'https://marvellabs.shop/reserve.html',html:reserve,consent:'accepted'});
  const previous={window:globalThis.window,document:globalThis.document};
  Object.assign(globalThis,{window:f.win,document:f.doc});
  try{
    f.win.eval(configSource);
    const sec=f.doc.querySelector('[data-page="reserve"]'),form=sec.querySelector('form');
    let destination;
    installReservationPayments({sec,form,selection:()=>({size:'20',plan:'buy'}),navigate:url=>destination=url},f.win.MARVEL_RESERVE);
    installSiteAnalytics(f.win,project);await tick();
    assert.ok(f.events().includes('reserve_page'));assert.ok(!f.events().includes('reservation_review'));
    const submit=()=>form.dispatchEvent(new f.win.Event('submit',{bubbles:true,cancelable:true}));
    submit();await tick();assert.equal(sec.dataset.orderStep,'review');assert.ok(f.events().includes('reservation_review'));
    submit();assert.equal(destination,undefined);assert.ok(!f.events().includes('checkout_handoff'));
    form.querySelector('[name="consent"]').checked=true;submit();
    assert.equal(new URL(destination).hostname,'cr1bpi-qf.myshopify.com');
    assert.ok(f.events().includes('checkout_handoff'));
    assert.ok(!f.events().some(e=>/purchase|paid|complete/.test(e)));
    assert.ok(tags(f).some(a=>a[1]==='trailer_size'&&a[2]==='20'));
  }finally{Object.assign(globalThis,previous);f.win.close();}
});
test('production markup contains one analytics entry and preserves masking for dynamic chat',async()=>{
  for(const name of ['index.html','reserve.html','trailer-16.html','trailer-20.html','contact.html']){
    const html=await readFile(new URL('../'+name,import.meta.url),'utf8');
    assert.equal((html.match(/src="site-analytics\.js\?/g)||[]).length,1);
  }
  const chat=await readFile(new URL('../crew-page-chat.js',import.meta.url),'utf8');
  assert.ok(chat.includes("widget.setAttribute('data-clarity-mask', 'true')"));
});
