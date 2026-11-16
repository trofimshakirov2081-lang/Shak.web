// node cap.cjs page.html seconds outdir [t1,t2,...]  (последний аргумент: только эти секунды, для проверки)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const [page_, secs, out, only] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(page_)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const ts = only ? only.split(',').map(Number) : Array.from({ length: Math.round(secs * 30) }, (_, i) => i / 30);
  let n = 0;
  for (const t of ts) { await p.evaluate(t => window.seek(t), t); await p.screenshot({ path: `${out}/f${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
  await b.close(); console.log('frames', n);
})();
