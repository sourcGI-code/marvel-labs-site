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
    const time = () => film.evaluate(v=>v.currentTime);
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
    await page.waitForTimeout(350);
    assert(Math.abs(await time()-reversed)<.1, 'Releasing reverse input must hold the chosen frame');
    assert.equal(await page.locator('body').getAttribute('data-active-scene'),'inside');
    console.log(mobile?'Touch passed':'Wheel passed');
  } finally {await context.close();}
}

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH, args:['--no-sandbox']});
  try {for (const mobile of [false,true]) await check(browser,mobile);}
  finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
