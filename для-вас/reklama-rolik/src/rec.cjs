// Покадровая запись сцен ролика: экран телефона 390×844 (кадры 780×1688), 25 кадров в секунду
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const OUT = '/tmp/claude-0/-home-user/3120f746-a2da-5056-a1f1-afb773dcbf2a/scratchpad/vid/frames/';
const FPS = 25; const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const HIDE = `.c-demo{display:none!important}html{scroll-behavior:auto!important}::-webkit-scrollbar{display:none}`;
(async () => {
  const b = await chromium.launch({ args: ['--lang=ru-RU'] });
  const scene = async (name, fn, opts = {}) => {
    const dir = OUT + name + '/'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ru-RU', hasTouch: false }); const p = await ctx.newPage(); p.on('dialog', (d) => d.accept());
    let n = 0; const shot = () => p.screenshot({ path: dir + String(n++).padStart(4, '0') + '.jpg', type: 'jpeg', quality: 88 });
    const hold = async (s) => { for (let i = 0; i < Math.round(s * FPS); i++) { await shot(); await p.waitForTimeout(25); } };
    const scroll = async (to, sec) => { const from = await p.evaluate(() => scrollY); const f = Math.round(sec * FPS); for (let i = 1; i <= f; i++) { await p.evaluate((v) => scrollTo(0, v), from + (to - from) * ease(i / f)); await shot(); } };
    const hideDemo = () => p.evaluate(() => { const k = [...document.querySelectorAll('a,button,span,div')].find((x) => /^Открыть админку$/.test((x.textContent || '').trim())); if (k) { let e = k; while (e.parentElement && e.parentElement !== document.body && e.parentElement.getBoundingClientRect().height < 90) e = e.parentElement; e.style.display = 'none'; } });
    const warm = async (url) => { await p.goto(url, { waitUntil: 'networkidle' }).catch(() => {}); await p.addStyleTag({ content: HIDE }); await p.evaluate(async () => { for (let y = 0; y < Math.min(document.body.scrollHeight, 4000); y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600); await hideDemo(); };
    const type = async (loc, text) => { await loc.click(); await loc.fill(''); for (const ch of text) { await loc.type(ch); await shot(); await shot(); await shot(); } };
    await fn({ p, shot, hold, scroll, warm, type, hideDemo }); console.log(name, n, 'кадров'); await ctx.close();
  };
  // 1. дизайны: каждый сайт ~1,6 с (пауза + плавная прокрутка)
  const sites = [['d1', 'http://localhost:8092/sites/barber13/'], ['d2', 'http://localhost:8092/demos/glazur-ponchiki/'], ['d3', 'http://localhost:8092/sites/boks-stoyka/'],
    ['d4', 'http://localhost:8092/demos/makov-cvet/'], ['d5', 'http://localhost:8091/'], ['d6', 'http://localhost:8092/demos/galant/']];
  for (const [n, u] of sites) await scene(n, async ({ p, hold, scroll, warm }) => { await warm(u); await hold(0.7); await scroll(n === 'd5' ? 260 : 320, 1.0); });
  // 2. админка: открыть курс, поменять цену, опубликовать
  await scene('admin', async ({ p, hold, scroll, shot, type }) => {
    await p.goto('http://localhost:8091/admin/'); await p.fill('input[type=password]', 'zolotoy-svet'); await p.click('button.btn--acc'); await p.waitForSelector('.tabs'); await p.waitForTimeout(900);
    await hold(0.8); const it = p.locator('main > .list').first().locator('> details.item').first(); await it.locator('> summary > .ttl').click(); await p.waitForTimeout(250); await hold(0.6);
    const pr = it.locator('label:has(> span:text-is("Цена, ₽")) input'); const y = await pr.evaluate((e) => e.getBoundingClientRect().top + scrollY - 300); await scroll(y, 0.6); await hold(0.4);
    await type(pr, '19900'); await hold(0.6); await p.click('#pubBtn'); for (let i = 0; i < 50; i++) { await shot(); await p.waitForTimeout(30); if (await p.$('.toast:has-text("Опубликовано")')) break; } await hold(1.4);
  });
  // 3. сайт: новая цена
  await scene('site', async ({ p, hold, scroll, warm }) => { await warm('http://localhost:8091/'); await hold(0.3); const y = await p.evaluate(() => { const t = document.querySelector('.ctile'); return t.getBoundingClientRect().top + scrollY - 140; }); await scroll(y, 1.2); await hold(2.2); });
  // 4. акция: включить скидку 15% и плашку, опубликовать, показать сайт
  await scene('promo', async ({ p, hold, shot, type }) => {
    await p.goto('http://localhost:8091/admin/'); await p.fill('input[type=password]', 'zolotoy-svet'); await p.click('button.btn--acc'); await p.waitForSelector('.tabs');
    await p.click('.tabs button:text-is("Акции")'); await p.waitForTimeout(600); await hold(0.6);
    const box = p.locator('details.box:has(> summary:has-text("Скидка на курсы"))'); await box.locator('label.chk:has-text("Включить скидку") input').check(); await hold(0.4);
    await type(box.locator('label:has(> span:text-is("Скидка, %")) input'), '15'); await box.locator('input[type=date]').fill('2026-12-31');
    await p.evaluate(() => { const i = document.querySelector('details.box input[type=date]'); i.type = 'text'; i.value = '31.12.2026'; });
    const bar = p.locator('details.box:has(> summary:has-text("Плашка над сайтом"))'); await bar.evaluate((d) => (d.open = true)); await bar.locator('label.chk:has-text("Показывать плашку") input').check();
    await bar.locator('label:has(> span:text-is("Текст")) input').fill('−15% на все курсы до конца декабря'); await bar.locator('label:has(> span:text-is("Показывать до (включительно)")) input').fill('2026-12-31');
    await p.evaluate(() => document.querySelectorAll('details.box input[type=date]').forEach((i) => { if (i.value) { const [y, m, d] = i.value.split('-'); i.type = 'text'; i.value = d + '.' + m + '.' + y; } }));
    await hold(0.5); await p.click('#pubBtn'); for (let i = 0; i < 50; i++) { await shot(); await p.waitForTimeout(30); if (await p.$('.toast:has-text("Опубликовано")')) break; } await hold(0.8);
  });
  await scene('promosite', async ({ p, hold, scroll, warm }) => { await warm('http://localhost:8091/'); await hold(1.2); const y = await p.evaluate(() => { const t = document.querySelector('.ctile'); return t.getBoundingClientRect().top + scrollY - 140; }); await scroll(y, 1.2); await hold(1.8); });
  await b.close();
})();
