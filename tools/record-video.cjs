// Видео для портфолио: сайт на экране телефона листается сверху вниз, по пути нажимаются живые элементы.
// node tools/record-video.cjs raboty/videos.json [slug]   (нужны playwright, ffmpeg и запущенный http-server на 8080)
// В videos.json: [{ "slug": "...", "steps": [["селектор", "click", номер], ["селектор", "range", 0.8], ["селектор", "drag", [0.5, 0.9, 0.2]]] }]
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const FPS = 25, BASE = "http://localhost:8080/demos/";

async function record(job, outDir) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rec-"));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  await p.goto(BASE + job.slug + "/", { waitUntil: "networkidle" }).catch(() => {});
  await p.addStyleTag({ content: ".c-demo{display:none!important}html{scroll-behavior:auto!important}::-webkit-scrollbar{display:none}" });
  // Заранее проходим страницу, чтобы ленивые картинки успели загрузиться
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } scrollTo(0, 0); });
  await p.evaluate(() => document.fonts.ready);
  await p.reload({ waitUntil: "networkidle" }).catch(() => {});
  await p.addStyleTag({ content: ".c-demo{display:none!important}html{scroll-behavior:auto!important}::-webkit-scrollbar{display:none}" });

  let n = 0;
  const shot = () => p.screenshot({ path: path.join(dir, String(n++).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 86 });
  const hold = async s => { for (let i = 0; i < s * FPS; i++) { await shot(); await p.waitForTimeout(15); } };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const scrollTo = async y => {
    const [from, max] = await p.evaluate(() => [scrollY, document.documentElement.scrollHeight - innerHeight]);
    const to = Math.max(0, Math.min(max, Math.round(y))), d = Math.abs(to - from);
    const frames = Math.max(6, Math.round(d / 420 * FPS * 1.1));
    for (let i = 1; i <= frames; i++) { await p.evaluate(v => window.scrollTo(0, v), from + (to - from) * ease(i / frames)); await shot(); }
  };
  const centerOf = async loc => { const r = await loc.evaluate(e => { const b = e.getBoundingClientRect(); return b.top + scrollY + b.height / 2; }); return r - 844 * .55; };

  await hold(job.intro || 1.8);
  for (const [sel, kind, arg] of job.steps || []) {
    const loc = p.locator(sel).nth(kind === "click" ? arg : 0);
    if (!(await loc.count())) { console.warn("  нет элемента", sel); continue; }
    await scrollTo(await centerOf(loc));
    await hold(.4);
    if (kind === "click") { await loc.click({ force: true }).catch(e => console.warn("  ", e.message)); await hold(.9); }
    if (kind === "range") {
      const [min, max, cur] = await loc.evaluate(e => [+e.min, +e.max, +e.value]);
      const to = min + (max - min) * arg;
      for (let i = 1; i <= 30; i++) { await loc.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }, cur + (to - cur) * ease(i / 30)); await shot(); }
      await hold(.8);
    }
    if (kind === "drag") {
      const bx = await loc.boundingBox(), y = bx.y + bx.height / 2;
      let x = bx.x + bx.width * .5;
      await p.mouse.move(x, y); await p.mouse.down();
      for (const f of arg) { const tx = bx.x + bx.width * f; for (let i = 1; i <= 18; i++) { await p.mouse.move(x + (tx - x) * ease(i / 18), y); await shot(); } x = tx; }
      await p.mouse.up(); await hold(.6);
    }
  }
  const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await scrollTo(H);
  await hold(1.2);
  await b.close();
  const out = path.join(outDir, job.slug + ".mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%04d.jpg"),
    "-vf", "scale=540:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(dir, "0005.jpg"), "-vf", "scale=540:-2", "-q:v", "6", out.replace(/\.mp4$/, ".jpg")]);
  fs.rmSync(dir, { recursive: true });
  console.log(job.slug, (fs.statSync(out).size / 1e6).toFixed(1) + " MB", (n / FPS).toFixed(1) + " s");
}

(async () => {
  const [file, only] = process.argv.slice(2);
  const jobs = JSON.parse(fs.readFileSync(file, "utf8")).filter(j => !only || j.slug === only);
  const outDir = path.join(path.dirname(file), "v");
  fs.mkdirSync(outDir, { recursive: true });
  for (const j of jobs) await record(j, outDir);
})();
