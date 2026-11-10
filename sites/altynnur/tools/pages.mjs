// Создаёт страницы-обёртки для превью на GitHub Pages: /courses/<slug>/ и разделы.
// В рабочей версии эти адреса отдаёт сервер, файл не нужен.
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, "assets/data.js"), "utf8"), ctx);
const S = ctx.window.SITE;
const head = (title, desc, rootRel) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F3EDE4"><meta name="robots" content="noindex">
<title>${title}</title><meta name="description" content="${desc}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:type" content="website"><meta property="og:image" content="${rootRel}ph/hero-eye-1280.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Ysabeau+Office:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${rootRel}assets/site.css"></head>`;
const page = (dir, pg, title, desc, extra = "", ld = "") => {
  const depth = dir ? dir.split("/").length : 0, r = "../".repeat(depth);
  const html = `${head(title, desc, r)}<body data-page="${pg}" data-root="${r}"${extra}><main id="main"></main>${ld}<script src="${r}assets/data.js"></script><script src="${r}assets/app.js"></script></body></html>\n`;
  fs.mkdirSync(path.join(root, dir), { recursive: true }); fs.writeFileSync(path.join(root, dir, "index.html"), html);
};
const org = { "@context": "https://schema.org", "@type": "EducationalOrganization", name: S.org.name, description: S.org.kind, telephone: S.org.phone, sameAs: [S.org.vk],
  address: { "@type": "PostalAddress", addressLocality: S.org.city, addressRegion: S.org.region, addressCountry: "RU" }, founder: { "@type": "Person", name: S.org.owner } };
page("", "home", "АлтынНур: учебный центр бьюти-профессий в Туймазах", "Обучение бьюти-профессиям в Туймазах: брови и ресницы, ногти, уход за лицом и волосами. Практика с преподавателем.", "", `<script type="application/ld+json">${JSON.stringify(org)}</script>`);
page("courses", "courses", "Курсы и цены | АлтынНур, Туймазы", "Все курсы АлтынНур с ценами: брови, ресницы, дизайн ногтей, педикюр, косметик-эстетист, ботокс и кератин для волос.");
for (const c of S.courses) {
  const ld = { "@context": "https://schema.org", "@type": "Course", name: c.name, description: c.short, provider: { "@type": "EducationalOrganization", name: S.org.name },
    offers: { "@type": "Offer", price: c.price, priceCurrency: "RUB", category: "Paid" } };
  page(`courses/${c.slug}`, "course", `${c.name}: обучение в Туймазах | АлтынНур`, `${c.short} Цена ${c.price.toLocaleString("ru-RU")} ₽. Учебный центр АлтынНур, Туймазы.`, ` data-slug="${c.slug}"`, `<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
}
page("about", "about", "Об академии | АлтынНур", "Учебный центр бьюти-профессий АлтынНур в Туймазах: подход к обучению и преподаватель Айгуль Алтынбаева.");
page("works", "works", "Работы учениц | АлтынНур", "Галерея работ учениц и преподавателя АлтынНур.");
page("training", "training", "Как проходит обучение | АлтынНур", "Как устроено обучение в АлтынНур: четыре шага от выбора направления до результата. Подбор курса за три вопроса.");
page("faq", "faq", "Частые вопросы | АлтынНур", "Ответы на частые вопросы об обучении в АлтынНур: с нуля, практика, материалы, оплата, адрес.");
page("contacts", "contacts", "Контакты | АлтынНур, Туймазы", "Телефон, WhatsApp и ВКонтакте учебного центра АлтынНур в Туймазах.");
page("privacy", "privacy", "Политика обработки персональных данных | АлтынНур", "Политика обработки персональных данных учебного центра АлтынНур.");
console.log("страниц:", 9 + S.courses.length);
