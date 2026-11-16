// Создаёт страницы-обёртки: /courses/<slug>/ и разделы. Тот же код вызывает админка при публикации.
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, "assets/data.js"), "utf8"), ctx);
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/pages-lib.js"), "utf8"), ctx);
const pages = ctx.window.ALTYN_PAGES(ctx.window.SITE);
for (const p of pages) { fs.mkdirSync(path.dirname(path.join(root, p.path)), { recursive: true }); fs.writeFileSync(path.join(root, p.path), p.html); }
console.log("страниц:", pages.length);
