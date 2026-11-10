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
  const crumbs = (items) => `<nav class="crumbs" aria-label="Навигация"><a href="${R}">Главная</a>${items.map((i) => `<span aria-hidden="true">/</span>${i.href ? `<a href="${i.href}">${esc(i.t)}</a>` : `<span aria-current="page">${esc(i.t)}</span>`}`).join("")}</nav>`;

  /* ---------- шапка и подвал ---------- */
  const header = () => `${S.preview ? `<div class="draft"><div class="wrap">Черновик для согласования. Фото временные (иллюстрации), цены предварительные. Работы, отзывы и данные о преподавателе добавим после материалов от Айгуль. <a href="${R}palettes.html">Цветовые варианты</a></div></div>` : ""}
    <header class="hdr"><div class="wrap hdr__in">
      <a class="logo" href="${R}" aria-label="${esc(S.org.name)}, на главную"><b>${esc(S.org.name)}</b><small>${esc(S.org.kind)}</small></a>
      <nav class="nav" id="nav" aria-label="Разделы">${S.nav.map((n) => `<a href="${R}${n.href}"${n.page === PAGE || (PAGE === "course" && n.page === "courses") ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("")}
        <div class="nav__extra"><a href="tel:+${S.org.wa}">${esc(S.org.phone)}</a><a href="${wa(WA_HELLO)}" target="_blank" rel="noopener">Написать в WhatsApp</a></div></nav>
      <button class="burger" aria-label="Меню" aria-expanded="false" aria-controls="nav"><span></span></button>
      <button class="btn btn--accent" data-enroll>Записаться</button>
    </div></header>`;
  const footer = () => `<footer class="ftr"><div class="wrap">
      <div class="ftr__grid">
        <div class="ftr__brand"><b>${esc(S.org.name)}</b><p>${esc(S.org.kind)}. ${esc(S.org.city)}, ${esc(S.org.region)}. Название значит ${esc(S.org.meaning)}.</p></div>
        <div><p class="ftr__h">Разделы</p><ul>${S.nav.map((n) => `<li><a href="${R}${n.href}">${esc(n.label)}</a></li>`).join("")}<li><a href="${R}faq/">Вопросы</a></li></ul></div>
        <div><p class="ftr__h">Связаться</p><ul><li><a href="tel:+${S.org.wa}">${esc(S.org.phone)}</a></li><li><a href="${wa(WA_HELLO)}" target="_blank" rel="noopener">WhatsApp</a></li><li><a href="${S.org.vk}" target="_blank" rel="noopener">ВКонтакте</a></li></ul></div>
      </div>
      <div class="ftr__bottom"><span>© ${new Date().getFullYear()} ${esc(S.org.name)}</span><a href="${R}privacy/">Политика обработки персональных данных</a></div>
    </div></footer>`;

  /* ---------- блоки главной ---------- */
  const H = {};
  H.hero = () => {
    const words = S.hero.title.split(" "), lines = [words.slice(0, 1), words.slice(1, 2), words.slice(2, 3), words.slice(3)].filter((l) => l.length);
    return `<section class="hero"><div class="hero__bg"><img src="${R}${S.hero.photo}-1600.webp" srcset="${R}${S.hero.photo}-640.webp 640w, ${R}${S.hero.photo}-1280.webp 1280w, ${R}${S.hero.photo}-1600.webp 1600w" sizes="100vw" alt="${esc(S.hero.alt)}" fetchpriority="high"></div>
      <div class="wrap hero__in"><div>
        <h1>${lines.map((l) => `<span class="ln"><span>${esc(l.join(" "))}</span></span>`).join("")}</h1>
        <p class="hero__text">${esc(S.hero.text)}</p>
        <div class="hero__row"><a class="btn btn--accent" href="${R}courses/">Посмотреть курсы</a><button class="link" data-quiz>${arrow("Подобрать курс за 3 вопроса")}</button></div>
      </div><span class="vlabel">${esc(S.org.city)}, ${esc(S.org.region)}</span></div></section>`;
  };
  H.manifest = () => `<section class="sec"><div class="wrap manifest">
      <div><p class="manifest__q rv-t">${esc(S.manifest.text)}</p>
        <div class="manifest__sign"><span class="muted">${esc(S.org.owner)}, основательница</span><a class="link" href="${R}about/">${arrow("Об академии")}</a></div></div>
      ${ph(S.manifest.photo, S.manifest.alt, { cls: "manifest__ph", sizes: "(max-width: 760px) 62vw, 30vw", cap: ILL })}
    </div></section>`;
  H.directions = () => `<section class="sec" style="padding-top:0"><div class="wrap">
      <div class="rail-head"><h2 class="rv-t">Три направления</h2><a class="link" href="${R}courses/">${arrow(`Все ${S.courses.length} курсов`)}</a></div>
      <div class="dirs">${S.categories.map((c, i) => {
        const n = S.courses.filter((x) => x.cat === c.id).length;
        return `<a class="dir" href="${R}courses/?cat=${c.id}">${ph(c.photo, c.alt, { sizes: i ? "(max-width: 760px) 50vw, 40vw" : "(max-width: 760px) 100vw, 58vw" })}
          <div class="dir__t"><h3>${esc(c.name)}</h3><p>${esc(c.text)}</p><span class="link">${arrow(`${n} ${plural(n, "курс", "курса", "курсов")}`)}</span></div></a>`;
      }).join("")}</div></div></section>`;
  H.featured = () => `<section class="sec" style="padding-top:0">
      <div class="wrap rail-head"><div><h2 class="rv-t">Курсы</h2><p class="lead" style="margin-top:12px">Цена за весь курс. Листайте, чтобы посмотреть все.</p></div><a class="link" href="${R}courses/">${arrow("Каталог")}</a></div>
      <div class="rail">${S.featured.map(course).filter(Boolean).map((c) => `<a class="rcard" href="${cURL(c)}">${ph(c.photo, c.alt, { sizes: "(max-width: 760px) 70vw, 26vw" })}
        <span class="rcard__cat">${esc(cat(c.cat).name)}</span><h3>${esc(c.name)}</h3><span class="price">${rub(c.price)}</span></a>`).join("")}</div></section>`;
  H.details = () => `<section class="sec" style="padding-top:0"><div class="wrap details">
      <div class="details__text"><h2 class="rv-t">${esc(S.details.title)}</h2><p class="lead">${esc(S.details.text)}</p></div>
      ${S.details.photos.map((p, i) => ph(p.src, p.alt, { cls: "d" + (i + 1), sizes: i === 1 ? "(max-width: 760px) 50vw, 33vw" : "(max-width: 760px) 100vw, 58vw", cap: i === 0 ? ILL : "" })).join("")}
    </div></section>`;
  H.teacher = () => `<div class="fade-in" aria-hidden="true"></div><section class="dark" style="padding:clamp(20px,4vw,60px) 0 var(--sec)"><div class="wrap">
      <div class="teacher">
        <div class="portrait">${has(S.teacher.photo) ? `<img src="${R}${S.teacher.photo}" alt="${esc(S.teacher.name)}" loading="lazy">` : S.preview ? "Здесь будет портрет Айгуль" : ""}</div>
        <div><p class="muted">Ваш преподаватель</p><p class="teacher__name">${esc(S.teacher.name)}</p><p class="muted">${esc(S.teacher.role)}</p>
          ${has(S.teacher.bio) ? `<p class="lead" style="margin-top:22px">${esc(S.teacher.bio)}</p>` : ""}
          <div class="hero__row" style="color:inherit"><a class="btn btn--line" href="${R}about/">Об Айгуль и академии</a></div></div>
      </div>
      <ul class="adv">${S.advantages.map((a) => `<li><h3>${esc(a.t)}</h3><p>${esc(a.d)}</p></li>`).join("")}</ul>
    </div></section><div class="fade-out" aria-hidden="true"></div>`;
  H.enroll = () => `<section class="enroll" style="padding:clamp(20px,3vw,40px) 0 var(--sec)"><div class="wrap enroll__in">
      <div><h2 class="rv-t">${esc(S.enroll.title)}</h2><p class="lead" style="margin-top:20px">${esc(S.enroll.text)}</p></div>
      <form class="quick form" data-quick novalidate>
        <div class="fld"><label for="qName">Имя</label><input id="qName" name="name" autocomplete="name" maxlength="80"><span class="err"></span></div>
        <div class="fld"><label for="qPhone">Телефон</label><input id="qPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7" maxlength="20"><span class="err"></span></div>
        <button class="btn btn--accent" type="submit">Оставить заявку</button>
      </form></div></section>`;

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
  P.about = () => `<div class="wrap phead">${crumbs([{ t: "Об академии" }])}<h1>${esc(S.org.name)}</h1><p class="lead">${esc(S.org.meaning[0].toUpperCase() + S.org.meaning.slice(1))}. ${esc(S.about.lead)}</p></div>
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

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".rv, .rv-t").forEach((el) => io.observe(el));
  } else document.querySelectorAll(".rv, .rv-t").forEach((el) => el.classList.add("is-in"));
})();
