/* АлтынНур v2: страницы собираются из window.SITE. Страница указана в <body data-page>, путь к корню в data-root. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  const S = window.SITE, D = document.body.dataset, R = D.root || "", PAGE = D.page || "home";
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rub = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₽";
  const has = (v) => Array.isArray(v) ? v.length > 0 : v != null && v !== "";
  const cat = (id) => S.categories.find((c) => c.id === id) || {};
  const course = (slug) => S.courses.find((c) => c.slug === slug);
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const wa = (t) => `https://wa.me/${S.org.wa}?text=${encodeURIComponent(t)}`;
  const WA_HELLO = "Здравствуйте! Хочу узнать об обучении в АлтынНур.";
  const cURL = (c) => `${R}courses/${c.slug}/`;
  const arrow = (t) => `<span>${esc(t)}</span><i aria-hidden="true"></i>`;
  // фото: две ширины, ленивая загрузка ниже первого экрана, проявление маской
  const ph = (src, alt, o = {}) => `<div class="ph${o.reveal === false ? "" : " rv"}${o.cls ? " " + o.cls : ""}"${o.style ? ` style="${o.style}"` : ""}>
    <img src="${R}${src}-1280.webp" srcset="${R}${src}-640.webp 640w, ${R}${src}-1280.webp 1280w${o.big ? `, ${R}${src}-1600.webp 1600w` : ""}" sizes="${o.sizes || "(max-width: 760px) 100vw, 50vw"}" alt="${esc(alt)}" ${o.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
    ${o.cap && S.preview ? `<span class="ph__cap">${esc(o.cap)}</span>` : ""}</div>`;
  const ILL = "Иллюстрация";
  const crumbs = (items) => `<button class="back" data-back type="button"><i aria-hidden="true"></i>Назад</button><nav class="crumbs" aria-label="Навигация"><a href="${R}">Главная</a>${items.map((i) => `<span aria-hidden="true">/</span>${i.href ? `<a href="${i.href}">${esc(i.t)}</a>` : `<span aria-current="page">${esc(i.t)}</span>`}`).join("")}</nav>`;

  /* ---------- цвет и шрифт: ?theme= и ?font=, затем выбор посетителя, затем значения по умолчанию из данных ---------- */
  const THEMES = [{ id: "gold", name: "Кость и золото (из брифа)", dot: "linear-gradient(90deg,#F8F4E9 50%,#D4AF37 50%)" },
    { id: "burgundy", name: "Кость и бордо", dot: "linear-gradient(90deg,#F3EDE4 50%,#7A2E3A 50%)" },
    { id: "night", name: "Ночное золото", dot: "linear-gradient(90deg,#151413 50%,#C9A45C 50%)" }];
  const FONTS = [{ id: "bona", name: "Bona Nova", ff: "'Bona Nova'" }, { id: "prata", name: "Prata", ff: "'Prata'" }, { id: "cormorant", name: "Cormorant (из брифа)", ff: "'Cormorant Garamond'" }];
  const pick = (key, list, def) => { let v = new URLSearchParams(location.search).get(key); try { v = v || localStorage.getItem("altyn-" + key); } catch (e) {} return list.some((t) => t.id === v) ? v : def; };
  const VIEWS = [{ id: "flow", name: "По дуге" }, { id: "tiles", name: "Плиткой" }];
  const ANIMS = [{ id: "calm", name: "Спокойная" }, { id: "soft", name: "Мягкая" }, { id: "live", name: "Живая" }];
  let THEME = pick("theme", THEMES, S.theme || "gold"), FONT = pick("font", FONTS, S.font || "bona"), VIEW = pick("view", VIEWS, S.coursesView || "flow"), ANIM = pick("anim", ANIMS, S.anim || "calm");
  document.documentElement.dataset.anim = ANIM;
  let MODE = new URLSearchParams(location.search).get("mode"); try { MODE = MODE || localStorage.getItem("altyn-mode"); } catch (e) {} MODE = MODE === "dark" ? "dark" : "light";
  document.documentElement.dataset.mode = MODE;
  const apply = (key, id) => { document.documentElement.dataset[key] = id; try { localStorage.setItem("altyn-" + key, id); } catch (e) {} document.querySelectorAll(`[data-${key}-set]`).forEach((b) => b.setAttribute("aria-pressed", b.getAttribute(`data-${key}-set`) === id)); };
  document.documentElement.dataset.theme = THEME; document.documentElement.dataset.font = FONT;

  /* ---------- контакты: каждый канал включается и меняется в админке ---------- */
  const CH = {
    phone: { t: "Телефон", href: (v) => "tel:+" + v.replace(/\D/g, ""), show: (v) => v },
    whatsapp: { t: "WhatsApp", href: (v) => `https://wa.me/${v.replace(/\D/g, "")}?text=${encodeURIComponent(WA_HELLO)}`, show: () => "Написать" },
    telegram: { t: "Telegram", href: (v) => "https://t.me/" + v.replace(/^@|https?:\/\/t\.me\//g, ""), show: (v) => "@" + v.replace(/^@|https?:\/\/t\.me\//g, "") },
    max: { t: "MAX", href: (v) => (/^https?:/.test(v) ? v : "https://max.ru/" + v.replace(/^@/, "")), show: () => "Написать" },
    vk: { t: "ВКонтакте", href: (v) => (/^https?:/.test(v) ? v : "https://vk.ru/" + v), show: (v) => v.replace(/^https?:\/\//, "") },
    instagram: { t: "Instagram", href: (v) => "https://instagram.com/" + v.replace(/^@/, ""), show: (v) => "@" + v.replace(/^@/, "") },
    email: { t: "Почта", href: (v) => "mailto:" + v, show: (v) => v }
  };
  const contactRows = () => S.contacts.filter((c) => c.on && has(c.value)).map((c) => {
    const k = CH[c.type]; if (!k) return "";
    return has(c.value) ? `<li><span>${k.t}</span><a href="${esc(k.href(c.value))}"${c.type === "phone" || c.type === "email" ? "" : ' target="_blank" rel="noopener"'}>${esc(k.show(c.value))}</a></li>`
      : `<li class="is-empty"><span>${k.t}</span><em>добавится в админке</em></li>`;
  }).join("");
  // карта: из ссылки Яндекс.Карт берём координаты (ll=, pt= или whatshere), иначе запасная точка
  const mapCoords = () => {
    const m = S.org.map || {}, l = m.link || "";
    const g = l.match(/(?:ll|pt|whatshere%5Bpoint%5D|whatshere\[point\])=([\d.]+)(?:%2C|,)([\d.]+)/);
    return g ? { lon: g[1], lat: g[2], z: m.zoom || 16 } : { lon: m.lon, lat: m.lat, z: m.zoom || 15 };
  };
  const mapHTML = () => {
    const c = mapCoords(), open = S.org.map.link || `https://yandex.ru/maps/?pt=${c.lon},${c.lat}&z=${c.z}&l=map`;
    return `<div class="map"><iframe title="Карта" src="https://yandex.ru/map-widget/v1/?ll=${c.lon}%2C${c.lat}&z=${c.z}&pt=${c.lon},${c.lat},pm2rdm" loading="lazy" allowfullscreen></iframe>
      <div class="map__bar"><span>${esc(S.org.address || `${S.org.city}, ${S.org.region}`)}${S.preview && !S.org.address ? " (точка временная)" : ""}</span><a href="${open}" target="_blank" rel="noopener">Открыть в Яндекс Картах</a></div></div>`;
  };

  /* ---------- шапка и подвал ---------- */
  const header = () => `${S.preview ? `<div class="draft"><div class="wrap"><p>Черновик для согласования: фото временные, цены предварительные.</p>
      <div class="pickers"><span>Цвет</span><span class="themes" role="group" aria-label="Цвет">${THEMES.map((t) => `<button data-theme-set="${t.id}" aria-pressed="${t.id === THEME}"><i style="background:${t.dot}"></i>${esc(t.name)}</button>`).join("")}</span>
      <span>Шрифт</span><span class="themes" role="group" aria-label="Шрифт">${FONTS.map((f) => `<button data-font-set="${f.id}" aria-pressed="${f.id === FONT}" style="font-family:${f.ff},serif;font-size:.95rem">${esc(f.name)}</button>`).join("")}</span>
      <span>Анимация</span><span class="themes" role="group" aria-label="Анимация">${ANIMS.map((a) => `<a href="?anim=${a.id}" data-anim-set="${a.id}" aria-pressed="${a.id === ANIM}" class="vbtn">${a.name}</a>`).join("")}</span>
      ${PAGE === "home" ? `<span>Курсы</span><span class="themes" role="group" aria-label="Вид курсов">${VIEWS.map((v) => `<a href="?view=${v.id}" data-view-set="${v.id}" aria-pressed="${v.id === VIEW}" class="vbtn">${v.name}</a>`).join("")}</span>` : ""}</div></div></div>` : ""}
    <header class="hdr"><div class="wrap hdr__in">
      <a class="logo" href="${R}" aria-label="${esc(S.org.name)}, на главную"><b>${esc(S.org.name)}</b><small>${esc(S.org.kind)}</small></a>
      <nav class="nav" id="nav" aria-label="Разделы"><div class="nav__links">${S.nav.map((n) => `<a href="${R}${n.href}"${n.page === PAGE || (PAGE === "course" && n.page === "courses") ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("")}</div>
        <div class="nav__extra"><a href="tel:+${S.org.wa}">${esc(S.org.phone)}</a><a href="${wa(WA_HELLO)}" target="_blank" rel="noopener">WhatsApp</a></div></nav>
      <button class="mode" data-mode-toggle aria-label="Тёмная или светлая тема" title="Тёмная тема"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path class="i-moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><g class="i-sun" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></svg></button>
      <button class="burger" aria-label="Меню" aria-expanded="false" aria-controls="nav"><span></span></button>
      <button class="btn btn--accent" data-enroll>Записаться</button>
    </div></header>`;
  const footer = () => `<footer class="ftr" id="contacts-ftr"><div class="wrap">
      <div class="ftr__grid">
        <div><h2 class="ftr__title">Связаться с нами</h2><ul class="ftr__contacts">${contactRows()}</ul></div>
        ${mapHTML()}
      </div>
      <div class="ftr__bottom"><nav aria-label="Разделы">${S.nav.map((n) => `<a href="${R}${n.href}">${esc(n.label)}</a>`).join("")}<a href="${R}faq/">Вопросы</a><a href="${R}privacy/">Политика данных</a></nav><span>© ${new Date().getFullYear()} ${esc(S.org.name)}, ${esc(S.org.city)}</span></div>
    </div></footer>`;

  /* ---------- блоки главной ---------- */
  const H = {};
  const srcset = (p) => `src="${R}${p}-1280.webp" srcset="${R}${p}-640.webp 640w, ${R}${p}-1280.webp 1280w"`;
  H.hero = () => `<section class="hero">
      <div class="hero__ph"><img src="${R}${S.hero.photo}-1600.webp" srcset="${R}${S.hero.photo}-640.webp 640w, ${R}${S.hero.photo}-1280.webp 1280w, ${R}${S.hero.photo}-1600.webp 1600w" sizes="(max-width: 860px) 100vw, 55vw" alt="${esc(S.hero.alt)}" fetchpriority="high">${S.preview ? `<span class="ph__cap">${ILL}</span>` : ""}</div>
      <div class="hero__t"><h1>${esc(S.hero.title)}</h1><p class="hero__text">${esc(S.hero.short)}</p>
        <div class="hero__row"><a class="btn btn--accent" href="${R}courses/">Посмотреть курсы</a><button class="link" data-quiz>${arrow("Подобрать за 3 вопроса")}</button></div></div>
    </section>`;
  // манифест: маленькие фото прямо внутри фразы, они раскрываются при прокрутке
  H.manifest = () => {
    const pics = S.manifest.inline;
    const html = esc(S.manifest.text).replace(/\{(\d)\}/g, (_, i) => { const p = pics[+i - 1]; return p ? `<span class="inl rv"><img ${srcset(p.src)} sizes="160px" alt="${esc(p.alt)}" loading="lazy"></span>` : ""; });
    return `<section class="sec manifest"><div class="wrap"><p class="manifest__q">${html}</p>
      <div class="manifest__sign"><span class="muted">${esc(S.org.owner)}, основательница</span><a class="link" href="${R}about/">${arrow("Об академии")}</a></div></div></section>`;
  };
  H.directions = () => `<section class="sec" style="padding-top:0"><div class="wrap">
      <h2 class="rv-t sec__h">Направления обучения</h2>
      <div class="dirs">${S.categories.map((c, i) => {
        const n = S.courses.filter((x) => x.cat === c.id).length;
        return `<a class="dir" href="${R}courses/?cat=${c.id}">${ph(c.photo, c.alt, { sizes: i ? "(max-width: 760px) 50vw, 40vw" : "(max-width: 760px) 100vw, 58vw" })}
          <div class="dir__t"><h3>${esc(c.name)}</h3><p>${esc(c.text)}</p><span class="link">${arrow(`${n} ${plural(n, "курс", "курса", "курсов")}`)}</span></div></a>`;
      }).join("")}</div></div></section>`;
  // курсы: «по дуге» (карусель) или «плиткой», вариант выбирается в админке
  H.featured = () => {
    const list = S.featured.map(course).filter(Boolean);
    if (VIEW === "tiles") return `<section class="sec" style="padding-top:0"><div class="wrap">
      <div class="flow-head"><h2 class="rv-t">Курсы и цены</h2><a class="link" href="${R}courses/">${arrow("Все курсы")}</a></div>
      <div class="ctiles">${S.courses.map((c) => `<a class="ctile" href="${cURL(c)}">${ph(c.photo, c.alt, { sizes: "(max-width: 760px) 50vw, 25vw" })}<div class="ctile__t"><span class="ctile__n">${esc(c.name)}</span><span class="chip-price">${rub(c.price)}</span></div></a>`).join("")}</div></div></section>`;
    return `<section class="sec flow-sec" style="padding-top:0">
      <div class="wrap flow-head"><h2 class="rv-t">Курсы и цены</h2><div class="flow-ctrl"><button class="flow-btn" data-flow="-1" aria-label="Предыдущий курс">‹</button><span class="flow-count" aria-live="polite">1 / ${list.length}</span><button class="flow-btn" data-flow="1" aria-label="Следующий курс">›</button></div></div>
      <div class="flow" tabindex="0" aria-label="Курсы, листайте влево и вправо">${list.map((c, i) => `<a class="fcard" href="${cURL(c)}"><span class="fcard__ph${i % 2 ? " is-low" : ""}"><img ${srcset(c.photo)} sizes="(max-width: 760px) 70vw, 340px" alt="${esc(c.alt)}" loading="lazy"></span>
        <span class="fcard__cat">${esc(cat(c.cat).name)}</span><span class="fcard__t">${esc(c.name)}</span><span class="price">${rub(c.price)}</span></a>`).join("")}</div>
      <div class="wrap flow-foot"><span class="swipe-hint" aria-hidden="true"><i></i>Листайте</span><a class="link" href="${R}courses/">${arrow("Все курсы")}</a></div></section>`;
  };
  // запись: такая же фото-плитка, как направления, с двумя кнопками
  H.enroll = () => `<section class="sec" style="padding-top:0"><div class="wrap"><div class="etile">${ph(S.enroll.photo, S.enroll.alt, { sizes: "100vw" })}
      <div class="etile__t"><h2>Запишитесь на консультацию</h2><p>Подскажем курс и ближайшие даты</p>
        <div class="etile__btns"><button class="btn btn--accent" data-enroll>Записаться</button><a class="btn btn--glass" href="${wa(WA_HELLO)}" target="_blank" rel="noopener">WhatsApp</a></div></div></div></div></section>`;
  // фото раскрывается на весь экран при прокрутке, соседние разлетаются в стороны
  H.zoom = () => `<section class="zoom" aria-label="Обучение на практике"><div class="zoom__stick">
      ${S.zoom.side.map((p, i) => `<span class="zoom__s zoom__s--${i + 1}"><img src="${R}${p.src}-640.webp" alt="" loading="lazy"><em>${esc(p.cap)}</em></span>`).join("")}
      <div class="zoom__c"><img ${srcset(S.zoom.main)} sizes="100vw" alt="${esc(S.zoom.alt)}" loading="lazy"></div>
      <div class="zoom__t"><span class="zoom__k">${esc(S.zoom.kicker)}</span><h2>${esc(S.zoom.title)}</h2><a class="btn btn--glass zoom__btn" href="${R}works/">Смотреть работы</a></div>
    </div></section>`;
  // преподаватель и преимущества: плитки с фото и короткими подписями
  H.teacher = () => `<section class="sec" style="padding-top:0"><div class="wrap">
      <h2 class="rv-t sec__h">Почему АлтынНур</h2>
      <div class="why">
        <a class="why__p" href="${R}about/">${has(S.teacher.photo) ? `<div class="ph"><img src="${R}${S.teacher.photo}" alt="${esc(S.teacher.name)}" loading="lazy"></div>` : `<div class="ph why__ph">${S.preview ? "<span>Здесь будет ваш портрет</span>" : ""}</div>`}
          <div class="dir__t"><span class="why__k">Ваш преподаватель</span><h3>${esc(S.teacher.name)}</h3><span class="link">${arrow("Об академии")}</span></div></a>
        ${S.advantages.map((a) => `<div class="why__a">${ph(a.photo, "", { sizes: "(max-width: 760px) 50vw, 22vw" })}<div class="dir__t"><h3>${esc(a.short)}</h3></div></div>`).join("")}
      </div></div></section>`;

  /* ---------- страницы ---------- */
  const P = {};
  P.home = () => S.home.map((b) => H[b] ? H[b]() : "").join("");
  P.courses = () => `<div class="wrap phead">${crumbs([{ t: "Курсы" }])}
      <h1>Курсы и цены</h1><p class="lead">${S.courses.length} программ в трёх направлениях. Цена указана за весь курс. Программу, длительность и ближайшие даты подскажем при записи.</p>
      <div class="filters" role="group" aria-label="Направление"><button class="chip" data-filter="all" aria-pressed="true">Все</button>${S.categories.map((c) => `<button class="chip" data-filter="${c.id}" aria-pressed="false">${esc(c.name)}</button>`).join("")}</div></div>
    <div class="wrap" id="spreads">${S.courses.map((c) => `<article class="spread" data-cat="${c.cat}">
        <a class="spread__ph zoom" href="${cURL(c)}" tabindex="-1" aria-hidden="true">${ph(c.photo, "", { sizes: "(max-width: 760px) 100vw, 45vw", style: "height:100%;border-radius:inherit" })}</a>
        <div><span class="cap">${esc(cat(c.cat).name)}</span><h2><a href="${cURL(c)}">${esc(c.name)}</a></h2><p class="lead">${esc(c.short)}</p>
          <ul class="spread__topics">${c.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          <div class="spread__act"><span class="price">${rub(c.price)}</span><a class="link" href="${cURL(c)}">${arrow("О курсе")}</a><button class="btn btn--line" data-enroll="${c.slug}">Записаться</button></div></div>
      </article>`).join("")}</div>
    <div class="wrap" style="padding-bottom:var(--sec)"><div class="help"><div><h3>Не знаете, что выбрать?</h3><p class="muted" style="margin-top:8px">Три вопроса, и мы покажем подходящие курсы. Телефон не нужен.</p></div><button class="btn btn--accent" data-quiz>Подобрать курс</button></div></div>`;
  P.course = () => {
    const c = course(D.slug);
    if (!c) return `<div class="wrap phead"><h1>Курс не найден</h1><p class="lead">Возможно, ссылка устарела.</p><p style="margin-top:28px"><a class="btn btn--accent" href="${R}courses/">Все курсы</a></p></div>`;
    document.title = `${c.name}: обучение в Туймазах | ${S.org.name}`;
    const L = c.layout || "split", cr = crumbs([{ t: "Курсы", href: `${R}courses/` }, { t: c.name }]);
    const text = `${cr}<span class="${L === "cover" ? "muted" : "cap"}">${esc(cat(c.cat).name)}</span><h1>${esc(c.name)}</h1><p class="${L === "cover" ? "" : "lead"}" style="max-width:46ch">${esc(c.short)}</p>
      <div class="chero__price"><span class="price">${rub(c.price)}</span><span class="${L === "cover" ? "muted" : "cap"}">за весь курс${S.preview ? ", цена предварительная" : ""}</span></div>
      <div class="chero__act"><button class="btn btn--accent" data-enroll="${c.slug}">Записаться на курс</button><a class="btn btn--line" href="${wa(`Здравствуйте! Меня заинтересовал курс «${c.name}» в учебном центре АлтынНур. Хотела бы узнать подробности.`)}" target="_blank" rel="noopener">Спросить в WhatsApp</a></div>`;
    const heroPh = ph(c.photo, c.alt, { reveal: false, eager: true, sizes: L === "cover" ? "100vw" : "(max-width: 860px) 100vw, 50vw", cap: ILL, style: L === "split" ? "height:100%" : "" });
    const hero = L === "cover" ? `<section class="chero chero--cover">${heroPh.replace('class="ph', 'class="ph chero__ph')}<div class="wrap chero__t">${text}</div></section>`
      : L === "frame" ? `<section class="wrap chero chero--frame">${heroPh.replace('class="ph', 'class="ph chero__ph')}<div>${text}</div></section>`
      : `<section class="chero chero--split">${heroPh.replace('class="ph', 'class="ph chero__ph')}<div class="chero__t">${text}</div></section>`;
    const facts = [["Длительность", c.duration], ["Учебных часов", c.hours], ["Группа", c.group], ["Практика на моделях", c.models], ["Материалы", c.materials], ["Документ после обучения", c.certificate]].filter((f) => has(f[1]));
    const faqs = S.faq.filter((f) => f.tags && f.tags.includes("course")).slice(0, 5);
    const others = S.courses.filter((x) => x.slug !== c.slug).sort((a, b) => (b.cat === c.cat) - (a.cat === c.cat)).slice(0, 4);
    return `${hero}
      <section class="sec"><div class="wrap learn"><h2 class="rv-t">Что изучите</h2><div><ul>${c.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        ${facts.length ? `<div class="facts" style="margin-top:40px">${facts.map((f) => `<div><span class="cap">${f[0]}</span><b>${esc(f[1])}</b></div>`).join("")}</div>` : S.preview ? `<p class="note">Программа по модулям, длительность, практика на моделях, материалы и документ после обучения появятся, когда Айгуль их подтвердит. Пока на сайте их нет: мы не придумываем условия.</p>` : ""}</div></div></section>
      <div class="pair">${c.photos.map((p, i) => ph(p.src, p.alt, { sizes: "(max-width: 700px) 50vw, 50vw", cap: i ? "" : ILL })).join("")}</div>
      <section class="sec"><div class="wrap">
        <div class="batch"><div><h2 style="font-size:var(--fs-h3)">Ближайшие даты</h2><p class="muted" style="margin-top:8px">${has(S.batches) ? "" : "Даты набора на этот курс уточняются. Оставьте заявку, и мы сообщим о старте."}</p></div><button class="btn btn--accent" data-enroll="${c.slug}">Узнать о наборе</button></div>
        <div class="two" style="margin-top:var(--sec)"><h2 class="rv-t">Вопросы о курсе</h2><div class="acc">${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p class="ans">${esc(f.a)}</p></details>`).join("")}</div></div>
      </div></section>
      <section class="sec" style="padding-top:0"><div class="wrap rail-head"><h2 class="rv-t">Другие курсы</h2><a class="link" href="${R}courses/">${arrow("Все курсы")}</a></div>
        <div class="rail">${others.map((o) => `<a class="rcard" href="${cURL(o)}">${ph(o.photo, o.alt, { sizes: "(max-width: 760px) 70vw, 26vw" })}<span class="rcard__cat">${esc(cat(o.cat).name)}</span><h3>${esc(o.name)}</h3><span class="price">${rub(o.price)}</span></a>`).join("")}</div></section>`;
  };
  P.about = () => `<div class="wrap phead">${crumbs([{ t: "Об академии" }])}<h1>${esc(S.org.name)}</h1><p class="lead">Название значит ${esc(S.org.meaning)}. ${esc(S.about.lead)}</p></div>
    <section class="sec" style="padding-top:0"><div class="wrap collage">${S.about.collage.map((p, i) => ph(p.src, p.alt, { sizes: i ? "(max-width: 760px) 60vw, 50vw" : "40vw", cap: i ? "" : ILL })).join("")}</div></section>
    <section class="sec" style="padding-top:0"><div class="wrap"><p class="big rv-t">Профессии осваивают руками. Поэтому у нас теория всегда рядом с практикой, а преподаватель рядом с ученицей.</p>
      <ul class="approach" style="margin-top:clamp(48px,6vw,90px)">${S.about.approach.map((a) => `<li><h3>${esc(a.t)}</h3><p class="muted">${esc(a.d)}</p></li>`).join("")}</ul>
      ${S.preview ? `<p class="note">Тексты о подходе предварительные, утвердим с Айгуль.</p>` : ""}</div></section>
    ${H.teacher()}
    <section class="enroll" style="padding:clamp(20px,3vw,40px) 0 var(--sec)"><div class="wrap"><div class="help" style="background:var(--ivory)"><div><h3>Посмотрите программы</h3><p class="muted" style="margin-top:8px">${S.courses.length} курсов: брови и ресницы, ногти, лицо и волосы.</p></div><a class="btn btn--accent" href="${R}courses/">Все курсы</a></div></div></section>`;
  P.works = () => {
    const ills = S.courses.flatMap((c) => [{ src: c.photo, alt: c.alt, cat: c.cat }].concat(c.photos.map((p) => ({ src: p.src, alt: p.alt, cat: c.cat })))).filter((p, i, a) => a.findIndex((x) => x.src === p.src) === i);
    const items = has(S.works) ? S.works : S.preview ? ills : [];
    return `<div class="wrap phead">${crumbs([{ t: "Работы" }])}<h1>Результаты, которые говорят сами за себя</h1>
      <div class="filters" role="group" aria-label="Направление"><button class="chip" data-filter="all" aria-pressed="true">Все</button>${S.categories.map((c) => `<button class="chip" data-filter="${c.id}" aria-pressed="false">${esc(c.name)}</button>`).join("")}</div></div>
      <section class="wrap" style="padding-bottom:var(--sec)">
      ${has(S.works) ? "" : `<div class="empty-works"><div><h2 style="font-size:var(--fs-h3)">Галерея работ появится после съёмки</h2><p class="muted" style="margin-top:12px">Здесь будут только настоящие работы учениц и преподавателя, подписанные и с согласия авторов:</p><ul><li>брови, ресницы, ногти, педикюр, уход, волосы;</li><li>сравнения «до и после»;</li><li>процесс обучения.</li></ul></div>
        <div><p class="muted">${S.preview ? "Ниже иллюстрации направлений, чтобы показать, как будет работать галерея. Это не работы АлтынНур." : ""}</p></div></div>`}
      <div class="masonry" id="gal">${items.map((p, i) => `<button data-cat="${p.cat}" data-i="${i}" aria-label="Открыть фото: ${esc(p.alt)}">${ph(p.src, p.alt, { sizes: "(max-width: 760px) 100vw, 33vw", cap: has(S.works) ? "" : ILL })}</button>`).join("")}</div>
      </section>
      <div class="lightbox" id="lb" role="dialog" aria-modal="true" aria-label="Просмотр фото"><button class="lb-btn lb-x" data-lb="x" aria-label="Закрыть">×</button><button class="lb-btn lb-p" data-lb="p" aria-label="Предыдущее">‹</button><figure style="margin:0"><img alt=""><p></p></figure><button class="lb-btn lb-n" data-lb="n" aria-label="Следующее">›</button></div>`;
  };
  P.training = () => `<div class="wrap phead">${crumbs([{ t: "Обучение" }])}<h1>Как проходит обучение</h1><p class="lead">Очно, в ${esc(S.org.cityIn)}, с преподавателем рядом. От первого вопроса до готового навыка четыре шага.</p></div>
    <section class="sec" style="padding-top:clamp(20px,3vw,40px)"><div class="wrap"><ol class="steps">${S.process.map((s, i) => `<li><span class="steps__n" aria-hidden="true">${i + 1}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join("")}</ol></div></section>
    <section class="sec" style="padding-top:0"><div class="wrap two"><h2 class="rv-t">Кому подойдёт</h2><div class="who">${S.audience.map((a) => `<div><h3>${esc(a.t)}</h3><p class="muted">${esc(a.d)}</p></div>`).join("")}</div></div></section>
    <div class="pair">${ph("ph/hair-2", "Работа с волосами в салоне", { cap: ILL })}${ph("ph/manicure", "Мастер ногтевого сервиса за работой")}</div>
    <section class="sec enroll" id="quiz"><div class="wrap quiz"><div><h2 class="rv-t">${esc(S.quiz.title)}</h2><p class="lead" style="margin-top:20px">${esc(S.quiz.text)}</p></div><div class="qbox" id="qbox" aria-live="polite"></div></div></section>`;
  P.faq = () => `<div class="wrap phead">${crumbs([{ t: "Вопросы" }])}<h1>Частые вопросы</h1><p class="lead">Не нашли ответ? Напишите нам в WhatsApp, ответит преподаватель.</p></div>
    <section class="wrap" style="padding-bottom:var(--sec)"><div class="two"><div><a class="btn btn--line" href="${wa(WA_HELLO)}" target="_blank" rel="noopener">Задать вопрос</a></div><div class="acc">${S.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p class="ans">${esc(f.a)}</p></details>`).join("")}</div></div></section>`;
  P.contacts = () => {
    const o = S.org;
    const rows = [["Телефон", `<a href="tel:+${o.wa}">${esc(o.phone)}</a>`], ["WhatsApp", `<a href="${wa(WA_HELLO)}" target="_blank" rel="noopener">Написать</a>`], ["ВКонтакте", `<a href="${o.vk}" target="_blank" rel="noopener">${esc(o.vkLabel)}</a>`],
      o.telegram ? ["Telegram", `<a href="${o.telegram}" target="_blank" rel="noopener">Написать</a>`] : null,
      ["Адрес", o.address ? esc(o.address) : `${esc(o.city)}, ${esc(o.region)}. Точный адрес сообщим при записи.`], o.hours ? ["Часы работы", esc(o.hours)] : null].filter(Boolean);
    return `<div class="wrap phead">${crumbs([{ t: "Контакты" }])}<h1>Будем рады видеть вас в ${esc(o.name)}</h1></div>
      <section class="wrap" style="padding-bottom:var(--sec)"><div class="two"><div><p class="muted">${esc(o.owner)}, основательница и преподаватель.</p></div><div><ul class="clines">${rows.map((r) => `<li><span>${r[0]}</span><div>${r[1]}</div></li>`).join("")}</ul>
        <h2 style="font-size:var(--fs-h3);margin:clamp(48px,6vw,80px) 0 22px">Задать вопрос</h2><div id="inlineForm"></div></div></div></section>`;
  };
  P.privacy = () => `<div class="wrap phead" style="max-width:860px">${crumbs([{ t: "Политика" }])}<h1 style="font-size:clamp(2rem,1.4rem + 2.4vw,3.2rem)">Политика обработки персональных данных</h1>
    <p class="ctx" style="margin:28px 0">Черновик. Заполним реквизитами оператора и проверим перед запуском. До этого документ не считается окончательным.</p>
    <div class="lead" style="display:grid;gap:16px;max-width:none;padding-bottom:var(--sec)">
      <p><b>Оператор:</b> [ФИО или наименование, ИНН, адрес: заполнит Айгуль].</p><p><b>Какие данные собираем:</b> имя, телефон, выбранный курс, способ связи, комментарий и ответы в подборе курса, если вы их указали.</p>
      <p><b>Зачем:</b> чтобы связаться с вами по заявке и рассказать об обучении.</p><p><b>Основание:</b> ваше согласие, которое вы даёте, отмечая галочку в форме.</p>
      <p><b>Где хранятся:</b> [на серверах в России, уточним при выборе хостинга].</p><p><b>Кому передаются:</b> [сервисы уведомлений, если будут].</p><p><b>Сколько хранятся:</b> [срок хранения заявок].</p>
      <p><b>Как отозвать согласие:</b> [почта для обращений] или WhatsApp ${esc(S.org.phone)}.</p></div></div>`;

  /* ---------- форма заявки ---------- */
  const formHTML = (c, extra) => `<form class="form" novalidate>
      ${c ? `<p class="ctx">Вы оставляете заявку на курс: ${esc(c.name)}</p>` : ""}${extra && extra.label ? `<p class="ctx">${esc(extra.label)}</p>` : ""}
      <div class="fld"><label for="fName">Ваше имя</label><input id="fName" name="name" autocomplete="name" maxlength="80"><span class="err"></span></div>
      <div class="fld"><label for="fPhone">Телефон</label><input id="fPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7" maxlength="20"><span class="err"></span></div>
      ${c ? `<input type="hidden" name="course" value="${c.slug}">` : `<div class="fld"><label for="fCourse">Курс</label><select id="fCourse" name="course"><option value="">Пока не выбрала, нужна консультация</option>${S.courses.map((x) => `<option value="${x.slug}">${esc(x.name)}</option>`).join("")}</select></div>`}
      <div class="fld"><label for="fWay">Как с вами связаться</label><select id="fWay" name="way"><option>WhatsApp</option><option>Звонок</option><option>Telegram</option></select></div>
      <div class="fld"><label for="fNote">Комментарий, если хотите</label><textarea id="fNote" name="note" maxlength="600"></textarea></div>
      <div class="hp" aria-hidden="true"><label>Не заполняйте <input name="website" tabindex="-1" autocomplete="off"></label></div>
      <label class="consent"><input type="checkbox" name="consent"><span>Согласна на обработку персональных данных по <a href="${R}privacy/" target="_blank">политике</a>.</span></label><span class="err" data-cerr></span>
      <button class="btn btn--accent" type="submit">Отправить заявку</button>
      ${S.preview ? `<p class="cap">В черновике заявка уходит через WhatsApp. В рабочей версии она сначала сохранится в админке, а Айгуль получит уведомление.</p>` : ""}</form>`;
  function validate(form, needConsent) {
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return null;
    let ok = true;
    const setErr = (name, msg) => { const f = form.querySelector(`[name=${name}]`).closest(".fld"); f.classList.toggle("has-err", !!msg); f.querySelector(".err").textContent = msg || ""; if (msg) ok = false; };
    setErr("name", (d.name || "").trim().length < 2 ? "Напишите, как к вам обращаться" : "");
    const dg = (d.phone || "").replace(/\D/g, "");
    setErr("phone", /^[78]\d{10}$/.test(dg) || /^9\d{9}$/.test(dg) ? "" : "Проверьте номер: нужно 11 цифр, например +7 927 123-45-67");
    if (needConsent) { const ce = form.querySelector("[data-cerr]"); ce.textContent = d.consent ? "" : "Без согласия мы не можем принять заявку"; if (!d.consent) ok = false; }
    if (!ok) { (form.querySelector(".has-err input") || form.querySelector("[name=consent]")).focus(); return null; }
    return d;
  }
  function send(d, extra) {
    const c = d.course && course(d.course);
    const text = [`Здравствуйте! Меня зовут ${d.name.trim()}.`, c ? `Меня заинтересовал курс «${c.name}» в учебном центре АлтынНур. Хотела бы узнать подробности.` : "Хочу узнать об обучении в АлтынНур и подобрать курс.",
      extra && extra.summary ? extra.summary : "", `Телефон: ${d.phone}.${d.way ? ` Удобнее: ${d.way}.` : ""}`, d.note ? `Комментарий: ${d.note.trim()}` : ""].filter(Boolean).join("\n");
    window.open(wa(text), "_blank", "noopener");
  }
  const okHTML = `<div class="ok"><div class="ok__mark" aria-hidden="true">✓</div><h3>Спасибо!</h3><p>Мы открыли WhatsApp с готовым сообщением, осталось нажать «Отправить». Мы свяжемся с вами по указанному номеру.</p></div>`;
  let lastFocus = null;
  function openModal(title, html, onReady) {
    const m = document.getElementById("modal");
    m.querySelector("h3").textContent = title; m.querySelector("#mBody").innerHTML = html;
    lastFocus = document.activeElement; m.classList.add("is-open"); document.documentElement.style.overflow = "hidden";
    if (onReady) onReady(m.querySelector("#mBody"));
    setTimeout(() => { const f = m.querySelector("#mBody button, #mBody input:not([type=hidden])"); if (f) f.focus(); }, 60);
  }
  function closeModal() { document.getElementById("modal").classList.remove("is-open"); document.documentElement.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  function bindForm(form, extra, target) {
    form.addEventListener("submit", (e) => { e.preventDefault(); const d = validate(form, true); if (!d) return; send(d, extra); target.innerHTML = okHTML; });
  }
  function openForm(slug, extra) {
    const c = slug && course(slug);
    openModal("Заявка на обучение", formHTML(c, extra), (b) => bindForm(b.querySelector("form"), extra, b));
  }

  /* ---------- квиз ---------- */
  function quiz(box) {
    const Q = S.quiz.questions, ans = {};
    let step = 0;
    const draw = () => {
      if (step >= Q.length) return result();
      const q = Q[step];
      box.innerHTML = `<div class="qprog"><span>Вопрос ${step + 1} из ${Q.length}</span><span class="qprog__bar"><i style="width:${(step / Q.length) * 100}%"></i></span></div>
        <div class="qstep"><h3>${esc(q.q)}</h3><div class="qopts">${q.a.map((a, i) => `<button class="qopt" data-i="${i}" aria-pressed="${!!ans[q.id] && ans[q.id].i === i}">${esc(a.t)}</button>`).join("")}</div></div>
        <div class="qnav">${step ? `<button class="link" data-back><span>Назад</span></button>` : "<span></span>"}<button class="btn btn--accent" data-next ${ans[q.id] ? "" : "disabled"}>${step === Q.length - 1 ? "Показать результат" : "Продолжить"}</button></div>`;
      box.querySelectorAll(".qopt").forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.i; ans[q.id] = { i, v: q.a[i].v, t: q.a[i].t };
        box.querySelectorAll(".qopt").forEach((x) => x.setAttribute("aria-pressed", x === b));
        box.querySelector("[data-next]").disabled = false;
      }));
      box.querySelector("[data-next]").addEventListener("click", () => { step++; draw(); });
      const back = box.querySelector("[data-back]"); if (back) back.addEventListener("click", () => { step--; draw(); });
    };
    const result = () => {
      const lv = ans.level.v, fm = ans.format.v;
      const picks = fm === "consult" ? [] : S.courses.map((c) => ({ c, s: (c.level.includes(lv) ? 2 : 0) + (c.format.includes(fm) ? 3 : 0) })).filter((x) => x.s >= 3).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.c);
      const summary = `Ответы в подборе курса: ${Q.map((q) => ans[q.id].t).join("; ")}.` + (picks.length ? ` Подошли: ${picks.map((p) => p.name).join(", ")}.` : "");
      box.innerHTML = `<div class="qprog"><span>Готово</span><span class="qprog__bar"><i style="width:100%"></i></span></div><div class="qstep">
        ${picks.length ? `<h3>Вам могут подойти</h3><div class="qres">${picks.map((p) => `<a href="${cURL(p)}"><img src="${R}${p.photo}-640.webp" alt=""><span>${esc(p.name)}</span><span class="price">${rub(p.price)}</span></a>`).join("")}</div>`
          : `<h3>Подберём курс вместе</h3><p class="lead" style="margin:12px 0 24px">По ответам сложно выбрать одно направление. Расскажем о программах и поможем определиться.</p>`}
        <p class="muted">Хотите узнать подробности об обучении? Оставьте номер, и мы поможем подобрать подходящий вариант.</p>
        <div class="qnav"><button class="link" data-again><span>Пройти заново</span></button><button class="btn btn--accent" data-lead>Оставить номер</button></div>
        <p class="cap" style="margin-top:14px">Это подсказка по вашим ответам, а не оценка способностей. Окончательно выбрать поможет преподаватель.</p></div>`;
      box.querySelector("[data-again]").addEventListener("click", () => { step = 0; for (const k in ans) delete ans[k]; draw(); });
      box.querySelector("[data-lead]").addEventListener("click", () => openForm(picks.length === 1 ? picks[0].slug : "", { label: "Ответы из подбора передадим вместе с заявкой.", summary }));
    };
    draw();
  }

  /* ---------- фильтр (каталог и работы) ---------- */
  function filters(listSel, itemSel) {
    const list = document.querySelector(listSel);
    if (!list) return;
    const apply = (c) => {
      document.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", b.dataset.filter === c));
      list.querySelectorAll(itemSel).forEach((r) => {
        const show = c === "all" || r.dataset.cat === c;
        if (show) { r.hidden = false; requestAnimationFrame(() => r.classList.remove("is-out")); }
        else { r.classList.add("is-out"); setTimeout(() => { if (r.classList.contains("is-out")) r.hidden = true; }, 350); }
      });
      const u = new URL(location.href); c === "all" ? u.searchParams.delete("cat") : u.searchParams.set("cat", c); history.replaceState(null, "", u);
    };
    document.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => apply(b.dataset.filter)));
    const start = new URLSearchParams(location.search).get("cat");
    if (start && S.categories.some((c) => c.id === start)) apply(start);
  }
  function lightbox() {
    const lb = document.getElementById("lb"), gal = document.getElementById("gal");
    if (!lb || !gal) return;
    let cur = 0;
    const items = () => [...gal.querySelectorAll("button:not([hidden])")];
    const show = (i) => { const it = items(); cur = (i + it.length) % it.length; const img = it[cur].querySelector("img"); lb.querySelector("img").src = img.currentSrc.replace("-640.", "-1280."); lb.querySelector("img").alt = img.alt; lb.querySelector("p").textContent = img.alt + (S.works.length ? "" : ". Иллюстрация, не работа АлтынНур."); };
    gal.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; show(items().indexOf(b)); lb.classList.add("is-open"); lb.querySelector(".lb-x").focus(); });
    lb.addEventListener("click", (e) => { const a = e.target.closest("[data-lb]"); if (!a && e.target !== lb) return; const k = a ? a.dataset.lb : "x"; if (k === "x") lb.classList.remove("is-open"); else show(cur + (k === "n" ? 1 : -1)); });
    document.addEventListener("keydown", (e) => { if (!lb.classList.contains("is-open")) return; if (e.key === "Escape") lb.classList.remove("is-open"); if (e.key === "ArrowRight") show(cur + 1); if (e.key === "ArrowLeft") show(cur - 1); });
  }

  /* ---------- сборка ---------- */
  const main = document.getElementById("main");
  main.innerHTML = (P[PAGE] || P.home)();
  main.insertAdjacentHTML("beforebegin", header());
  main.insertAdjacentHTML("afterend", footer() + `<div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle"><div class="modal__box"><div class="modal__top"><h3 id="mTitle"></h3><button class="x" data-close aria-label="Закрыть">×</button></div><div id="mBody"></div></div></div>`);

  const html = document.documentElement, burger = document.querySelector(".burger");
  burger.addEventListener("click", () => { const o = html.classList.toggle("menu-open"); burger.setAttribute("aria-expanded", o); html.style.overflow = o ? "hidden" : ""; });
  document.addEventListener("click", (e) => {
    const th = e.target.closest("[data-theme-set]"), fo = e.target.closest("[data-font-set]");
    if (th) { apply("theme", th.dataset.themeSet); return; }
    if (fo) { apply("font", fo.dataset.fontSet); return; }
    const an = e.target.closest("[data-anim-set]");
    if (an) { try { localStorage.setItem("altyn-anim", an.dataset.animSet); } catch (er) {} return; }
    const vw = e.target.closest("[data-view-set]");
    if (vw) { try { localStorage.setItem("altyn-view", vw.dataset.viewSet); } catch (er) {} return; }
    if (e.target.closest("[data-mode-toggle]")) { MODE = MODE === "dark" ? "light" : "dark"; document.documentElement.dataset.mode = MODE; try { localStorage.setItem("altyn-mode", MODE); } catch (er) {} return; }
    const en = e.target.closest("[data-enroll]");
    if (en) { e.preventDefault(); html.classList.remove("menu-open"); openForm(en.dataset.enroll || ""); return; }
    if (e.target.closest("[data-quiz]")) {
      e.preventDefault();
      if (document.getElementById("qbox")) { document.getElementById("quiz").scrollIntoView({ behavior: "smooth" }); return; }
      openModal("Подбор курса", `<div id="qboxM" aria-live="polite"></div>`, (b) => quiz(b.querySelector("#qboxM")));
      return;
    }
    if (e.target.closest("[data-close]") || e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.getElementById("modal").classList.contains("is-open")) closeModal(); });
  const qf = document.querySelector("[data-quick]");
  if (qf) qf.addEventListener("submit", (e) => { e.preventDefault(); const d = validate(qf, false); if (!d) return; openForm("", { label: `${d.name.trim()}, ${d.phone}: осталось подтвердить согласие и выбрать курс.` }); const m = document.getElementById("modal"); m.querySelector("[name=name]").value = d.name; m.querySelector("[name=phone]").value = d.phone; });
  const inl = document.getElementById("inlineForm");
  if (inl) { inl.innerHTML = formHTML(null); bindForm(inl.querySelector("form"), null, inl); }
  const qb = document.getElementById("qbox"); if (qb) quiz(qb);
  filters("#spreads", ".spread"); filters("#gal", "button"); lightbox();

  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // «Назад»: возвращает туда, откуда пришли, на то же место страницы
  const KEY = "altyn-scroll:" + location.pathname + location.search;
  const save = () => { try { sessionStorage.setItem(KEY, String(scrollY)); } catch (e) {} };
  addEventListener("pagehide", save);
  document.addEventListener("click", (e) => { if (e.target.closest("a[href]")) save(); }, true);
  const nav = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]) || {};
  if (nav.type === "back_forward") { try { const y = +sessionStorage.getItem(KEY); if (y) { history.scrollRestoration = "manual"; requestAnimationFrame(() => scrollTo(0, y)); setTimeout(() => scrollTo(0, y), 250); } } catch (e) {} }
  document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => {
    let same = false; try { same = document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    if (same && history.length > 1) history.back(); else location.href = R || "./";
  }));

  // карусель курсов: ближняя карточка в центре, соседние уходят по дуге назад
  const flow = document.querySelector(".flow");
  if (flow) {
    const cards = [...flow.querySelectorAll(".fcard")], count = document.querySelector(".flow-count");
    let cur = 0;
    const paint = () => {
      const mid = flow.scrollLeft + flow.clientWidth / 2;
      let best = 0, bd = 1e9;
      cards.forEach((c, i) => {
        const d = (c.offsetLeft + c.offsetWidth / 2 - mid) / c.offsetWidth, a = Math.min(Math.abs(d), 2.2);
        if (Math.abs(d) < bd) { bd = Math.abs(d); best = i; }
        if (RM) return;
        c.style.transform = `translateZ(${-a * 140}px) rotateY(${Math.max(-50, Math.min(50, -d * 32))}deg) scale(${1 - a * 0.06})`;
        c.style.opacity = String(1 - Math.min(a, 1.6) * 0.38);
        c.style.zIndex = String(10 - Math.round(a * 3));
      });
      if (best !== cur || !count.dataset.init) { cur = best; count.dataset.init = 1; count.textContent = `${cur + 1} / ${cards.length}`; cards.forEach((c, i) => c.classList.toggle("is-cur", i === cur)); }
    };
    let raf = 0;
    flow.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); }, { passive: true });
    addEventListener("resize", paint);
    const go = (i) => { i = Math.max(0, Math.min(cards.length - 1, i)); const c = cards[i]; flow.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - flow.clientWidth / 2, behavior: RM ? "auto" : "smooth" }); };
    document.querySelectorAll("[data-flow]").forEach((b) => b.addEventListener("click", () => go(cur + +b.dataset.flow)));
    flow.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); } });
    paint();
    // подсказка «листайте»: один раз слегка качнём карусель, когда она появится на экране
    if (!RM && "IntersectionObserver" in window) {
      const hint = new IntersectionObserver((es) => { if (es[0].isIntersecting) { hint.disconnect(); setTimeout(() => { flow.scrollBy({ left: 70, behavior: "smooth" }); setTimeout(() => flow.scrollBy({ left: -70, behavior: "smooth" }), 650); }, 400); } }, { threshold: 0.6 });
      hint.observe(flow);
    }
  }
  // лента фото: ряды сдвигаются навстречу друг другу вместе с прокруткой страницы
  const ribbon = document.querySelector(".ribbon");
  if (ribbon && !RM) {
    const rows = [...ribbon.querySelectorAll(".ribbon__row")];
    let rq = 0;
    const move = () => { rq = 0; const r = ribbon.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const p = (innerHeight - r.top) / (innerHeight + r.height); rows.forEach((row) => { const max = row.scrollWidth / 2 - innerWidth * 0.6; row.style.transform = `translate3d(${(row.dataset.dir > 0 ? -max + p * max * 0.9 : -p * max * 0.9)}px,0,0)`; }); };
    addEventListener("scroll", () => { if (!rq) rq = requestAnimationFrame(move); }, { passive: true });
    move();
  }
  const zoom = document.querySelector("section.zoom");
  if (zoom && !RM) {
    const st = zoom.querySelector(".zoom__stick"); let zq = 0;
    const zmove = () => { zq = 0; const r = zoom.getBoundingClientRect(), span = r.height - innerHeight; if (r.bottom < 0 || r.top > innerHeight) return;
      const p = Math.max(0, Math.min(1, -r.top / span)); st.style.setProperty("--p", p.toFixed(4)); st.classList.toggle("is-open", p > 0.55); };
    addEventListener("scroll", () => { if (!zq) zq = requestAnimationFrame(zmove); }, { passive: true }); addEventListener("resize", zmove); zmove();
  } else if (zoom) zoom.classList.add("is-static");
  /* ---------- спокойные анимации ---------- */
  // заголовки секций проявляются по словам, снизу из-под маски
  document.querySelectorAll(".phead h1, .chero h1").forEach((h) => h.classList.add("rv-t"));
  document.querySelectorAll("h2.rv-t, h1.rv-t").forEach((h) => { let i = 0; h.innerHTML = h.textContent.split(" ").map((w) => `<span class="w"><span style="--i:${i++}">${esc(w)}</span></span>`).join(" "); h.classList.add("rv-w"); });
  // плитки в сетках появляются по очереди
  document.querySelectorAll(".dirs, .why, .ctiles, .masonry, .approach, .steps, .who, .collage, .rail").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--d", i * 110 + "ms")));
  if (!RM) {
    // фото внутри плиток чуть медленнее страницы: лёгкая глубина
    const par = [...document.querySelectorAll(".hero__ph, .dir .ph, .why .ph, .etile .ph, .ctile .ph, .chero__ph, .spread__ph .ph, .pair .ph, .collage .ph")];
    par.forEach((el) => el.classList.add("par"));
    // шапка прячется, когда листают вниз, и возвращается, когда листают вверх; тонкая полоска показывает, сколько прочитано
    const hdr = document.querySelector(".hdr"); let lastY = scrollY, pq = 0;
    const tick = () => { pq = 0; const vh = innerHeight;
      par.forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return; const k = (r.top + r.height / 2 - vh / 2) / vh; el.style.setProperty("--py", (k * -7).toFixed(2) + "%"); });
      const y = scrollY, max = document.documentElement.scrollHeight - vh;
      hdr.style.setProperty("--sp", max > 0 ? (y / max).toFixed(4) : 0);
      if (!html.classList.contains("menu-open")) hdr.classList.toggle("is-hidden", y > lastY && y > 320);
      lastY = y; };
    addEventListener("scroll", () => { if (!pq) pq = requestAnimationFrame(tick); }, { passive: true }); tick();
  }
  document.querySelectorAll(".acc").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--d", i * 60 + "ms")));
  const seen = [...document.querySelectorAll(".steps>li, .approach>li, .who>div, .acc details, .spread>div:last-child")];
  if ("IntersectionObserver" in window) { const so = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-seen"); so.unobserve(en.target); } }), { rootMargin: "0px 0px -6% 0px" }); seen.forEach((el) => so.observe(el)); } else seen.forEach((el) => el.classList.add("is-seen"));
  // «Живая»: плитки всплывают, когда попадают в экран
  if (ANIM === "live" && "IntersectionObserver" in window) {
    const po = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-pop"); po.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".dirs>*, .why>*, .ctiles>*, .masonry>*").forEach((el) => po.observe(el));
  } else document.querySelectorAll(".dirs>*, .why>*, .ctiles>*, .masonry>*").forEach((el) => el.classList.add("is-pop"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".rv, .rv-t").forEach((el) => io.observe(el));
  } else document.querySelectorAll(".rv, .rv-t").forEach((el) => el.classList.add("is-in"));
})();
