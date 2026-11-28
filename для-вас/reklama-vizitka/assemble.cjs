// Полная сборка: рендер сцен, склейка, звук по событиям на экране, MP4 1080×1920 30 fps.
// node assemble.cjs [full|short] [--norender]
const { chromium } = require('playwright'); const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const MODE = process.argv[2] || 'full', NORENDER = process.argv.includes('--norender');
const SC = {
  full: [['s1-hook.html', 3.6], ['s2-design.html', 8.75], ['s3-admin.html', 7.6], ['s3v.html?v=photo', 4.8], ['s3v.html?v=promo', 4.8], ['s3v.html?v=look', 4.8], ['s3v.html?v=block', 4.8], ['s4-business.html', 8.75], ['s5-final.html', 6.6]],
  short: [['s1-hook.html', 3.6], ['s3-admin.html', 7.6], ['s5-final.html', 6.6]],
}[MODE];
const R = path.join(__dirname, 'render'); const clip = (s) => path.join(R, 'clips', s.replace(/[?=]/g, '_').replace('.html', '') + '.mp4');
(async () => {
  fs.mkdirSync(path.join(R, 'clips'), { recursive: true });
  if (!NORENDER) for (const [s, d] of SC) { execFileSync('node', [path.join(__dirname, 'render.cjs'), s, String(d), clip(s)], { stdio: 'inherit' }); }
  // моменты событий из сцен (window.TIMES)
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); const TM = {};
  for (const [s] of SC) { await p.goto('file://' + path.join(__dirname, 'scenes', s)); TM[s] = await p.evaluate(() => window.TIMES || {}); } await b.close();
  const ev = [], sections = []; let t = 0;
  const add = (tt, k, prm) => ev.push(prm === undefined ? [+tt.toFixed(3), k] : [+tt.toFixed(3), k, prm]);
  for (const [s, d] of SC) { const T = TM[s];
    if (t > 0) { const chapter = !s.includes('s3v'); if (chapter) { add(t, 'revcym', .9); add(t, 'drop', .2); add(t, 'impact'); } else { add(t, 'whoosh', .45); } }
    if (s === 's1-hook.html') { add(t + .04, 'impact'); add(t + .06, 'whoosh', .7); add(t + .55, 'swish'); add(t + 1.25, 'whoosh', .45); add(t + 1.3, 'note', 72); add(t + 1.75, 'swish'); }
    if (s === 's2-design.html') { T.works.forEach((w, i) => { add(t + w, 'whoosh', .45); add(t + w + .3, 'note', [72, 75, 77, 80][i]); }); add(t + T.grid, 'swish'); add(t + T.grid + .1, 'shimmer'); add(t + T.grid + .75, 'swish'); }
    if (s === 's3-admin.html') { const b0 = t + .9; add(b0 + 57 / 30, 'click'); [72, 75, 77, 80, 84].forEach((m, k) => { add(b0 + (63 + 4 * k) / 30, 'note', m); add(b0 + (63 + 4 * k) / 30, 'click'); });
      const pub = b0 + 98 / 30; add(pub, 'click'); add(pub + .1, 'pop'); add(pub + .15, 'whoosh', .6); add(pub + .7, 'pop'); add(pub + .72, 'success'); add(pub + .8, 'chime'); add(pub + 1.0, 'whoosh', .9); add(pub + 1.15, 'pop'); }
    if (s.includes('s3v')) { add(t + T.publish, 'click'); add(t + T.publish + .1, 'pop'); add(t + T.publish + .1, 'whoosh', .45); add(t + T.change, 'success'); add(t + T.change + .1, 'chime'); add(t + T.publish + .8, 'pop'); (T.extra || []).forEach((x, i) => add(t + x, 'note', [80, 84][i])); }
    if (s === 's4-business.html') { add(t + T.send, 'click'); add(t + T.send + .05, 'pop'); add(t + T.send - .2, 'whoosh', .6); add(t + T.note, 'chime'); add(t + T.note + .02, 'pop');
      add(t + T.benefits - .2, 'whoosh', .5); [0, 1, 2].forEach((i) => { add(t + T['b' + i], 'swish'); add(t + T['b' + i] + .25, 'note', [72, 77, 84][i]); }); }
    if (s === 's5-final.html') { add(t + .2, 'impact'); add(t + .75, 'swish'); add(t + 2.0, 'whoosh', .5); add(t + 2.25, 'swish'); add(t + 3.0, 'whoosh', .6); add(t + 3.8, 'pop'); add(t + 3.82, 'shimmer'); add(t + 5.2, 'click'); }
    t += d; }
  const total = t, finalStart = total - SC[SC.length - 1][1];
  sections.push([0, SC[0][1], 'tension'], [SC[0][1], finalStart, 'groove'], [finalStart, total, 'resolve']);
  const plan = path.join(R, MODE + '-plan.json'); fs.writeFileSync(plan, JSON.stringify({ dur: +total.toFixed(2), bpm: 104, seed: 7, sections, events: ev }));
  const wav = path.join(R, MODE + '.wav'); execFileSync('python3', ['-I', path.join(__dirname, '..', '..', 'tools', 'video', 'score2.py'), wav, plan], { stdio: 'inherit' });
  fs.writeFileSync(path.join(R, 'list.txt'), SC.map(([s]) => `file '${clip(s)}'`).join('\n'));
  const silent = path.join(R, MODE + '-silent.mp4'); execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(R, 'list.txt'), '-c', 'copy', silent]);
  const out = path.join(__dirname, MODE === 'full' ? 'shakweb-reklama-55s.mp4' : 'shakweb-reklama-18s.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  console.log('готово', out, total.toFixed(1) + ' с, событий звука', ev.length);
})();
