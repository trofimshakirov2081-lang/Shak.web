/* АлтынНур: вывод страниц из опубликованного снимка контента (window.SITE). */
(function () {
  "use strict";
  const S = window.SITE;
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rub = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₽";
  const has = (v) => Array.isArray(v) ? v.length > 0 : v != null && v !== "";
  const catName = (id) => (S.categories.find((c) => c.id === id) || {}).name || "";
  const courseBy = (slug) => S.courses.find((c) => c.slug === slug);
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const img = (base, alt, sizes) => `<img src="${base}-960.webp" srcset="${base}-480.webp 480w, ${base}-960.webp 960w" sizes="${sizes || "(max-width: 760px) 50vw, 33vw"}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  const waLink = (text) => `https://wa.me/${S.org.wa}?text=${encodeURIComponent(text)}`;
  const isHome = !!document.getElementById("blocks");
  const home = isHome ? "" : "index.html";

  /* ---------- шапка и подвал ---------- */
  function header() {
    const visibleTypes = S.blocks.filter((b) => b.visible).map((b) => b.type);
    const links = S.nav.filter((n) => visibleTypes.includes(n.to) || (n.to === "teacher" && visibleTypes.includes("teacher")))
      .map((n) => `<a href="${home}#${n.to}">${esc(n.label)}</a>`).join("");
    return `${S.preview ? `<div class="draft"><div class="wrap">Черновик для согласования. Цены предварительные, фото направлений временные. Работы учениц, отзывы и данные о преподавателе добавим, когда Айгуль пришлёт материалы.</div></div>` : ""}
    <header class="hdr"><div class="wrap hdr__in">
      <a class="logo" href="${home || "#top"}">${esc(S.org.name)}<small>${esc(S.org.kind)}</small></a>
      <nav class="nav" id="nav" aria-label="Разделы">${links}</nav>
      <button class="burger" aria-label="Меню" aria-expanded="false" aria-controls="nav"><span></span></button>
      <button class="btn btn--primary" data-enroll>Записаться</button>
    </div></header>`;
  }
  function footer() {
    return `<footer class="ftr"><div class="wrap ftr__in">
      <div>${esc(S.org.name)}, ${esc(S.org.kind.toLowerCase())}. ${esc(S.org.city)}, ${esc(S.org.region)}.</div>
      <nav aria-label="Документы"><a href="privacy.html">Политика обработки персональных данных</a></nav>
      <div>© ${new Date().getFullYear()} ${esc(S.org.name)}</div>
    </div></footer>`;
  }

  /* ---------- блоки главной ---------- */
  const B = {};
  B.hero = () => {
    const h = S.hero;
    return `<section class="hero" id="top"><div class="wrap hero__grid">
      <div>
        <p class="hero__kicker">${esc(S.org.name)}: ${esc(S.org.kind.toLowerCase())} в ${esc(S.org.city === "Туймазы" ? "Туймазах" : S.org.city)}</p>
        <h1>${esc(h.title)}</h1>
        <p class="hero__text">${esc(h.text)}</p>
        <div class="hero__btns">
          <a class="btn btn--primary" href="#${h.primary.to}">${esc(h.primary.label)}</a>
          <a class="btn btn--ghost" href="#${h.secondary.to}">${esc(h.secondary.label)}</a>
        </div>
        <div class="hero__facts"><span><b>${S.courses.length}</b> ${plural(S.courses.length, "программа", "программы", "программ")}</span><span><b>${S.categories.length}</b> направления</span><span>Очно, в ${esc(S.org.city === "Туймазы" ? "Туймазах" : S.org.city)}</span></div>
      </div>
      <div class="hero__media"><div class="slit"><img src="${h.photo}" alt="${esc(h.photoAlt)}" fetchpriority="high" decoding="async">${S.preview ? `<span class="slit__cap">Временное фото</span>` : ""}</div></div>
    </div></section>`;
  };
  B.audience = () => `<section class="sec" id="audience"><div class="wrap aud">
      <h2 class="aud__title rv">${esc(S.audience.title)}</h2>
      <ul class="aud__list">${S.audience.items.map((i) => `<li><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p></li>`).join("")}</ul>
    </div></section>`;
  B.directions = () => `<section class="sec sec--surface" id="directions"><div class="wrap">
      <div class="sec__head"><h2 class="rv">Направления обучения</h2><p class="lead">Нажмите на направление, и в каталоге останутся только его курсы.</p></div>
      <div class="dirs">${S.categories.map((c) => {
        const n = S.courses.filter((x) => x.cat === c.id).length;
        return `<button class="dir" data-filter="${c.id}"><img src="${c.photo}" alt="" loading="lazy"><h3>${esc(c.name)}</h3><p>${esc(c.text)}</p><span class="dir__count">${n} ${plural(n, "курс", "курса", "курсов")}</span></button>`;
      }).join("")}</div>
    </div></section>`;
  B.courses = () => `<section class="sec" id="courses"><div class="wrap">
      <div class="sec__head"><h2 class="rv">Курсы и цены</h2><p class="lead">Цена указана за весь курс. Программу, длительность и ближайшие даты подскажем при записи.</p></div>
      <div class="filters" role="group" aria-label="Фильтр по направлению">
        <button class="chip" data-filter="all" aria-pressed="true">Все курсы</button>
        ${S.categories.map((c) => `<button class="chip" data-filter="${c.id}" aria-pressed="false">${esc(c.name)}</button>`).join("")}
      </div>
      <div class="clist" id="clist">${S.courses.map(courseRow).join("")}</div>
    </div></section>`;
  function courseRow(c) {
    const meta = [c.duration, c.format_text, c.nextDate].filter(has);
    return `<article class="crow" data-cat="${c.cat}">
      <a class="crow__img" href="course.html?c=${c.slug}" tabindex="-1" aria-hidden="true">${img(c.photo, "", "132px")}</a>
      <div><div class="crow__cat">${esc(catName(c.cat))}</div><h3><a href="course.html?c=${c.slug}">${esc(c.name)}</a></h3>
        <p class="crow__desc">${esc(c.short)}</p>${meta.length ? `<div class="crow__meta">${meta.map((m) => `<span>${esc(m)}</span>`).join("")}</div>` : ""}</div>
      <div class="crow__side">${has(c.price) ? `<div class="price">${rub(c.price)}</div>` : ""}
        <div class="crow__btns"><a class="btn--text btn" href="course.html?c=${c.slug}">Подробнее</a><button class="btn btn--ghost" data-enroll="${c.slug}">Записаться</button></div></div>
    </article>`;
  }
  B.advantages = () => `<section class="sec sec--light" id="advantages"><div class="wrap">
      <div class="sec__head"><h2 class="rv">${esc(S.advantages.title)}</h2></div>
      <div class="adv">${S.advantages.items.map((i) => `<div><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p></div>`).join("")}</div>
      ${S.preview ? `<p class="adv__note">${esc(S.advantages.note)}</p>` : ""}
    </div></section>`;
  B.process = () => `<section class="sec" id="process"><div class="wrap">
      <div class="sec__head"><h2 class="rv">${esc(S.process.title)}</h2></div>
      <ol class="steps">${S.process.steps.map((s, i) => `<li><span class="steps__n" aria-hidden="true">${i + 1}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join("")}</ol>
    </div></section>`;
  B.teacher = () => {
    const t = S.teacher;
    return `<section class="sec sec--surface" id="teacher"><div class="wrap teacher">
      <div class="portrait">${has(t.photo) ? `<img src="${t.photo}" alt="${esc(t.name)}" loading="lazy">` : S.preview ? "Здесь будет портрет Айгуль" : ""}</div>
      <div><h2 class="rv" style="font-size:1.1rem;font-family:var(--f-body);font-weight:500;color:var(--c-muted)">${esc(t.title)}</h2>
        <p class="teacher__name" style="font-family:var(--f-head);line-height:1.05">${esc(t.name)}</p>
        <p class="teacher__role">${esc(t.role)}</p>
        ${has(t.bio) ? `<p class="teacher__bio">${esc(t.bio)}</p>` : S.preview ? `<p class="teacher__bio">Опыт, образование, сертификаты и подход к обучению появятся здесь со слов Айгуль. Пока этих данных нет, на сайте мы их не придумываем.</p>` : ""}
        <div class="hero__btns"><button class="btn btn--ghost" data-enroll>Задать вопрос преподавателю</button></div>
      </div></div></section>`;
  };
  B.works = () => has(S.works) ? "" : !S.preview ? "" : `<section class="sec" id="works"><div class="wrap">
      <div class="sec__head"><h2 class="rv">Результаты, которые говорят сами за себя</h2><p class="lead">Галерея работ учениц с фильтром по направлениям и сравнением «до и после». Заполним настоящими фото с согласия авторов.</p></div>
      <div class="slots"><div class="slot">Работа ученицы: брови</div><div class="slot">До и после</div><div class="slot">Процесс обучения</div></div>
    </div></section>`;
  B.numbers = () => has(S.numbers) ? "" : "";
  B.reviews = () => has(S.reviews) ? "" : !S.preview ? "" : `<section class="sec" id="reviews" style="padding-top:0"><div class="wrap"><div class="pending">
      <h3>Истории наших учениц</h3><p>Отзывы текстом, скриншотами и видео. Добавим только настоящие, с разрешения учениц.</p></div></div></section>`;
  B.batches = () => `<section class="sec" id="batches" style="padding-top:0"><div class="wrap">
      ${has(S.batches) ? "" : `<div class="batch-empty"><div><h3>Ближайшие даты обучения</h3><p>Даты наборов уточняются. Оставьте заявку, и мы сообщим о старте подходящего курса.</p></div><button class="btn btn--primary" data-enroll>Узнать о наборе</button></div>`}
    </div></section>`;
  B.quiz = () => `<section class="sec sec--surface" id="quiz"><div class="wrap quiz">
      <div><h2 class="rv">${esc(S.quiz.title)}</h2><p class="lead" style="margin-top:20px">${esc(S.quiz.text)}</p></div>
      <div class="qbox" id="qbox" aria-live="polite"></div>
    </div></section>`;
  B.faq = () => `<section class="sec sec--light" id="faq"><div class="wrap faq">
      <h2 class="rv">Частые вопросы</h2>
      <div class="acc">${S.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p class="ans">${esc(f.a)}</p></details>`).join("")}</div>
    </div></section>`;
  B.cta = () => `<section class="cta" id="cta"><div class="wrap">
      <h2 class="rv">${esc(S.cta.title)}</h2><p>${esc(S.cta.text)}</p>
      <div class="hero__btns"><a class="btn btn--primary" href="#quiz">Подобрать курс</a><a class="btn btn--ghost" href="${waLink("Здравствуйте! Хочу узнать об обучении в АлтынНур.")}" target="_blank" rel="noopener">Написать в WhatsApp</a></div>
    </div></section>`;
  B.contacts = () => {
    const o = S.org, rows = [
      ["Телефон", `<a href="tel:+${o.wa}">${esc(o.phone)}</a>`],
      ["WhatsApp", `<a href="${waLink("Здравствуйте! Хочу узнать об обучении в АлтынНур.")}" target="_blank" rel="noopener">Написать</a>`],
      ["ВКонтакте", `<a href="${o.vk}" target="_blank" rel="noopener">vk.ru/azolotaya82</a>`],
      o.telegram ? ["Telegram", `<a href="${o.telegram}" target="_blank" rel="noopener">Написать</a>`] : null,
      ["Адрес", o.address ? esc(o.address) : `${esc(o.city)}, ${esc(o.region)}. Точный адрес сообщим при записи.`],
      o.hours ? ["Часы работы", esc(o.hours)] : null
    ].filter(Boolean);
    return `<section class="sec" id="contacts"><div class="wrap contacts">
      <div><h2 class="rv">${esc(S.contacts.title)}</h2><p class="lead" style="margin-top:20px">${esc(o.owner)}, основательница и преподаватель.</p></div>
      <ul class="clines">${rows.map((r) => `<li><span>${r[0]}</span><div>${r[1]}</div></li>`).join("")}</ul>
    </div></section>`;
  };

  /* ---------- форма заявки ---------- */
  function modal() {
    return `<div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle"><div class="modal__box">
      <div class="modal__top"><h3 id="mTitle">Заявка на обучение</h3><button class="x" data-close aria-label="Закрыть">×</button></div>
      <div id="mBody"></div></div></div>`;
  }
  let lastFocus = null;
  function openForm(slug, extra) {
    const m = document.getElementById("modal"), body = document.getElementById("mBody"), c = slug && courseBy(slug);
    body.innerHTML = `<form class="form" novalidate>
      ${c ? `<p class="ctx">Вы оставляете заявку на курс: ${esc(c.name)}</p>` : ""}
      ${extra ? `<p class="ctx">${esc(extra.label)}</p>` : ""}
      <div class="fld"><label for="fName">Ваше имя</label><input id="fName" name="name" autocomplete="name" maxlength="80" required><span class="err"></span></div>
      <div class="fld"><label for="fPhone">Телефон</label><input id="fPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7" maxlength="20" required><span class="err"></span></div>
      ${c ? `<input type="hidden" name="course" value="${c.slug}">` : `<div class="fld"><label for="fCourse">Курс</label><select id="fCourse" name="course"><option value="">Пока не выбрала, нужна консультация</option>${S.courses.map((x) => `<option value="${x.slug}">${esc(x.name)}</option>`).join("")}</select></div>`}
      <div class="fld"><label for="fWay">Как с вами связаться</label><select id="fWay" name="way"><option>WhatsApp</option><option>Звонок</option><option>Telegram</option></select></div>
      <div class="fld"><label for="fNote">Комментарий, если хотите</label><textarea id="fNote" name="note" maxlength="600"></textarea></div>
      <div class="hp" aria-hidden="true"><label>Не заполняйте <input name="website" tabindex="-1" autocomplete="off"></label></div>
      <label class="consent"><input type="checkbox" name="consent"><span>Согласна на обработку персональных данных по <a href="privacy.html" target="_blank">политике</a>.</span></label><span class="err" id="cErr"></span>
      <button class="btn btn--primary" type="submit">Отправить заявку</button>
      ${S.preview ? `<p class="qhint">В черновике заявка уходит через WhatsApp. В рабочей версии она сначала сохранится в админке, а Айгуль получит уведомление.</p>` : ""}
    </form>`;
    const form = body.querySelector("form");
    form.addEventListener("submit", (e) => submit(e, form, extra));
    lastFocus = document.activeElement;
    m.classList.add("is-open");
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => body.querySelector("input:not([type=hidden])").focus(), 60);
  }
  function closeForm() {
    document.getElementById("modal").classList.remove("is-open");
    document.documentElement.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  function submit(e, form, extra) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return; // ловушка для ботов
    let ok = true;
    const setErr = (name, msg) => { const f = form.querySelector(`[name=${name}]`).closest(".fld"); f.classList.toggle("has-err", !!msg); f.querySelector(".err").textContent = msg || ""; if (msg) ok = false; };
    setErr("name", d.name.trim().length < 2 ? "Напишите, как к вам обращаться" : "");
    const digits = d.phone.replace(/\D/g, "");
    setErr("phone", /^[78]\d{10}$/.test(digits) || /^9\d{9}$/.test(digits) ? "" : "Проверьте номер: нужно 11 цифр, например +7 927 123-45-67");
    document.getElementById("cErr").textContent = d.consent ? "" : "Без согласия мы не можем принять заявку";
    if (!d.consent) ok = false;
    if (!ok) { const bad = form.querySelector(".has-err input") || form.querySelector("[name=consent]"); bad.focus(); return; }
    const c = d.course && courseBy(d.course);
    const text = [`Здравствуйте! Меня зовут ${d.name.trim()}.`, c ? `Меня заинтересовал курс «${c.name}» в учебном центре АлтынНур. Хотела бы узнать подробности.` : "Хочу узнать об обучении в АлтынНур и подобрать курс.",
      extra && extra.summary ? extra.summary : "", `Телефон: ${d.phone}. Удобнее: ${d.way}.`, d.note ? `Комментарий: ${d.note.trim()}` : ""].filter(Boolean).join("\n");
    window.open(waLink(text), "_blank", "noopener");
    document.getElementById("mBody").innerHTML = `<div class="ok"><div class="ok__mark" aria-hidden="true">✓</div><h3>Спасибо!</h3>
      <p>Мы открыли WhatsApp с готовым сообщением, осталось нажать «Отправить». Мы свяжемся с вами по указанному номеру.</p>
      <div class="hero__btns" style="justify-content:center"><button class="btn btn--ghost" data-close>Вернуться на сайт</button></div></div>`;
  }

  /* ---------- квиз ---------- */
  function quiz() {
    const box = document.getElementById("qbox");
    if (!box) return;
    const Q = S.quiz.questions, ans = {};
    let step = 0;
    const draw = () => {
      if (step >= Q.length) return result();
      const q = Q[step];
      box.innerHTML = `<div class="qprog"><span>Вопрос ${step + 1} из ${Q.length}</span><span class="qprog__bar"><i style="width:${(step / Q.length) * 100}%"></i></span></div>
        <div class="qstep"><h3>${esc(q.q)}</h3><div class="qopts">${q.a.map((a, i) => `<button class="qopt" data-i="${i}" aria-pressed="${ans[q.id] && ans[q.id].i === i}">${esc(a.t)}</button>`).join("")}</div></div>
        <div class="qnav">${step ? `<button class="btn btn--text" data-back>Назад</button>` : "<span></span>"}<button class="btn btn--primary" data-next ${ans[q.id] ? "" : "disabled"}>${step === Q.length - 1 ? "Показать результат" : "Продолжить"}</button></div>`;
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
      let picks = [];
      if (fm !== "consult") {
        picks = S.courses.map((c) => ({ c, s: (c.level.includes(lv) ? 2 : 0) + (c.format.includes(fm) ? 3 : 0) })).filter((x) => x.s >= 3).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.c);
      }
      const summary = `Ответы в подборе курса: ${Q.map((q) => ans[q.id].t).join("; ")}.` + (picks.length ? ` Подошли: ${picks.map((p) => p.name).join(", ")}.` : "");
      box.innerHTML = `<div class="qprog"><span>Готово</span><span class="qprog__bar"><i style="width:100%"></i></span></div><div class="qstep">
        ${picks.length ? `<h3>Вам могут подойти</h3><div class="qres">${picks.map((p) => `<a href="course.html?c=${p.slug}"><img src="${p.photo}-480.webp" alt=""><span>${esc(p.name)}</span><span class="price">${rub(p.price)}</span></a>`).join("")}</div>`
          : `<h3>Подберём курс вместе</h3><p class="lead" style="margin:12px 0 24px">По ответам сложно выбрать одно направление. Расскажем о программах и поможем определиться.</p>`}
        <p class="lead">Хотите узнать подробности об обучении? Оставьте номер, и мы поможем подобрать подходящий вариант.</p>
        <div class="qnav"><button class="btn btn--text" data-again>Пройти заново</button><button class="btn btn--primary" data-lead>Оставить номер</button></div>
        <p class="qhint">Это подсказка по вашим ответам, а не оценка способностей. Окончательно выбрать поможет преподаватель.</p></div>`;
      box.querySelector("[data-again]").addEventListener("click", () => { step = 0; for (const k in ans) delete ans[k]; draw(); });
      box.querySelector("[data-lead]").addEventListener("click", () => openForm(picks.length === 1 ? picks[0].slug : "", { label: "Ответы из подбора курса передадим вместе с заявкой.", summary }));
    };
    draw();
  }

  /* ---------- фильтр каталога ---------- */
  function filters() {
    const list = document.getElementById("clist");
    if (!list) return;
    const apply = (cat) => {
      document.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", b.dataset.filter === cat));
      list.querySelectorAll(".crow").forEach((r) => {
        const show = cat === "all" || r.dataset.cat === cat;
        if (show) { r.hidden = false; requestAnimationFrame(() => r.classList.remove("is-out")); }
        else { r.classList.add("is-out"); setTimeout(() => { if (r.classList.contains("is-out")) r.hidden = true; }, 300); }
      });
    };
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      apply(b.dataset.filter);
      if (b.classList.contains("dir")) document.getElementById("courses").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  }

  /* ---------- страница курса ---------- */
  function coursePage() {
    const root = document.getElementById("course");
    const slug = new URLSearchParams(location.search).get("c");
    const c = courseBy(slug);
    if (!c) { root.innerHTML = `<section class="sec"><div class="wrap"><h1>Курс не найден</h1><p class="lead" style="margin:20px 0 30px">Возможно, ссылка устарела. Посмотрите все программы.</p><a class="btn btn--primary" href="index.html#courses">Все курсы</a></div></section>`; return; }
    document.title = `${c.name}: обучение в Туймазах | ${S.org.name}`;
    const similar = S.courses.filter((x) => x.slug !== c.slug && x.cat === c.cat).concat(S.courses.filter((x) => x.cat !== c.cat)).slice(0, 3);
    root.innerHTML = `<div class="wrap chero">
      <div><nav class="crumbs" aria-label="Навигация"><a href="index.html">Главная</a><span>/</span><a href="index.html#courses">Курсы</a><span>/</span><span>${esc(c.name)}</span></nav>
        <p class="hero__kicker">${esc(catName(c.cat))}</p><h1>${esc(c.name)}</h1><p class="hero__text">${esc(c.short)}</p>
        <div class="chero__price"><span class="price">${rub(c.price)}</span><span class="crow__cat">за весь курс${S.preview ? ", цена предварительная" : ""}</span></div>
        <div class="hero__btns"><button class="btn btn--primary" data-enroll="${c.slug}">Записаться на курс</button><a class="btn btn--ghost" href="${waLink(`Здравствуйте! Меня заинтересовал курс «${c.name}» в учебном центре АлтынНур. Хотела бы узнать подробности.`)}" target="_blank" rel="noopener">Спросить в WhatsApp</a></div></div>
      <div class="chero__img">${img(c.photo, `Иллюстрация направления: ${c.name}`, "(max-width: 900px) 100vw, 40vw")}</div>
    </div>
    <section class="sec sec--light"><div class="wrap faq">
      <h2 class="rv">Что входит в курс</h2>
      <div><ul class="topics">${c.topics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      ${S.preview ? `<p class="adv__note">Полная программа по модулям, длительность, практика на моделях, материалы и документ после обучения появятся, когда Айгуль их подтвердит.</p>` : ""}</div>
    </div></section>
    <section class="sec" style="padding-bottom:0"><div class="wrap"><div class="batch-empty"><div><h3>Ближайшие даты</h3><p>Даты набора на этот курс уточняются. Оставьте заявку, и мы сообщим о старте.</p></div><button class="btn btn--primary" data-enroll="${c.slug}">Узнать о наборе</button></div></div></section>
    <section class="sec"><div class="wrap"><div class="sec__head"><h2 class="rv">Другие курсы</h2></div>
      <div class="similar">${similar.map((s) => `<a href="course.html?c=${s.slug}">${img(s.photo, "", "(max-width: 900px) 50vw, 33vw")}<span class="crow__cat">${esc(catName(s.cat))}</span><h3>${esc(s.name)}</h3><span class="price" style="font-size:1.2rem">${rub(s.price)}</span></a>`).join("")}</div></div></section>`;
  }

  /* ---------- сборка ---------- */
  document.body.insertAdjacentHTML("afterbegin", header());
  if (isHome) document.getElementById("blocks").innerHTML = S.blocks.filter((b) => b.visible && B[b.type]).map((b) => B[b.type]()).join("");
  else coursePage();
  document.body.insertAdjacentHTML("beforeend", footer() + modal());

  const html = document.documentElement, burger = document.querySelector(".burger");
  burger.addEventListener("click", () => { const o = html.classList.toggle("menu-open"); burger.setAttribute("aria-expanded", o); });
  document.getElementById("nav").addEventListener("click", (e) => { if (e.target.closest("a")) { html.classList.remove("menu-open"); burger.setAttribute("aria-expanded", false); } });
  document.addEventListener("click", (e) => {
    const en = e.target.closest("[data-enroll]");
    if (en) { e.preventDefault(); openForm(en.dataset.enroll || ""); return; }
    if (e.target.closest("[data-close]") || e.target.id === "modal") closeForm();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.getElementById("modal").classList.contains("is-open")) closeForm(); });
  filters();
  quiz();

  // подсветка текущего раздела в меню и мягкое появление заголовков
  if ("IntersectionObserver" in window) {
    const rv = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); rv.unobserve(en.target); } }), { rootMargin: "0px 0px -10% 0px" });
    document.querySelectorAll(".rv").forEach((el) => rv.observe(el));
    const links = [...document.querySelectorAll(".nav a")];
    const spy = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) links.forEach((l) => l.classList.toggle("is-active", l.hash === "#" + en.target.id)); }), { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));
  } else document.querySelectorAll(".rv").forEach((el) => el.classList.add("is-in"));
})();
