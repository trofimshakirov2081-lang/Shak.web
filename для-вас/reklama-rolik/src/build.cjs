// Сборка ролика 1080×1920: фоны с подписями (Playwright), телефон с кадрами (ffmpeg), музыка, склейка
const { chromium } = require('playwright'); const { execFileSync } = require('child_process'); const fs = require('fs');
const V = '/tmp/claude-0/-home-user/3120f746-a2da-5056-a1f1-afb773dcbf2a/scratchpad/vid/';
const OUT = process.argv[2];
const SC = [
  ['title', { t: 'title' }, null, 2.4],
  ['d1', { h: 'Любой дизайн', c: 'Премиум' }, 'd1'], ['d2', { h: 'Любой дизайн', c: 'Молодёжный' }, 'd2'], ['d3', { h: 'Любой дизайн', c: 'С анимацией' }, 'd3'],
  ['d4', { h: 'Любой дизайн', c: 'Нежный' }, 'd4'], ['d5', { h: 'Любой дизайн', c: 'Тёмный, строгий' }, 'd5'], ['d6', { h: 'Любой дизайн', c: 'Минимализм' }, 'd6'],
  ['admin', { h: 'Цены меняете <mark>сами</mark>', p: 'В своей админке, с телефона, за минуту' }, 'admin'],
  ['site', { h: 'И сразу <mark>на сайте</mark>', p: 'Без разработчика и без доплат' }, 'site'],
  ['promo', { h: 'Акции <mark>и скидки</mark>', p: 'С таймером, включаются сами по дате' }, 'promo'],
  ['promosite', { h: 'Акции <mark>и скидки</mark>', p: 'Старая цена зачёркнута, плашка сверху' }, 'promosite'],
  ['end', { t: 'end' }, null, 4.2],
];
const run = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args]);
(async () => {
  fs.mkdirSync(V + 'bg', { recursive: true }); fs.mkdirSync(V + 'clips', { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [n, q] of SC) { await p.goto('file://' + V + 'card.html?' + new URLSearchParams(q)); await p.waitForTimeout(400); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    if (q.h) await p.evaluate(() => { const h = document.querySelector('.cap h1'); let f = 78; while (h.scrollWidth > 960 && f > 50) { f -= 2; h.style.fontSize = f + 'px'; } });
    await p.screenshot({ path: V + 'bg/' + n + '.png' }); }
  // маска со скруглёнными углами для экрана телефона
  await p.setViewportSize({ width: 700, height: 1515 }); await p.setContent('<body style="margin:0;background:#000"><div style="width:700px;height:1515px;border-radius:62px;background:#fff"></div></body>'); await p.screenshot({ path: V + 'mask.png' });
  await b.close();
  const list = [];
  for (const [n, q, fr, dur] of SC) { const out = V + 'clips/' + n + '.mp4';
    if (!fr) run(['-loop', '1', '-t', String(dur), '-framerate', '25', '-i', V + 'bg/' + n + '.png', '-vf', `fade=in:st=0:d=0.25,fade=out:st=${dur - 0.25}:d=0.25,format=yuv420p`, '-r', '25', '-c:v', 'libx264', '-crf', '18', out]);
    else { const sec = (fs.readdirSync(V + 'frames/' + fr).length / 25).toFixed(2); run(['-loop', '1', '-t', sec, '-framerate', '25', '-i', V + 'bg/' + n + '.png', '-framerate', '25', '-i', V + 'frames/' + fr + '/%04d.jpg', '-i', V + 'mask.png',
      '-filter_complex', '[1:v]scale=700:1515,format=rgba[ph];[2:v]format=gray,scale=700:1515,loop=-1:1:0[m];[ph][m]alphamerge[pm];[0:v][pm]overlay=190:360:eof_action=pass,format=yuv420p', '-t', sec, '-r', '25', '-c:v', 'libx264', '-crf', '18', out]); }
    list.push("file '" + out + "'"); }
  fs.writeFileSync(V + 'list.txt', list.join('\n'));
  run(['-f', 'concat', '-safe', '0', '-i', V + 'list.txt', '-c', 'copy', V + 'silent.mp4']);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', V + 'silent.mp4']).toString());
  execFileSync('python3', ['-I', '/home/user/Shak.web/tools/video/music.py', V + 'music.wav', String(dur + 0.5), '2.4', '11']);
  run(['-i', V + 'silent.mp4', '-i', V + 'music.wav', '-filter_complex', `[1:a]volume=0.8,afade=t=in:st=0:d=0.4,afade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT]);
  console.log('готово', dur.toFixed(1), 'с ->', OUT);
})();
