// Exercise real wheel and touch input on the same field film used on the homepage.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.BASE_URL || 'http://localhost:8793').replace(/\/$/, '');

async function check(browser, mobile) {
  const context = await browser.newContext({
    viewport: mobile ? {width:390, height:844} : {width:1366, height:820},
    isMobile: mobile, hasTouch: mobile,
  });
  try {
    const page = await context.newPage();
    await page.goto(base + '/#inside', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.__beats && document.querySelector('#inside video')?.readyState >= 2);
    const decline = page.getByRole('button', {name:'Decline analytics'});
    if (await decline.isVisible()) await decline.click();
    const film = page.locator('#inside video');
    // Start from a chapter in the middle so rewinding stays within the film.
    await page.locator('[data-display-target="equipment"]').click();
    await page.waitForFunction(() => {
      const v = document.querySelector('#inside video');
      return v.currentTime > 5 && !v.seeking && v.readyState >= 2;
    });
    const cdp = await context.newCDPSession(page);
    async function scroll(direction) {
      if (mobile) {
        const y = direction > 0 ? 560 : 280;
        await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:200,y}]});
        for (let i=1; i<=24; i++) {
          await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:200,y:y-direction*i*7}]});
          await page.waitForTimeout(24);
        }
        await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
      } else {
        await page.mouse.move(630,450);
        for (let i=0; i<24; i++) {
          await page.mouse.wheel(0, direction*32);
          await page.waitForTimeout(24);
        }
      }
    }
    await film.evaluate(v => {v.dataset.seeks='0';v.addEventListener('seeking',()=>v.dataset.seeks=String(Number(v.dataset.seeks)+1));});
    // The film's own time. A film that carries a reversed copy for scrolling back
    // plays and briefly rests in that copy, so the element's clock alone is not it.
    const time = () => page.evaluate(() => window.__officialJourneyState.presentationTime);
    const start = await time();
    await scroll(1);
    await page.waitForTimeout(500);
    const advanced = await time();
    assert(advanced > start + .2, 'Forward input must play the film');
    assert(await film.evaluate(v=>Number(v.dataset.seeks))<=2, 'Forward input repeatedly re-seeks the film');
    await scroll(-1);
    await page.waitForTimeout(550);
    const reversed = await time();
    assert(reversed < advanced - .1, 'Backward input must rewind the current chapter');
    if (await page.evaluate(() => window.__beats.playback.canRewind))
      assert(await film.evaluate(v=>Number(v.dataset.seeks))<=5, 'Backward input must play the reversed copy, not seek picture by picture');
    // Owner 11-21 ("scrolling up doesnt work that well"): a wheel rewind runs to the frame its notches asked for,
    // REWIND_PER_NOTCH (1.5 s) of film per 100 px in continuous-scroll.js, then holds it. A touch rewind coasts to a stop.
    await page.waitForFunction(() => !window.__beats.playback.reverse, null, {timeout: 6000});
    const held = await time();
    if (!mobile) assert(held <= Math.max(0, advanced - 24*32/100*1.5) + 1,
      `A wheel rewind must cover the distance scrolled back (from ${advanced.toFixed(2)} s it stopped at ${held.toFixed(2)} s)`);
    await page.waitForTimeout(350);
    const after = await time();
    assert(Math.abs(after-held)<.1, `Releasing reverse input must hold the chosen frame (${held.toFixed(2)} s, then ${after.toFixed(2)} s; ${JSON.stringify(await page.evaluate(() => window.__beats.playback))})`);
    assert.equal(await page.locator('body').getAttribute('data-active-scene'),'inside');
    console.log(mobile?'Touch passed':'Wheel passed');
  } finally {await context.close();}
}

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH, args:['--no-sandbox']});
  try {for (const mobile of [false,true]) await check(browser,mobile);}
  finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
