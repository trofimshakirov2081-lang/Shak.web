// Серия коротких роликов для TikTok и Reels с учётом безопасных зон: node build3.cjs <папка вывода>
const { chromium } = require('playwright'); const { execFileSync } = require('child_process'); const fs = require('fs');
const V3 = '/tmp/claude-0/-home-user/3120f746-a2da-5056-a1f1-afb773dcbf2a/scratchpad/vid3/';
const FR = '/tmp/claude-0/-home-user/3120f746-a2da-5056-a1f1-afb773dcbf2a/scratchpad/vid/frames/';
const OUT = process.argv[2]; const FPS = 25;
const D = (c, n) => ['ph', { h: 'Дизайн <mark>любой</mark>', c }, n, 12, 25];
const VIDEOS = {
  '1-cena-za-minutu': { music: 'music', scenes: [['tx', 'h_price', 2.6], ['ph', { h: 'Открыл админку <mark>с телефона</mark>', p: 'Вписал новую цену и нажал «Опубликовать»' }, 'admin'], ['ph', { h: 'Через минуту <mark>на сайте</mark>', p: 'Без разработчика и без доплат' }, 'site'], ['tx', 'cta', 3.4]] },
  '2-problema-reshenie': { music: 'calm', scenes: [['tx', 'h_pain', 2.9], ['tx', 'pains', 4.6], ['tx', 'solution', 3.0], ['ph', { h: 'Цену меняете <mark>сами</mark>', p: 'Админка на телефоне: вписали и опубликовали' }, 'admin'], ['ph', { h: 'Через минуту <mark>на сайте</mark>', p: 'Без разработчика и без доплат' }, 'site'], ['tx', 'cta', 3.4]] },
  '3-akciya-sama': { music: 'music', scenes: [['tx', 'h_promo', 2.6], ['ph', { h: 'Скидка <mark>и таймер</mark>', p: 'Включили в админке, выключится сама по дате' }, 'promo'], ['ph', { h: 'Клиент видит <mark>выгоду</mark>', p: 'Старая цена зачёркнута, плашка с отсчётом' }, 'promosite'], ['tx', 'cta', 3.4]] },
  '4-ni-odnogo-shablona': { music: 'music', scenes: [['tx', 'h_design', 2.4], D('Премиум', 'd1'), D('Молодёжный', 'd2'), D('С анимацией', 'd3'), D('Нежный', 'd4'), D('Тёмный, строгий', 'd5'), D('Минимализм', 'd6'), ['tx', 'cta', 3.4]] },
};
const run = (a) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...a]);
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); for (const d of ['tf', 'bg', 'clips']) fs.mkdirSync(V3 + d, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setViewportSize({ width: 600, height: 1299 }); await p.setContent('<body style="margin:0;background:#000"><div style="width:600px;height:1299px;border-radius:52px;background:#fff"></div></body>'); await p.screenshot({ path: V3 + 'mask.png' }); await p.setViewportSize({ width: 1080, height: 1920 });
  const textDone = {};
  for (const [name, v] of Object.entries(VIDEOS)) {
    const list = [];
    for (let i = 0; i < v.scenes.length; i++) { const [type, a, fr, st, cnt] = v.scenes[i]; const out = V3 + 'clips/' + name + '-' + i + '.mp4';
      if (type === 'tx') { const dir = V3 + 'tf/' + a + '/', dur = fr;
        if (!textDone[a]) { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir); await p.goto('file://' + V3 + 'safe.html?s=' + a); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
          for (let k = 0; k < Math.round(dur * FPS); k++) { await p.evaluate((t) => window.at(t), k / FPS); await p.screenshot({ path: dir + String(k).padStart(4, '0') + '.jpg', type: 'jpeg', quality: 92 }); } textDone[a] = 1; }
        run(['-framerate', '25', '-i', dir + '%04d.jpg', '-vf', `fade=out:st=${(dur - 0.25).toFixed(2)}:d=0.25,format=yuv420p`, '-r', '25', '-c:v', 'libx264', '-crf', '18', out]);
        if (i === 0) fs.copyFileSync(dir + String(Math.round(dur * FPS) - 1).padStart(4, '0') + '.jpg', OUT + '/' + name + '-oblozhka.jpg'); }
      else { const bg = V3 + 'bg/' + name + '-' + i + '.png'; await p.goto('file://' + V3 + 'safe.html?' + new URLSearchParams(a)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200); await p.evaluate(() => { const h = document.querySelector('.cap h1'); if (!h) return; let f = 70; h.style.fontSize = f + 'px'; while (h.scrollWidth > 950 && f > 40) { f -= 2; h.style.fontSize = f + 'px'; } }); await p.screenshot({ path: bg });
        const total = fs.readdirSync(FR + fr).length, s0 = st || 0, c = cnt || total - s0, sec = (c / 25).toFixed(2);
        run(['-loop', '1', '-t', sec, '-framerate', '25', '-i', bg, '-framerate', '25', '-start_number', String(s0), '-i', FR + fr + '/%04d.jpg', '-i', V3 + 'mask.png',
          '-filter_complex', `[1:v]trim=end_frame=${c},setpts=PTS-STARTPTS,scale=600:1299,format=rgba[ph];[2:v]format=gray,loop=-1:1:0[m];[ph][m]alphamerge[pm];[0:v][pm]overlay=240:440:eof_action=pass,format=yuv420p`, '-t', sec, '-r', '25', '-c:v', 'libx264', '-crf', '18', out]); }
      list.push("file '" + out + "'"); }
    fs.writeFileSync(V3 + 'list.txt', list.join('\n')); const silent = V3 + name + '-silent.mp4';
    run(['-f', 'concat', '-safe', '0', '-i', V3 + 'list.txt', '-c', 'copy', silent]);
    const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', silent]).toString());
    const wav = V3 + name + '.wav';
    if (v.music === 'calm') execFileSync('python3', ['-I', '/home/user/Shak.web/tools/video/calm.py', wav, String(dur + 0.5), '5']);
    else execFileSync('python3', ['-I', '/home/user/Shak.web/tools/video/music.py', wav, String(dur + 0.5), '-', String(name.length * 7)]);
    run(['-i', silent, '-i', wav, '-filter_complex', `[1:a]volume=${v.music === 'calm' ? 0.9 : 0.7},afade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT + '/' + name + '.mp4']);
    fs.copyFileSync(silent, OUT + '/' + name + '-bez-muzyki.mp4');
    console.log(name, dur.toFixed(1) + ' с');
  }
  await b.close();
})();
