// Capturas de revisión visual: node scripts/screenshots.mjs <ruta> [anchos] [scrollFracciones]
// Ej.: node scripts/screenshots.mjs / 390,1280 0,0.3,0.6
// Guarda PNGs en ./test-results/shots y reporta overflow horizontal y errores de consola.
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const base = process.env.BASE_URL || 'http://localhost:3006';
const route = process.argv[2] || '/';
const widths = (process.argv[3] || '390,768,1280,1920').split(',').map(Number);
const fracs = (process.argv[4] || '0').split(',').map(Number);
const out = 'test-results/shots';
mkdirSync(out, {recursive: true});

const browser = await chromium.launch();
for (const w of widths) {
  const h = w < 768 ? 844 : w < 1280 ? 1024 : w < 1920 ? 800 : 1080;
  const page = await browser.newPage({viewport: {width: w, height: h}});
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + route, {waitUntil: 'networkidle'});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (const f of fracs) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * f));
    await page.waitForTimeout(900);
    const name = `${out}/${route.replace(/\W+/g, '_') || 'home'}-${w}-${String(f).replace('.', '')}.png`;
    await page.screenshot({path: name});
    console.log('shot', name);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`w=${w} overflowX=${overflow}px scrollable=${total}px errors=${errors.length}`);
  errors.slice(0, 5).forEach((e) => console.log('  console:', e.slice(0, 200)));
  await page.close();
}
await browser.close();
