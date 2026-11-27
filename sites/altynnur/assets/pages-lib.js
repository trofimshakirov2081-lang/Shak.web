/* Страницы-обёртки сайта АлтынНур: /courses/<slug>/ и разделы.
   Общий код для tools/pages.mjs (сборка на компьютере) и админки (публикация через GitHub). */
/* версия кода сайта: меняется при правках кода, чтобы браузер не держал старые app.js и site.css; данные из админки грузятся без кеша */
const VER = "20261127b";
(function (g) {
  "use strict";
  function buildPages(S) {
  const out = [];
  // всё, что пришло из админки, экранируется: кавычки и теги в названии курса не ломают страницу
  const A = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const J = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const head = (title, desc, rootRel) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F3EDE4"><meta name="robots" content="${S.preview ? "noindex" : "index,follow"}">
<title>${A(title)}</title><meta name="description" content="${A(desc)}">
<meta property="og:title" content="${A(title)}"><meta property="og:description" content="${A(desc)}"><meta property="og:type" content="website"><meta property="og:image" content="${rootRel}ph/hero-eye-1280.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:wght@800;900&family=Onest:wght@400;500;600&family=Cormorant+Garamond:wght@500;600&family=Prata&family=Bona+Nova:wght@400;700&family=Ysabeau+Office:wght@400;500;600&family=Finlandica:wght@400;500;600&family=Arsenal:wght@400;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<link rel="stylesheet" href="${rootRel}assets/site.css?v=${VER}"></head>`;
const page = (dir, pg, title, desc, extra = "", ld = "") => {
  const depth = dir ? dir.split("/").length : 0, r = "../".repeat(depth);
  const html = `${head(title, desc, r)}<body data-page="${pg}" data-root="${r}"${extra}><main id="main"></main>${ld}<script>document.write('<script src="${r}assets/data.js?v=' + Date.now() + '"><\\/script>')</script><script src="${r}assets/app.js?v=${VER}"></script></body></html>\n`;
  out.push({ path: (dir ? dir + "/" : "") + "index.html", html });
};
const org = { "@context": "https://schema.org", "@type": "EducationalOrganization", name: S.org.name, description: S.org.kind, telephone: S.org.phone, sameAs: [S.org.vk],
  address: { "@type": "PostalAddress", addressLocality: S.org.city, addressRegion: S.org.region, addressCountry: "RU" }, founder: { "@type": "Person", name: S.org.owner } };
page("", "home", "АлтынНур: учебный центр бьюти-профессий в Туймазах", "Обучение бьюти-профессиям в Туймазах: брови и ресницы, ногти, уход за лицом и волосами. Практика с преподавателем.", "", `<script type="application/ld+json">${J(org)}</script>`);
page("courses", "courses", "Курсы и цены | АлтынНур, Туймазы", "Все курсы АлтынНур с ценами: брови, ресницы, дизайн ногтей, педикюр, косметик-эстетист, ботокс и кератин для волос.");
for (const c of S.courses) { if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(c.slug || "")) continue; // адрес только из латиницы, цифр и дефиса
  const ld = { "@context": "https://schema.org", "@type": "Course", name: c.name, description: c.short, provider: { "@type": "EducationalOrganization", name: S.org.name },
    offers: { "@type": "Offer", price: c.price, priceCurrency: "RUB", category: "Paid" } };
  page(`courses/${c.slug}`, "course", `${c.name}: обучение в Туймазах | АлтынНур`, `${c.short || ""}${Number(c.price) > 0 ? " Цена " + Number(c.price).toLocaleString("ru-RU") + " ₽." : ""} Учебный центр АлтынНур, Туймазы.`.trim(), ` data-slug="${c.slug}"`, `<script type="application/ld+json">${J(ld)}</script>`);
}
page("about", "about", "Об академии | АлтынНур", "Учебный центр бьюти-профессий АлтынНур в Туймазах: подход к обучению и преподаватель Айгуль Алтынбаева.");
page("works", "works", "Работы учениц | АлтынНур", "Галерея работ учениц и преподавателя АлтынНур.");
page("training", "training", "Как проходит обучение | АлтынНур", "Как устроено обучение в АлтынНур: четыре шага от выбора направления до результата. Подбор курса за три вопроса.");
page("faq", "faq", "Частые вопросы | АлтынНур", "Ответы на частые вопросы об обучении в АлтынНур: с нуля, практика, материалы, оплата, адрес.");
page("contacts", "contacts", "Контакты | АлтынНур, Туймазы", "Телефон, WhatsApp и ВКонтакте учебного центра АлтынНур в Туймазах.");
page("privacy", "privacy", "Политика обработки персональных данных | АлтынНур", "Политика обработки персональных данных учебного центра АлтынНур.");
  return out;
  }
  g.ALTYN_PAGES = buildPages;
})(typeof window !== "undefined" ? window : globalThis);
