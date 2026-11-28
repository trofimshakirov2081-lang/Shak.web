// Рендер сцены в MP4 30 fps: node render.cjs <сцена.html> <секунды> <выход.mp4> [кадр-превью-секунды...]
const { chromium } = require('playwright'); const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const [scene, secs, out, ...stills] = process.argv.slice(2); const FPS = 30;
(async () => {
  const dir = path.join(__dirname, 'render', 'frames', path.basename(scene, '.html')); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, 'scenes', scene)); await p.evaluate(() => window.ready()); await p.waitForTimeout(300);
  const total = Math.round(+secs * FPS);
  for (let i = 0; i < total; i++) { await p.evaluate((t) => window.seek(t), i / FPS); await p.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 93 }); }
  for (const s of stills) { await p.evaluate((t) => window.seek(t), +s); await p.screenshot({ path: out.replace(/\.mp4$/, `-${s}.png`) }); }
  await b.close(); if (errs.length) console.log('ошибки сцены:', errs.join('; '));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-r', String(FPS), out]);
  console.log('готово', out, total, 'кадров');
})();
