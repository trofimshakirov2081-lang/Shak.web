// Снимки работ для ролика: длинные страницы в мобильной версии (390 px, ретина) и первые экраны на компьютере.
// Нужны локальные серверы: портфолио на 8092 (python3 -m http.server 8092 в Shak.web), копия сайта АлтынНур на 8091.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'sites'); fs.mkdirSync(OUT, { recursive: true });
const P = 'http://localhost:8092/';
const MOBILE = [
  ['you-bloom', P + 'demos/you-bloom/'], ['the-rose', P + 'demos/the-rose/'], ['yummy-cake', P + 'demos/yummy-cake/'], ['makov', P + 'demos/makov-cvet/'],
  ['galant', P + 'demos/galant/'], ['altyn', 'http://localhost:8091/'], ['barber', P + 'sites/barber13/'], ['stoyka', P + 'sites/boks-stoyka/'], ['glazur', P + 'demos/glazur-ponchiki/'],
];
const DESKTOP = [['med', P + 'demos/med-obzharka/'], ['zerkalo', P + 'demos/zerkalo-detailing/'], ['altyn-d', 'http://localhost:8091/'], ['yummy-d', P + 'demos/yummy-cake/']];
const clean = async (p) => { await p.addStyleTag({ content: '.c-demo{display:none!important}::-webkit-scrollbar{display:none}html{scroll-behavior:auto!important}' });
  await p.evaluate(() => { const k = [...document.querySelectorAll('a,button,span,div')].find((x) => /^Открыть админку$/.test((x.textContent || '').trim())); if (k) { let e = k; while (e.parentElement && e.parentElement !== document.body && e.parentElement.getBoundingClientRect().height < 90) e = e.parentElement; e.style.display = 'none'; } }); };
(async () => {
  const b = await chromium.launch({ args: ['--lang=ru-RU'] });
  for (const [n, u] of MOBILE) { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ru-RU' }); const p = await ctx.newPage();
    await p.goto(u, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {}); await p.waitForTimeout(4000); await clean(p);
    await p.evaluate(async () => { for (let y = 0; y < 4200; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 160)); } scrollTo(0, 0); }); await p.waitForTimeout(1200); await clean(p);
    await p.screenshot({ path: path.join(OUT, n + '-top.jpg'), type: 'jpeg', quality: 90 });
    // длинная полоса: склеиваем экраны прокрутки, чтобы анимации появления успели отработать
    const shots = []; for (let i = 0; i < 4; i++) { await p.evaluate((y) => scrollTo(0, y), i * 844); await p.waitForTimeout(900); const f = path.join(OUT, `${n}-s${i}.jpg`); await p.screenshot({ path: f, type: 'jpeg', quality: 90 }); shots.push(f); }
    console.log('мобильная', n); await ctx.close(); }
  for (const [n, u] of DESKTOP) { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'ru-RU' }); const p = await ctx.newPage();
    await p.goto(u, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {}); await p.waitForTimeout(5000); await clean(p); await p.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 90 }); console.log('компьютер', n); await ctx.close(); }
  await b.close();
})();
