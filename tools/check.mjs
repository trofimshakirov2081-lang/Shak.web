#!/usr/bin/env node
// Проверка всех сайтов в репозитории.
// node tools/check.mjs              статические проверки + браузер (если есть Playwright)
// node tools/check.mjs --external   ещё и внешние ссылки (Instagram, Telegram, демо на Netlify)
// node tools/check.mjs demos/bulochnaya-tani   только одна папка
// Отчёт: reports/check-report.md, скриншоты с телефона: reports/screens/
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const EXTERNAL = args.includes("--external");
const ONLY = args.filter(a => !a.startsWith("--"));
const SKIP = new Set([".git", "node_modules", "reports", ".claude", "_configs"]);
const LONG_DASH = "\u2014";

const issues = []; // { page, level: "ошибка" | "внимание", text }
const add = (page, level, text) => issues.push({ page, level, text });

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const pages = (ONLY.length ? ONLY.flatMap(o => {
  const p = path.resolve(ROOT, o);
  return fs.statSync(p).isDirectory() ? walk(p) : [p];
}) : walk(ROOT)).sort();
const rel = p => path.relative(ROOT, p).split(path.sep).join("/");

function resolveLocal(fromFile, url) {
  const clean = url.split("#")[0].split("?")[0];
  if (!clean) return fromFile;
  let target = clean.startsWith("/") ? path.join(ROOT, clean) : path.resolve(path.dirname(fromFile), decodeURIComponent(clean));
  if (clean.endsWith("/") || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, "index.html");
  return target;
}

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

// 1. Статика: ссылки, мета-теги, длинные тире
const externalLinks = new Map();
for (const file of pages) {
  const page = rel(file);
  const html = fs.readFileSync(file, "utf8");
  if (!/<meta[^>]+name="viewport"/i.test(html)) add(page, "ошибка", "Нет meta viewport: на телефоне страница будет мелкой");
  if (!/<title>[^<]+<\/title>/i.test(html)) add(page, "внимание", "Пустой или отсутствующий <title>");
  if (!/<html[^>]+lang=/i.test(html)) add(page, "внимание", "У <html> не указан lang");
  for (const m of html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/gi)) add(page, "внимание", `Картинка без alt: ${m[0].slice(0, 80)}`);
  if (visibleText(html).includes(LONG_DASH)) add(page, "внимание", "В тексте есть длинное тире, замените на точку, двоеточие или дефис");

  // Тексты, которые рисует JS, лежат в соседних .js файлах
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/gi)) {
    if (/^(https?:)?\/\//.test(m[1])) continue;
    const js = resolveLocal(file, m[1]);
    if (fs.existsSync(js) && fs.readFileSync(js, "utf8").includes(LONG_DASH)) add(page, "внимание", `Длинное тире в ${rel(js)}`);
  }

  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/gi)) {
    const url = m[1].trim();
    if (/^(mailto:|tel:|javascript:|data:)/i.test(url) || url.includes("${") || url.includes("' +")) continue;
    if (/^(https?:)?\/\//i.test(url)) {
      if (!/fonts\.(googleapis|gstatic)\.com/.test(url)) {
        if (!externalLinks.has(url)) externalLinks.set(url, new Set());
        externalLinks.get(url).add(page);
      }
      continue;
    }
    if (url.startsWith("#")) {
      const id = url.slice(1);
      if (id && !new RegExp(`id=["']${id}["']`).test(html) && !html.includes(`href="#${id}"`)) add(page, "внимание", `Якорь ${url} не найден на странице`);
      continue;
    }
    const target = resolveLocal(file, url);
    if (!fs.existsSync(target)) add(page, "ошибка", `Битая ссылка: ${url}`);
  }
}

// 2. Внешние ссылки (по флагу --external)
async function checkExternal() {
  for (const [url, from] of externalLinks) {
    const full = url.startsWith("//") ? "https:" + url : url;
    try {
      const ctrl = AbortSignal.timeout(12000);
      let r = await fetch(full, { method: "HEAD", redirect: "follow", signal: ctrl });
      if (r.status === 405 || r.status === 403) r = await fetch(full, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(12000) });
      // Instagram и Telegram часто отвечают 429/403 роботам, это не значит, что ссылка битая
      const soft = /instagram\.com|t\.me|wa\.me|ig\.me/.test(full);
      if (r.status >= 400) add([...from].join(", "), soft ? "внимание" : "ошибка", `Внешняя ссылка отвечает ${r.status}: ${url}`);
    } catch (e) {
      add([...from].join(", "), "внимание", `Не удалось открыть ${url}: ${e.cause?.code || e.name}`);
    }
  }
}

// 3. Браузер: ошибки JS, вылезание за экран телефона, скриншоты
async function loadPlaywright() {
  try { return await import("playwright"); } catch {}
  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
    return createRequire(path.join(globalRoot, "noop.js"))("playwright");
  } catch { return null; }
}

function serve() {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".ico": "image/x-icon" };
  const server = http.createServer((req, res) => {
    let p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    if (p.endsWith("/") || (fs.existsSync(p) && fs.statSync(p).isDirectory())) p = path.join(p, "index.html");
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

async function checkBrowser() {
  const pw = await loadPlaywright();
  if (!pw) { add("все", "внимание", "Playwright не найден: проверка на телефоне пропущена (npm i -g playwright)"); return false; }
  const exe = ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  let browser;
  try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { browser = await pw.chromium.launch(); }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const shots = path.join(ROOT, "reports/screens");
  fs.rmSync(shots, { recursive: true, force: true });
  fs.mkdirSync(shots, { recursive: true });

  for (const file of pages) {
    const page = rel(file);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ru-RU" });
    const tab = await ctx.newPage();
    const errors = new Set();
    tab.on("pageerror", e => errors.add("Ошибка JS: " + e.message));
    tab.on("console", m => { if (m.type() === "error" && !/favicon\.ico/.test(m.location().url || "") && !/fonts\.g|Failed to load resource: net::ERR_(TUNNEL|PROXY|NAME|CONNECTION|INTERNET|CERT)/.test(m.text())) errors.add("Консоль: " + m.text().slice(0, 160) + (m.location().url ? " (" + m.location().url.replace(base, "/") + ")" : "")); });
    tab.on("response", r => { if (r.url().startsWith(base) && !r.url().endsWith("/favicon.ico") && r.status() >= 400) errors.add(`Файл не найден (${r.status()}): ${r.url().replace(base, "/")}`); });
    try {
      await tab.goto(base + page, { waitUntil: "load", timeout: 20000 });
      await tab.waitForTimeout(700);
      const m = await tab.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const wide = [...document.querySelectorAll("body *")].filter(el => {
          const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
          if (!r.width || cs.position === "fixed" || el.closest("[aria-hidden=true]")) return false;
          let p = el.parentElement;
          while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return false; p = p.parentElement; }
          return r.right > W + 1 || r.left < -1;
        }).slice(0, 3).map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""));
        const small = [...document.querySelectorAll("a, button, input, select, textarea, p, li, span")].filter(el => {
          const r = el.getBoundingClientRect();
          return r.width && r.height && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 12;
        }).length;
        return { scroll: document.documentElement.scrollWidth, W, wide, small, text: document.body.innerText };
      });
      if (m.scroll > m.W + 1) add(page, "ошибка", `На телефоне страница шире экрана (${m.scroll}px при ${m.W}px)${m.wide.length ? ": " + m.wide.join(", ") : ""}`);
      if (m.small > 3) add(page, "внимание", `Мелкий текст меньше 12px: ${m.small} элементов`);
      if (m.text.includes(LONG_DASH)) add(page, "внимание", "На странице видно длинное тире");
      const name = page.replace(/\//g, "__").replace(/\.html$/, "");
      await tab.screenshot({ path: path.join(shots, name + ".png") });
      await tab.screenshot({ path: path.join(shots, name + "__full.png"), fullPage: true });
    } catch (e) {
      add(page, "ошибка", "Страница не открылась: " + e.message.split("\n")[0]);
    }
    for (const e of errors) add(page, "ошибка", e);
    await ctx.close();
  }
  await browser.close();
  server.close();
  return true;
}

if (EXTERNAL) await checkExternal();
const browserOk = await checkBrowser();

const errs = issues.filter(i => i.level === "ошибка"), warns = issues.filter(i => i.level === "внимание");
const byPage = {};
for (const i of issues) (byPage[i.page] ||= []).push(i);
let md = `# Отчёт проверки сайтов\n\nДата: ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })} (Алматы)\n\n`;
md += `Страниц: ${pages.length}. Ошибок: ${errs.length}. Замечаний: ${warns.length}.\n`;
md += `Внешние ссылки: ${EXTERNAL ? "проверены" : "не проверялись (запустите с --external)"}. Вид на телефоне (390px): ${browserOk ? "проверен, скриншоты в reports/screens/" : "не проверен"}.\n\n`;
md += `## Проверенные страницы\n\n${pages.map(p => `- ${byPage[rel(p)] ? "⚠️" : "✅"} ${rel(p)}`).join("\n")}\n\n`;
if (issues.length) {
  md += "## Что найдено\n\n";
  for (const [p, list] of Object.entries(byPage)) {
    md += `### ${p}\n\n${list.map(i => `- **${i.level}**: ${i.text}`).join("\n")}\n\n`;
  }
} else md += "Всё чисто 🎉\n";
fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "reports/check-report.md"), md);
console.log(md);
process.exit(errs.length ? 1 : 0);
