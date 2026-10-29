// Видео сайта на экране ноутбука: плавная прокрутка сверху вниз, кадр за кадром.
// node tools/record-desktop.cjs <slug> [px за кадр]   (нужен http-server на 8080, playwright, ffmpeg)
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
(async () => {
  const slug = process.argv[2], step = +(process.argv[3] || 16), FPS = 30;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rec-"));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:8080/demos/" + slug + "/", { waitUntil: "networkidle" });
  await p.addStyleTag({ content: ".c-demo{display:none!important}html{scroll-behavior:auto!important}::-webkit-scrollbar{display:none}" });
  await p.waitForTimeout(1200);
  let n = 0;
  const shot = async () => { await p.screenshot({ path: path.join(dir, String(n++).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 88 }); };
  const hold = async s => { for (let i = 0; i < s * FPS; i++) { await shot(); await p.waitForTimeout(20); } };
  const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await hold(1.5);
  // Мягкий разгон и торможение, иначе скорость постоянная
  let y = 0, v = 0;
  while (y < H) {
    v = Math.min(step, v + .6); y = Math.min(H, y + v);
    await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(18); await shot();
  }
  await hold(2);
  await b.close();
  const out = path.join("raboty/v", slug + ".mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"), "-vf", "scale=1280:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(dir, "00010.jpg"), "-vf", "scale=1280:-2", "-q:v", "5", out.replace(/\.mp4$/, ".jpg")]);
  fs.rmSync(dir, { recursive: true });
  console.log(slug, (fs.statSync(out).size / 1e6).toFixed(1) + " MB", (n / FPS).toFixed(1) + " s");
})();
