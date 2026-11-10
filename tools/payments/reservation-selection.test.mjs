import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {installReservationPayments} from '../../reserve-payments.js';

const html = await readFile(new URL('../../reserve.html', import.meta.url), 'utf8');
const config = await readFile(new URL('../../reserve-config.js', import.meta.url), 'utf8');
const script = (await readFile(new URL('../../reserve-page.js', import.meta.url), 'utf8')).replace(/^import .*;\n/, '');

function load(url = 'https://marvellabs.shop/reserve.html') {
  const dom = new JSDOM(html, {url, runScripts: 'outside-only'});
  Object.assign(globalThis, {window: dom.window, document: dom.window.document});
  dom.window.installReservationPayments = installReservationPayments;
  vm.runInContext(config, dom.getInternalVMContext());
  vm.runInContext(script, dom.getInternalVMContext());
  const form = document.querySelector('.rv-rail');
  return {dom, form, sec: document.querySelector('section.rv'),
    choose(name, value) {
      const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
      input.checked = true;
      input.dispatchEvent(new window.Event('change', {bubbles: true}));
    },
    submit() { form.dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true})); }
  };
}

for (const size of ['16', '20']) for (const plan of ['buy', 'lease']) {
  test(`${size} ft ${plan} survives a fresh page load and still reviews the correct order`, () => {
    let f = load('https://marvellabs.shop/reserve.html?utm_source=social&utm_campaign=launch&view=customer#trailer');
    window.history.replaceState({previous: 'kept'}, '', window.location.href);
    const historyLength = window.history.length;
    f.choose('size', size);
    f.choose('plan', plan === 'lease' ? 'free' : 'buy');
    const url = new URL(window.location.href);
    assert.equal(url.searchParams.get('size'), size);
    assert.equal(url.searchParams.get('plan'), plan);
    assert.equal(url.searchParams.get('utm_source'), 'social');
    assert.equal(url.searchParams.get('utm_campaign'), 'launch');
    assert.equal(url.searchParams.get('view'), 'customer');
    assert.equal(url.hash, '#trailer');
    assert.equal(window.history.length, historyLength);
    assert.deepEqual(window.history.state, {previous: 'kept'});
    f.submit();
    f.form.querySelector('[name="consent"]').checked = true;
    f.dom.window.close();

    f = load(url.href);
    assert.equal(f.form.querySelector('[name="size"]:checked').value, size);
    assert.equal(f.form.querySelector('[name="plan"]:checked').value, plan === 'lease' ? 'free' : 'buy');
    assert.equal(f.sec.dataset.orderStep, 'configure');
    assert.equal(f.form.querySelector('[name="consent"]').checked, false);
    assert.match(f.form.querySelector('.rv-summary').textContent, new RegExp(`${size} ft · ${plan === 'buy' ? 'Buy' : 'Lease'}`));
    f.submit();
    const order = f.form.querySelector('[data-order]').textContent;
    assert.ok(order.includes(`${size} ft`));
    assert.ok(order.includes(plan === 'buy' ? 'Buy · 75%' : 'Lease · $0'));
    f.dom.window.close();
  });
}

test('opening without a size preserves the two-trailer introduction until a deliberate selection', () => {
  const f = load();
  assert.equal(window.location.search, '');
  assert.equal(f.sec.dataset.open, undefined);
  f.sec.dispatchEvent(new window.CustomEvent('rs:size', {detail: '16'}));
  assert.equal(new URL(window.location.href).searchParams.get('size'), '16');
  assert.equal(f.form.querySelector('[name="size"]:checked').value, '16');
  f.submit();
  f.sec.dispatchEvent(new window.CustomEvent('rs:size', {detail: '20'}));
  assert.equal(new URL(window.location.href).searchParams.get('size'), '16', 'preview events cannot change the reviewed order');
  f.dom.window.close();
});
