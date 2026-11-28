// Живая запись админки (тестовая копия АлтынНур на 8091): правка цены покадрово 30 fps + сайт до и после
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const A = path.join(__dirname, '..', 'assets', 'admin'); const FPS = 30;
(async () => {
  const b = await chromium.launch({ args: ['--lang=ru-RU'] });
  const site = async (name) => { const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await p.goto('http://localhost:8091/?x=' + Date.now(), { waitUntil: 'networkidle' });
    await p.evaluate(async () => { for (let y = 0; y < 3000; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } }); await p.waitForTimeout(500);
    await p.evaluate(() => { const t = document.querySelector('.ctile'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 120); }); await p.waitForTimeout(1200);
    await p.screenshot({ path: path.join(A, name + '.jpg'), type: 'jpeg', quality: 92 }); await p.close(); };
  fs.mkdirSync(A, { recursive: true }); await site('site-before');
  const dir = path.join(A, 'price'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ru-RU' }); p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8091/admin/'); await p.fill('input[type=password]', 'zolotoy-svet'); await p.click('button.btn--acc'); await p.waitForSelector('.tabs'); await p.waitForTimeout(1000);
  let n = 0; const shot = () => p.screenshot({ path: path.join(dir, String(n++).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 90 });
  const hold = async (s) => { for (let i = 0; i < Math.round(s * FPS); i++) await shot(); };
  const it = p.locator('main > .list').first().locator('> details.item').first();
  await hold(0.6); await it.locator('> summary > .ttl').click(); await p.waitForTimeout(300); await hold(0.4);
  const pr = it.locator('label:has(> span:text-is("Цена, ₽")) input');
  const y = await pr.evaluate((e) => e.getBoundingClientRect().top + scrollY - 330); const from = await p.evaluate(() => scrollY);
  for (let i = 1; i <= 18; i++) { const k = i / 18, e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; await p.evaluate((v) => scrollTo(0, v), from + (y - from) * e); await shot(); }
  await hold(0.3); await pr.click(); await pr.fill(''); await hold(0.2);
  for (const ch of '19900') { await pr.type(ch); for (let i = 0; i < 4; i++) await shot(); }
  await hold(0.5); fs.writeFileSync(path.join(A, 'price-publish-frame.txt'), String(n));
  await p.click('#pubBtn'); for (let i = 0; i < 60; i++) { await shot(); if (await p.$('.toast:has-text("Опубликовано")')) break; } await hold(1.2);
  console.log('кадров админки', n); await p.close();
  await site('site-after'); await b.close();
})();
