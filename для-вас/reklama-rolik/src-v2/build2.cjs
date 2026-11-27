// Ролик v2 «проблема → решение → доказательство → предложение»: текстовые сцены с появлением строк, сцены с телефоном, спокойная музыка
const { chromium } = require('playwright'); const { execFileSync } = require('child_process'); const fs = require('fs');
const V2 = '/tmp/claude-0/-home-user/3120f746-a2da-5056-a1f1-afb773dcbf2a/scratchpad/vid2/';
const V1 = '/tmp/claude-0/-home-user/3120f746-a2da-5056-a1f1-afb773dcbf2a/scratchpad/vid/';
const OUT = process.argv[2]; const FPS = 25;
// [имя, тип, параметры, длительность для текста | кадры телефона]
const SC = [
  ['hook', 'text', 3.4], ['pains', 'text', 6.4], ['solution', 'text', 3.6],
  ['admin', 'phone', { h: 'Цену меняете <mark>сами</mark>', p: 'Админка на телефоне: вписали и опубликовали' }, 'admin'],
  ['site', 'phone', { h: 'Через минуту <mark>на сайте</mark>', p: 'Без разработчика и без доплат' }, 'site'],
  ['promo', 'phone', { h: 'Запустили <mark>акцию</mark>', p: 'Скидка и таймер. Выключится сама по дате' }, 'promo'],
  ['promosite', 'phone', { h: 'Клиент видит <mark>выгоду</mark>', p: 'Старая цена зачёркнута, плашка с отсчётом' }, 'promosite'],
  ['d1', 'phone', { h: 'Дизайн <mark>под вас</mark>', c: 'Премиум' }, 'd1', 12, 26], ['d2', 'phone', { h: 'Дизайн <mark>под вас</mark>', c: 'Молодёжный' }, 'd2', 12, 26],
  ['d3', 'phone', { h: 'Дизайн <mark>под вас</mark>', c: 'С анимацией' }, 'd3', 12, 26], ['d4', 'phone', { h: 'Дизайн <mark>под вас</mark>', c: 'Нежный' }, 'd4', 12, 26],
  ['process', 'text', 5.8], ['offer', 'text', 5.2],
];
const run = (a) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...a]);
(async () => {
  for (const d of ['bg', 'clips', 'tf']) fs.mkdirSync(V2 + d, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [n, type, a, fr] of SC) {
    if (type === 'text') { const dir = V2 + 'tf/' + n + '/'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
      await p.goto('file://' + V2 + 'scenes.html?s=' + n); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
      const total = Math.round(a * FPS); for (let i = 0; i < total; i++) { await p.evaluate((t) => window.at(t), i / FPS); await p.screenshot({ path: dir + String(i).padStart(4, '0') + '.jpg', type: 'jpeg', quality: 92 }); } }
    else { await p.goto('file://' + V1 + 'card.html?' + new URLSearchParams(a)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250); await p.evaluate(() => { const h = document.querySelector('.cap h1'); let f = 78; while (h.scrollWidth > 960 && f > 48) { f -= 2; h.style.fontSize = f + 'px'; } }); await p.screenshot({ path: V2 + 'bg/' + n + '.png' }); }
  }
  await b.close();
  const list = [];
  for (const [n, type, a, fr, start, count] of SC) { const out = V2 + 'clips/' + n + '.mp4';
    if (type === 'text') { const dur = a; run(['-framerate', '25', '-i', V2 + 'tf/' + n + '/%04d.jpg', '-vf', `fade=out:st=${(dur - 0.3).toFixed(2)}:d=0.3,format=yuv420p`, '-r', '25', '-c:v', 'libx264', '-crf', '18', out]); }
    else { const total = fs.readdirSync(V1 + 'frames/' + fr).length, st = start || 0, cnt = count || total - st, sec = (cnt / 25).toFixed(2);
      run(['-loop', '1', '-t', sec, '-framerate', '25', '-i', V2 + 'bg/' + n + '.png', '-framerate', '25', '-start_number', String(st), '-i', V1 + 'frames/' + fr + '/%04d.jpg', '-i', V1 + 'mask.png',
        '-filter_complex', `[1:v]trim=end_frame=${cnt},setpts=PTS-STARTPTS,scale=700:1515,format=rgba[ph];[2:v]format=gray,scale=700:1515,loop=-1:1:0[m];[ph][m]alphamerge[pm];[0:v][pm]overlay=190:360:eof_action=pass,format=yuv420p`, '-t', sec, '-r', '25', '-c:v', 'libx264', '-crf', '18', out]); }
    list.push("file '" + out + "'"); }
  fs.writeFileSync(V2 + 'list.txt', list.join('\n'));
  run(['-f', 'concat', '-safe', '0', '-i', V2 + 'list.txt', '-c', 'copy', V2 + 'silent.mp4']);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', V2 + 'silent.mp4']).toString());
  execFileSync('python3', ['-I', '/home/user/Shak.web/tools/video/calm.py', V2 + 'calm.wav', String(dur + 0.5), '3']);
  run(['-i', V2 + 'silent.mp4', '-i', V2 + 'calm.wav', '-filter_complex', `[1:a]volume=0.9,afade=t=out:st=${(dur - 1.5).toFixed(2)}:d=1.5[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT]);
  console.log('готово', dur.toFixed(1), 'с ->', OUT);
})();
