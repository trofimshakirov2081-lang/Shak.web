// Живые записи админки для главы «Ваш пульт» (тестовая копия АлтынНур на 8091, 30 fps):
// фото, акция, оформление, конструктор блока, заявка клиента. Для каждой: кадры админки + сайт до и после.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const A = path.join(__dirname, '..', 'assets', 'admin'); const FPS = 30;
const PREP = '/tmp/claude-0/-home-user/3120f746-a2da-5056-a1f1-afb773dcbf2a/scratchpad/prep.sh';
const lbl = (t) => `label:has(> span:text-is("${t}"))`;
const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
(async () => {
  const b = await chromium.launch({ args: ['--lang=ru-RU'] });
  const site = async (file, path_ = '', scrollFn) => { const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await p.goto('http://localhost:8091/' + path_ + '?x=' + Date.now(), { waitUntil: 'networkidle' });
    await p.evaluate(async () => { for (let y = 0; y < 3000; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } scrollTo(0, 0); }); await p.waitForTimeout(600);
    if (scrollFn) await p.evaluate(scrollFn); await p.waitForTimeout(1400); await p.screenshot({ path: path.join(A, file), type: 'jpeg', quality: 92 }); await p.close(); };
  const flow = async (name, fn) => { execFileSync('sh', [PREP]); const dir = path.join(A, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ru-RU' }); p.on('dialog', (d) => d.accept());
    let n = 0; const marks = {}; const shot = () => p.screenshot({ path: path.join(dir, String(n++).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 90 });
    const hold = async (s) => { for (let i = 0; i < Math.round(s * FPS); i++) await shot(); };
    const scrollTo = async (y, s = .6) => { const from = await p.evaluate(() => scrollY); const f = Math.round(s * FPS); for (let i = 1; i <= f; i++) { await p.evaluate((v) => scrollTo(0, v), from + (y - from) * ease(i / f)); await shot(); } };
    const mark = (k) => (marks[k] = n);
    const publish = async () => { mark('publish'); await p.click('#pubBtn'); for (let i = 0; i < 60; i++) { await shot(); if (await p.$('.toast:has-text("Опубликовано")')) break; } mark('published'); await hold(.8); };
    await fn({ p, shot, hold, scrollTo, mark, publish });
    fs.writeFileSync(path.join(dir, 'marks.json'), JSON.stringify({ frames: n, ...marks })); console.log(name, n, JSON.stringify(marks)); await p.close(); };
  const login = async (p) => { await p.goto('http://localhost:8091/admin/'); await p.fill('input[type=password]', 'zolotoy-svet'); await p.click('button.btn--acc'); await p.waitForSelector('.tabs'); await p.waitForTimeout(800); };
  const openBoxes = (p) => p.$$eval('main details.box:not([open])', (ds) => ds.forEach((d) => (d.open = true)));

  // 1. Фото первого экрана: заменить главное фото
  execFileSync('sh', [PREP]); await site('photo-before.jpg');
  const newPhoto = path.join(require('os').tmpdir(), 'new-hero.jpg'); fs.copyFileSync(path.join(A, 'new-hero.jpg'), newPhoto); // Playwright не отдаёт файл из пути с кириллицей
  await flow('photo', async ({ p, hold, mark, publish }) => { await login(p); await p.click('.tabs button:text-is("Главная")'); await p.waitForTimeout(500); await hold(.6);
    const btn = p.locator('.hp-tile').first().locator('button:has-text("Заменить")'); const y = await btn.evaluate((e) => e.getBoundingClientRect().top + scrollY - 420); await p.evaluate((v) => scrollTo(0, v), y); await hold(.5);
    mark('tap'); const [fc] = await Promise.all([p.waitForEvent('filechooser'), btn.click()]); await hold(.3); await fc.setFiles(newPhoto);
    for (let i = 0; i < 90; i++) { await hold(1 / 30); if (await p.$('.toast:has-text("загружено")')) break; } mark('uploaded'); await hold(.8); await publish(); });
  await site('photo-after.jpg');
  // 2. Акция: скидка 15% и плашка с таймером
  execFileSync('sh', [PREP]); await site('promo-before.jpg', '', () => { const t = document.querySelector('.ctile'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 120); });
  await flow('promo', async ({ p, hold, mark, publish }) => { await login(p); await p.click('.tabs button:text-is("Акции")'); await p.waitForTimeout(500); await openBoxes(p); await hold(.5);
    const box = p.locator('details.box:has(> summary:has-text("Скидка на курсы"))'); mark('tap'); await box.locator('label.chk:has-text("Включить скидку") input').check(); await hold(.3);
    const pc = box.locator(lbl('Скидка, %') + ' input'); await pc.click(); await pc.fill(''); for (const ch of '15') { await pc.type(ch); await hold(.12); }
    await box.locator('input[type=date]').fill('2026-12-31'); await p.evaluate(() => { const i = document.querySelector('details.box input[type=date]'); i.type = 'text'; i.value = '31.12.2026'; }); await hold(.3);
    const bar = p.locator('details.box:has(> summary:has-text("Плашка над сайтом"))'); await bar.locator('label.chk:has-text("Показывать плашку") input').check();
    await bar.locator(lbl('Текст') + ' input').fill('−15% на все курсы до конца декабря'); await bar.locator(lbl('Показывать до (включительно)') + ' input').fill('2026-12-31');
    await p.evaluate(() => document.querySelectorAll('input[type=date]').forEach((i) => { if (i.value) { const [y, m, d] = i.value.split('-'); i.type = 'text'; i.value = d + '.' + m + '.' + y; } })); await hold(.4); await publish(); });
  await site('promo-after.jpg', '', () => { const t = document.querySelector('.ctile'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 120); }); await site('promo-after-top.jpg');
  // 3. Оформление: готовые палитры
  execFileSync('sh', [PREP]); await site('look-0.jpg', '', () => { const t = document.querySelector('.ctiles, .dirs'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 200); });
  await flow('look', async ({ p, hold, mark, publish }) => { await login(p); await p.click('.tabs button:text-is("Оформление")'); await p.waitForTimeout(500); await openBoxes(p);
    const pre = p.locator('button:has-text("Изумруд и золото")'); const y = await pre.evaluate((e) => e.getBoundingClientRect().top + scrollY - 380); await p.evaluate((v) => scrollTo(0, v), y); await hold(.6);
    mark('tap'); await pre.click(); await p.waitForTimeout(300); await p.evaluate((v) => scrollTo(0, v), y); await hold(.8); await publish(); });
  await site('look-1.jpg', '', () => { const t = document.querySelector('.ctiles, .dirs'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 200); });
  for (const [k, n] of [['Молоко и бордо', 2], ['Пудра и золото', 3]]) { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); await login(p); await p.click('.tabs button:text-is("Оформление")'); await p.waitForTimeout(400); await openBoxes(p);
    await p.click(`button:has-text("${k}")`); await p.waitForTimeout(300); await p.click('#pubBtn'); await p.waitForSelector('.toast:has-text("Опубликовано")', { timeout: 60000 }); await p.close(); await site(`look-${n}.jpg`, '', () => { const t = document.querySelector('.ctiles, .dirs'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 200); }); }
  // 4. Конструктор: новый блок «Цены»
  execFileSync('sh', [PREP]);
  await flow('block', async ({ p, hold, mark, publish }) => { await login(p); await p.click('.tabs button:text-is("Конструктор")'); await p.waitForTimeout(500); await hold(.6);
    await p.selectOption(lbl('Куда поставить') + ' select', 'start'); await hold(.2);
    const t = p.locator('button.type:has-text("Цены")'); const y = await t.evaluate((e) => e.getBoundingClientRect().top + scrollY - 360); await p.evaluate((v) => scrollTo(0, v), y); await hold(.4);
    mark('tap'); await t.click(); await p.waitForTimeout(400); await hold(.3);
    const it = p.locator('.bl-list > .item').last(); await it.locator(lbl('Заголовок') + ' input').fill('Цены на обучение'); await hold(.2);
    const ta = it.locator(lbl('Текст') + ' textarea'); await ta.click(); for (const line of ['Ресницы: база :: 25 000 ₽', 'Брови-профи :: 20 000 ₽', 'Маникюр, 5 дней :: 22 000 ₽']) { await ta.type(line + '\n'); await hold(.25); }
    await it.locator(lbl('Кнопка в блоке') + ' select').selectOption('enroll'); await hold(.4); await publish(); });
  await site('block-after.jpg', '', () => { const t = document.querySelector('.cb'); if (t) scrollTo(0, t.getBoundingClientRect().top + scrollY - 140); });
  // 5. Заявка клиента: сайт, выбор курса, форма
  execFileSync('sh', [PREP]);
  { const dir = path.join(A, 'lead'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ru-RU' }); const p = await ctx.newPage(); let wa = ''; ctx.on('page', (np) => { wa = np.url(); np.close().catch(() => {}); });
    let n = 0; const marks = {}; const shot = () => p.screenshot({ path: path.join(dir, String(n++).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 90 }); const hold = async (s) => { for (let i = 0; i < Math.round(s * FPS); i++) await shot(); };
    await p.goto('http://localhost:8091/courses/lashes/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); await hold(.6);
    const from = 0, to = 420; for (let i = 1; i <= 24; i++) { await p.evaluate((v) => scrollTo(0, v), from + (to - from) * ease(i / 24)); await shot(); } await hold(.4);
    marks.tap = n; await p.locator('[data-enroll]').first().click(); await p.waitForTimeout(400); await hold(.4);
    const f = p.locator('#modal form'); const name = f.locator('[name=name]'); await name.click(); for (const ch of 'Анна') { await name.type(ch); await shot(); await shot(); }
    const ph = f.locator('[name=phone]'); await ph.click(); for (const ch of '9271234567') { await ph.type(ch); await shot(); }
    const ag = f.locator('input[type=checkbox]'); if (await ag.count()) await ag.first().check(); await hold(.3);
    marks.send = n; await f.locator('[type=submit]').click(); await p.waitForTimeout(500); await hold(1.2);
    marks.frames = n; fs.writeFileSync(path.join(dir, 'marks.json'), JSON.stringify(marks)); fs.writeFileSync(path.join(A, 'lead-message.txt'), decodeURIComponent((wa.split('text=')[1] || '').split('&')[0].replace(/\+/g, ' ')));
    console.log('lead', n, JSON.stringify(marks)); await ctx.close(); }
  await b.close();
})();
