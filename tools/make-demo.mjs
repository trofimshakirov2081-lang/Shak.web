#!/usr/bin/env node
// Генератор персональных демо shak.web.
// Запуск: node tools/make-demo.mjs demos/_configs/bulochnaya-tani.json
// Без аргументов пересобирает все демо из demos/_configs/.
// Шаблоны в templates/ не меняются: каждое демо собирается в свою папку demos/<slug>/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NICHES = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/niches.json"), "utf8"));
const CONFIGS = path.join(ROOT, "demos/_configs");

const COLOR_NAMES = {
  "красный": "#D64545", "бордовый": "#7A1F2B", "вишнёвый": "#8E2340", "вишневый": "#8E2340",
  "розовый": "#E07A9A", "пудровый": "#E8B7B7", "пыльная роза": "#C98B8B", "малиновый": "#C2185B",
  "оранжевый": "#E8743B", "персиковый": "#F4A78B", "терракотовый": "#B5523B", "коралловый": "#F06F5B",
  "жёлтый": "#F2C14E", "желтый": "#F2C14E", "горчичный": "#D4A017", "золотой": "#C9A86A", "лимонный": "#F4E04D",
  "зелёный": "#3E8E5E", "зеленый": "#3E8E5E", "оливковый": "#7A7F3A", "мятный": "#8FD3C1", "изумрудный": "#1E7A5F", "шалфей": "#9CAF88",
  "голубой": "#7EC8E3", "синий": "#1F6BFF", "тёмно-синий": "#1B2A4A", "темно-синий": "#1B2A4A", "бирюзовый": "#2BB3A3",
  "фиолетовый": "#7A5C9E", "лавандовый": "#B9A6E0", "сиреневый": "#C3A6D8",
  "коричневый": "#6B4226", "шоколадный": "#5B3A29", "кофейный": "#6F4E37", "карамельный": "#C68E4E", "бежевый": "#E8D9C4",
  "молочный": "#FFF8EE", "кремовый": "#FFF4E0", "ванильный": "#FFF6DA", "белый": "#FFFFFF",
  "серый": "#8A8A8A", "графитовый": "#2E2E33", "чёрный": "#161616", "черный": "#161616"
};

const TRANSLIT = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",ә:"a",ғ:"g",қ:"k",ң:"n",ө:"o",ұ:"u",ү:"u",һ:"h",і:"i" };

function slugify(s) {
  return s.toLowerCase().split("").map(ch => TRANSLIT[ch] ?? ch).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "demo";
}

function fail(msg) { console.error("✖ " + msg); process.exit(1); }

function toHex(c) {
  if (!c) return null;
  const s = String(c).trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s.toUpperCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return ("#" + s.slice(1).split("").map(x => x + x).join("")).toUpperCase();
  if (COLOR_NAMES[s]) return COLOR_NAMES[s];
  fail(`Не понимаю цвет «${c}». Напишите HEX (#B5523B) или одно из: ${Object.keys(COLOR_NAMES).join(", ")}`);
}

function rgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function hex(a) { return "#" + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase(); }
function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); }
function lum(h) { return rgb(h).map(v => v / 255).reduce((s, v, i) => s + [0.299, 0.587, 0.114][i] * v, 0); }

// Цвета можно дать объектом {main, accent, bg, text} или списком от 1 до 4 цветов.
function resolveColors(input, fallback) {
  if (!input) return { ...fallback };
  let list = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[,;]| и /) : null;
  let c = list ? { main: list[0], accent: list[1], bg: list[2], text: list[3] } : { ...input };
  for (const k of Object.keys(c)) c[k] = c[k] ? toHex(c[k]) : null;
  if (!c.main) c.main = fallback.main;
  // Светлый первый цвет плохо смотрится на кнопках: делаем его фоном
  if (list && lum(c.main) > 0.8 && c.accent) { c.bg = c.bg || c.main; c.main = c.accent; c.accent = null; }
  c.accent = c.accent || mix(c.main, "#FFD27A", 0.55);
  c.bg = c.bg || mix(c.main, "#FFFFFF", 0.94);
  c.text = c.text || mix(c.main, "#000000", 0.82);
  return c;
}

function findNiche(n) {
  const s = String(n || "").trim().toLowerCase();
  if (NICHES[s]) return s;
  for (const [k, v] of Object.entries(NICHES)) if (v.aliases.includes(s)) return k;
  fail(`Неизвестная ниша «${n}». Есть: ${Object.entries(NICHES).map(([k, v]) => `${k} (${v.label})`).join(", ")}`);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

// Картинку из настроек копируем в demos/<slug>/img/, ссылки (http) и эмодзи оставляем как есть
function asset(file, cfgDir, outDir, name) {
  if (!file) return "";
  if (/^(https?:)?\/\//.test(file) || file.startsWith("data:")) return file;
  const src = path.resolve(cfgDir, file);
  if (!fs.existsSync(src)) fail(`Не найден файл ${file} (искал ${src})`);
  fs.mkdirSync(path.join(outDir, "img"), { recursive: true });
  const out = "img/" + name + path.extname(src).toLowerCase();
  fs.copyFileSync(src, path.join(outDir, out));
  return out;
}

function htmlEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

function build(cfgPath) {
  const cfgDir = path.dirname(path.resolve(cfgPath));
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8")); } catch (e) { fail(`Не читается ${cfgPath}: ${e.message}`); }
  if (!cfg.name) fail("В настройках нет name (название бизнеса)");
  if (!Array.isArray(cfg.items) || !cfg.items.length) fail("В настройках нет items (товары или услуги)");
  if (cfg.items.length > 12) fail("Слишком много товаров: для демо хватит 3-6");

  const nicheKey = findNiche(cfg.niche);
  const niche = NICHES[nicheKey];
  const template = cfg.template || "konditerskaya";
  const tplDir = path.join(ROOT, "templates", template);
  if (!fs.existsSync(tplDir)) fail(`Нет шаблона templates/${template}`);

  const slug = cfg.slug || slugify(cfg.name);
  const outDir = path.join(ROOT, "demos", slug);
  fs.rmSync(outDir, { recursive: true, force: true });
  copyDir(tplDir, outDir);
  fs.rmSync(path.join(outDir, "img"), { recursive: true, force: true });

  const c = cfg.contacts || {};
  const site = {
    id: "demo-" + slug,
    rev: new Date().toISOString(),
    brand: {
      name: cfg.name,
      tagline: cfg.tagline || niche.tagline,
      logo: asset(cfg.logo, cfgDir, outDir, "logo"),
      city: cfg.city || ""
    },
    hero: { ...niche.hero, ...(cfg.hero || {}) },
    sections: { ...niche.sections, ...(cfg.about ? { aboutText: cfg.about } : {}), ...(cfg.sections || {}) },
    features: cfg.features || niche.features,
    colors: resolveColors(cfg.colors, niche.colors),
    fonts: { ...niche.fonts, ...(cfg.fonts || {}) },
    currency: cfg.currency || "₸",
    items: cfg.items.map((it, i) => {
      if (!it.name) fail(`У товара №${i + 1} нет названия`);
      const price = Number(String(it.price ?? "").replace(/[^\d.]/g, ""));
      if (!price) fail(`У «${it.name}» нет цены`);
      return {
        id: "i" + (i + 1),
        name: it.name,
        desc: it.desc || "",
        price,
        emoji: it.emoji || niche.emoji[i % niche.emoji.length],
        photo: asset(it.photo, cfgDir, outDir, "item-" + (i + 1)),
        tag: it.tag || (i === 0 ? "Хит" : "")
      };
    }),
    contacts: {
      phone: c.phone || "+7 700 000 00 00",
      whatsapp: c.whatsapp ?? String(c.phone || "77000000000").replace(/\D/g, ""),
      telegram: c.telegram || "",
      instagram: c.instagram || "",
      address: c.address || "",
      hours: c.hours || "Ежедневно 9:00-21:00"
    },
    demo: { banner: cfg.demoBanner !== false, pin: String(cfg.pin || "1234") }
  };

  fs.writeFileSync(path.join(outDir, "data.js"),
    `// Собрано генератором shak.web из ${path.relative(ROOT, path.resolve(cfgPath))}. Правьте настройки и пересобирайте.\nwindow.SITE = ${JSON.stringify(site, null, 2)};\n`);

  for (const f of ["index.html", "admin.html"]) {
    const p = path.join(outDir, f);
    let h = fs.readFileSync(p, "utf8");
    const title = f === "admin.html" ? `Админка: ${site.brand.name}` : `${site.brand.name} | ${site.brand.tagline}`;
    h = h.replace(/<title>.*?<\/title>/, `<title>${htmlEsc(title)}</title>`);
    if (f === "index.html") {
      const desc = `${site.brand.name}${site.brand.city ? ", " + site.brand.city : ""}. ${site.hero.text}`;
      h = h.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${htmlEsc(desc)}">\n  <meta property="og:title" content="${htmlEsc(site.brand.name)}">\n  <meta property="og:description" content="${htmlEsc(site.hero.text)}">`);
    }
    fs.writeFileSync(p, h);
  }
  console.log(`✔ ${site.brand.name}: demos/${slug}/ (ниша ${niche.label}, ${site.items.length} поз., PIN ${site.demo.pin})`);
  return { slug, name: site.brand.name, niche: niche.label, city: site.brand.city, colors: site.colors, emoji: site.items[0].emoji };
}

// Витрина всех демо: demos/index.html
function gallery() {
  const list = fs.readdirSync(CONFIGS).filter(f => f.endsWith(".json")).sort().map(f => {
    const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS, f), "utf8"));
    const slug = cfg.slug || slugify(cfg.name);
    if (!fs.existsSync(path.join(ROOT, "demos", slug, "data.js"))) return null;
    const niche = NICHES[findNiche(cfg.niche)];
    return { slug, name: cfg.name, niche: niche.label, city: cfg.city || "", colors: resolveColors(cfg.colors, niche.colors), emoji: cfg.items[0].emoji || niche.emoji[0] };
  }).filter(Boolean);
  const cards = list.map(d => `      <a class="card" href="${d.slug}/" style="--m:${d.colors.main};--a:${d.colors.accent};--b:${d.colors.bg};--t:${d.colors.text}">
        <span class="pic">${htmlEsc(d.emoji)}</span>
        <strong>${htmlEsc(d.name)}</strong>
        <small>${htmlEsc(d.niche)}${d.city ? ", " + htmlEsc(d.city) : ""}</small>
      </a>`).join("\n");
  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Демо-сайты shak.web</title>
  <meta name="robots" content="noindex">
  <style>
    body { margin: 0; font: 16px/1.5 system-ui, sans-serif; background: #f5f5f7; color: #17171a; }
    .wrap { width: min(1000px, 100% - 32px); margin: 0 auto; padding: 40px 0 60px; }
    h1 { font-size: clamp(28px, 6vw, 44px); margin: 0 0 6px; }
    p { color: #6d6d76; margin: 0 0 28px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .card { display: grid; gap: 4px; padding: 18px; border-radius: 22px; background: var(--b); color: var(--t); text-decoration: none; border: 1px solid rgba(0,0,0,.06); }
    .pic { height: 120px; border-radius: 16px; display: grid; place-items: center; font-size: 56px; background: linear-gradient(135deg, var(--m), var(--a)); margin-bottom: 8px; }
    small { opacity: .7; }
    a.back { color: #1F6BFF; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Демо-сайты</h1>
    <p>Каждое демо собрано под конкретный бизнес. В каждом есть админка: откройте и поменяйте цену сами. <a class="back" href="../">← На главную shak.web</a></p>
    <div class="grid">
${cards}
    </div>
  </div>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, "demos/index.html"), html);
  console.log(`✔ Витрина demos/index.html: ${list.length} демо`);
}

const args = process.argv.slice(2);
const targets = args.length ? args : fs.readdirSync(CONFIGS).filter(f => f.endsWith(".json")).map(f => path.join(CONFIGS, f));
if (!targets.length) fail("Нет файлов настроек в demos/_configs/");
for (const t of targets) build(t);
gallery();
