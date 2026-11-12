/* Админка АлтынНур. Без сборки и библиотек.
   Если сервера нет (превью на GitHub Pages), работает в пробном режиме: изменения остаются в этом браузере. */
(function () {
  "use strict";
  const API = "../api/";
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  let S = null;          // данные сайта (черновик)
  let DEMO = false, CSRF = null, USER = null;
  let TAB = "leads", LEADS = [], META = { draft_at: null, published_at: null };
  let dirty = false, unpublished = false, saveT = null, saving = false;

  /* ---------- маленькие помощники ---------- */
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k === "style") n.style.cssText = v; else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
    return n;
  }
  function toast(t, bad) { const e = $("#toast"); e.textContent = t; e.className = "toast on" + (bad ? " bad" : ""); clearTimeout(toast.t); toast.t = setTimeout(() => (e.className = "toast"), bad ? 4200 : 1900); }
  const hhmm = (s) => { if (!s) return ""; const d = new Date(s.replace(" ", "T") + "Z"); return isNaN(d) ? "" : d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
  const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  const slugify = (s) => s.toLowerCase().split("").map((c) => (TR[c] != null ? TR[c] : c)).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

  /* ---------- связь с сервером ---------- */
  async function api(r, body, isForm) {
    const opt = { method: body === undefined ? "GET" : "POST", credentials: "same-origin", headers: {} };
    if (body !== undefined) { if (isForm) opt.body = body; else { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); } }
    if (CSRF) opt.headers["X-CSRF"] = CSRF;
    let res, j;
    try { res = await fetch(API + "?r=" + r, opt); j = await res.json(); } catch (e) { throw new Error("Нет связи с сервером. Проверьте интернет"); }
    if (res.status === 401 && USER) { USER = null; screenLogin("Сессия закончилась, войдите снова"); }
    if (!j.ok) throw new Error(j.error || "Ошибка");
    return j;
  }
  const DKEY = "altyn-admin-demo";
  const demoLoad = async () => { try { const d = localStorage.getItem(DKEY); if (d) return JSON.parse(d); } catch (e) {} return (await fetch(API + "seed.json")).json(); };

  /* ---------- сохранение ---------- */
  function beforeSave() {
    const o = S.org, c = Object.fromEntries((S.contacts || []).map((x) => [x.type, x]));
    if (c.phone) o.phone = c.phone.value;
    const waSrc = (c.whatsapp && c.whatsapp.value) || (c.phone && c.phone.value) || "";
    o.wa = waSrc.replace(/\D/g, "").replace(/^8(\d{10})$/, "7$1");
    if (c.vk) { o.vk = c.vk.value; o.vkLabel = c.vk.value.replace(/^https?:\/\//, ""); }
    const used = new Set(S.courses.map((x) => x.slug).filter(Boolean));
    S.courses.forEach((x, i) => { if (!x.slug) { let s = slugify(x.name || "") || "kurs-" + (i + 1); while (used.has(s)) s += "-2"; x.slug = s; used.add(s); } });
    const slugs = new Set(S.courses.map((x) => x.slug));
    S.featured = (S.featured || []).filter((s) => slugs.has(s));
  }
  function touch() { dirty = true; unpublished = true; paintState(); clearTimeout(saveT); saveT = setTimeout(saveDraft, 1500); }
  async function saveDraft() {
    if (!dirty || saving) return;
    saving = true; clearTimeout(saveT); beforeSave();
    try {
      if (DEMO) { localStorage.setItem(DKEY, JSON.stringify(S)); META.draft_at = new Date().toISOString().slice(0, 19).replace("T", " "); }
      else META.draft_at = (await api("draft", { site: S })).draft_at;
      dirty = false;
    } catch (e) { toast(e.message, true); }
    saving = false; paintState();
  }
  async function publish() {
    clearTimeout(saveT); beforeSave();
    if (DEMO) { localStorage.setItem(DKEY, JSON.stringify(S)); toast("Пробный режим: на сервере это опубликует сайт"); return; }
    const b = $("#pubBtn"); b.disabled = true; b.textContent = "Публикуем…";
    try { META.published_at = (await api("publish", { site: S })).published_at; dirty = false; unpublished = false; toast("Опубликовано. Сайт обновлён"); }
    catch (e) { toast(e.message, true); }
    b.textContent = "Опубликовать"; paintState();
  }
  function preview() {
    beforeSave();
    try { localStorage.setItem("altyn-admin-draft", JSON.stringify(S)); } catch (e) { return toast("Не удалось открыть просмотр", true); }
    window.open("../?draft=1", "_blank");
  }
  function paintState() {
    const st = $("#state"), b = $("#pubBtn"); if (!st) return;
    st.textContent = dirty ? "Сохраняем…" : unpublished ? "Черновик сохранён. На сайте ещё старая версия" : META.published_at ? "Опубликовано " + hhmm(META.published_at) : "Ещё не опубликовано";
    if (b) b.disabled = !unpublished && !!META.published_at;
  }
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- поля ---------- */
  const F = {};
  F.wrap = (label, input, hint) => el("label", { class: "f" }, el("span", { text: label }), input, hint ? el("small", { text: hint }) : null);
  F.text = (label, o, k, opt = {}) => F.wrap(label, el("input", { type: opt.type || "text", value: o[k] == null ? "" : o[k], placeholder: opt.ph, maxlength: opt.max || 300, inputmode: opt.mode,
    oninput: (e) => { o[k] = opt.type === "number" ? Math.max(0, parseInt(e.target.value, 10) || 0) : e.target.value; if (!opt.quiet) touch(); if (opt.on) opt.on(); } }), opt.hint);
  F.area = (label, o, k, opt = {}) => { const t = el("textarea", { maxlength: opt.max || 2000, oninput: (e) => { o[k] = e.target.value; touch(); } }); t.value = o[k] || ""; return F.wrap(label, t, opt.hint); };
  F.sel = (label, o, k, opts, opt = {}) => { const s = el("select", { onchange: (e) => { o[k] = e.target.value; touch(); } }, opts.map(([v, n]) => el("option", { value: v, text: n }))); s.value = o[k] == null ? "" : o[k]; return F.wrap(label, s, opt.hint); };
  F.bool = (label, o, k, opt = {}) => el("label", { class: "chk" }, el("input", { type: "checkbox", checked: !!o[k], onchange: (e) => { o[k] = e.target.checked; touch(); if (opt.on) opt.on(); } }), el("span", { text: label }));
  F.multi = (label, o, k, opts) => { if (!Array.isArray(o[k])) o[k] = []; return el("div", { class: "f" }, el("span", { text: label }), el("div", { class: "multi" }, opts.map(([v, n]) =>
    el("label", { class: "chk" }, el("input", { type: "checkbox", checked: o[k].includes(v), onchange: (e) => { o[k] = e.target.checked ? [...new Set([...o[k], v])] : o[k].filter((x) => x !== v); touch(); } }), el("span", { text: n }))))); };
  F.img = (label, o, k, altKey) => {
    const pv = el("div", { class: "img__pv" });
    const paint = () => { pv.style.backgroundImage = o[k] ? `url("../${String(o[k]).replace(/"/g, "")}-640.webp")` : "none"; };
    const file = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp", style: "display:none", onchange: async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (DEMO) return toast("Пробный режим: загрузка фото работает на сервере", true);
      const fd = new FormData(); fd.append("file", f); toast("Загружаем фото…");
      try { o[k] = (await api("upload", fd, true)).src; paint(); touch(); toast("Фото загружено"); } catch (er) { toast(er.message, true); }
      e.target.value = "";
    } });
    paint();
    return el("div", { class: "f" }, el("span", { text: label }), el("div", { class: "img" }, pv, el("div", { class: "img__b" },
      el("button", { type: "button", class: "btn btn--sm", text: o[k] ? "Заменить фото" : "Загрузить фото", onclick: () => file.click() }), file,
      o[k] ? el("button", { type: "button", class: "btn btn--sm btn--bad", text: "Убрать", onclick: () => { o[k] = ""; paint(); touch(); } }) : null)),
      altKey ? F.text("Что на фото (для поиска и незрячих)", o, altKey, { ph: "Например: мастер наращивает ресницы" }) : null);
  };
  F.strs = (label, o, k, opt = {}) => {
    if (!Array.isArray(o[k])) o[k] = [];
    const box = el("div", { class: "list strs" });
    const draw = () => { box.replaceChildren(...o[k].map((v, i) => el("div", { class: "srow" },
      el("input", { type: "text", value: v, maxlength: 200, oninput: (e) => { o[k][i] = e.target.value; touch(); } }),
      el("button", { type: "button", class: "ic", "aria-label": "Удалить", text: "×", onclick: () => { o[k].splice(i, 1); draw(); touch(); } }))),
      el("button", { type: "button", class: "btn btn--sm", text: opt.add || "Добавить строку", onclick: () => { o[k].push(""); draw(); touch(); box.querySelectorAll("input")[o[k].length - 1].focus(); } })); };
    draw();
    return el("div", { class: "f" }, el("span", { text: label }), box);
  };
  /* список карточек: порядок, удаление, добавление */
  F.list = (arr, opt) => {
    const box = el("div", { class: "list" }); let openI = -1;
    const draw = () => {
      box.replaceChildren(...arr.map((it, i) => {
        const ttl = el("span", { class: "ttl", text: opt.title(it) || opt.untitled || "Без названия" });
        const meta = opt.meta ? el("span", { class: "meta", text: opt.meta(it) }) : null;
        const d = el("details", { class: "item", open: i === openI, ontoggle: (e) => { if (e.target.open) openI = i; else if (openI === i) openI = -1; } },
          el("summary", {}, ttl, meta, opt.fixed ? null : el("span", { class: "ord" },
            el("button", { type: "button", class: "ic", "aria-label": "Выше", text: "↑", disabled: i === 0, onclick: (e) => { e.preventDefault(); [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; openI = -1; draw(); touch(); } }),
            el("button", { type: "button", class: "ic", "aria-label": "Ниже", text: "↓", disabled: i === arr.length - 1, onclick: (e) => { e.preventDefault(); [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; openI = -1; draw(); touch(); } }))),
          el("div", { class: "item__in" }, opt.fields(it, () => { ttl.textContent = opt.title(it) || opt.untitled || "Без названия"; if (meta) meta.textContent = opt.meta(it); }),
            opt.fixed ? null : el("button", { type: "button", class: "btn btn--sm btn--bad", text: opt.del || "Удалить", style: "justify-self:start", onclick: () => { if (confirm("Удалить «" + (opt.title(it) || "элемент") + "»?")) { arr.splice(i, 1); openI = -1; draw(); touch(); } } })));
        return d;
      }), opt.fixed ? "" : el("button", { type: "button", class: "btn", text: opt.add || "Добавить", style: "justify-self:start", onclick: () => { arr.push(opt.blank()); openI = arr.length - 1; draw(); touch(); const n = box.querySelectorAll(".item")[openI]; if (n) { n.scrollIntoView({ block: "center" }); const f = n.querySelector("input"); if (f) f.focus(); } } }));
    };
    draw(); return box;
  };
  const box = (title, note, kids, open) => el("details", { class: "box", open: !!open }, el("summary", {}, title, note ? el("small", { text: note }) : null), el("div", { class: "box__in" }, kids));
  const row2 = (...k) => el("div", { class: "row2" }, k);

  /* ---------- разделы ---------- */
  const V = {};
  const STATUS = [["new", "Новая"], ["work", "В работе"], ["done", "Записалась"], ["refuse", "Отказ"]];
  V.leads = () => {
    if (DEMO) return [el("h1", { text: "Заявки" }), el("p", { class: "sub", text: "Здесь появляются заявки с сайта: имя, телефон, выбранный курс. В пробном режиме список пуст, на сервере он будет наполняться сам." }), el("div", { class: "empty", text: "Заявок пока нет" })];
    const list = el("div");
    const draw = () => list.replaceChildren(...(LEADS.length ? LEADS.map((l) => {
      const digits = l.phone.replace(/\D/g, "");
      const note = el("textarea", { placeholder: "Заметка для себя: когда перезвонить, о чём договорились", maxlength: 1000 }); note.value = l.admin_note || "";
      const sel = el("select", { "aria-label": "Статус" }, STATUS.map(([v, n]) => el("option", { value: v, text: n }))); sel.value = l.status;
      const card = el("div", { class: "lead" + (l.status === "new" ? " is-new" : "") });
      const upd = async () => { try { await api("lead_update", { id: l.id, status: sel.value, admin_note: note.value }); l.status = sel.value; l.admin_note = note.value; card.classList.toggle("is-new", l.status === "new"); paintTabs(); toast("Сохранено"); } catch (e) { toast(e.message, true); } };
      sel.onchange = upd; note.onchange = upd;
      card.append(...[el("div", { class: "lead__h" }, el("b", { text: l.name }), el("a", { href: "tel:" + l.phone, text: l.phone }), el("time", { text: hhmm(l.created_at) })),
        l.course ? el("p", {}, el("b", { text: "Курс: " }), l.course) : null, l.way ? el("p", {}, el("b", { text: "Связаться: " }), l.way) : null,
        l.note ? el("p", {}, el("b", { text: "Комментарий: " }), l.note) : null, l.extra ? el("p", { style: "color:var(--ink2)", text: l.extra }) : null, note,
        el("div", { class: "lead__a" }, sel, el("a", { class: "btn btn--sm", href: "https://wa.me/" + digits, target: "_blank", rel: "noopener", text: "WhatsApp" }), el("a", { class: "btn btn--sm", href: "tel:" + l.phone, text: "Позвонить" }),
          el("button", { type: "button", class: "btn btn--sm btn--bad", text: "Удалить", onclick: async () => { if (!confirm("Удалить заявку от «" + l.name + "»? Вернуть её будет нельзя")) return; try { await api("lead_delete", { id: l.id }); LEADS = LEADS.filter((x) => x !== l); draw(); paintTabs(); } catch (e) { toast(e.message, true); } } }))].filter(Boolean));
      return card;
    }) : [el("div", { class: "empty", text: "Заявок пока нет. Когда кто-то оставит заявку на сайте, она появится здесь" })]));
    draw();
    return [el("h1", { text: "Заявки" }), el("p", { class: "sub" }, "Новые обведены золотым. Меняйте статус, чтобы ничего не потерять. ", LEADS.length ? el("a", { href: API + "?r=leads&format=csv", text: "Скачать таблицей" }) : null), list];
  };

  const LEVELS = [["zero", "С нуля"], ["some", "Немного знакома"], ["master", "Действующий мастер"]];
  const FORMATS = [["zero", "Обучение с нуля"], ["short", "Краткий практический"], ["complex", "Комплексный"]];
  const LAYOUTS = [["split", "Фото сбоку"], ["cover", "Фото на весь экран"], ["frame", "Фото в рамке"]];
  const rub = (n) => (n ? Number(n).toLocaleString("ru-RU") + " ₽" : "цена не указана");
  V.courses = () => [el("h1", { text: "Курсы и цены" }), el("p", { class: "sub", text: "Нажмите на курс, чтобы изменить название, цену, описание и фото. Стрелки меняют порядок на сайте." }),
    F.list(S.courses, { add: "Добавить курс", untitled: "Новый курс", title: (c) => c.name, meta: (c) => rub(c.price),
      blank: () => ({ slug: "", name: "", cat: (S.categories[0] || {}).id || "", price: 0, layout: "split", photo: "", alt: "", photos: [], short: "", topics: [], level: ["zero"], format: ["short"], duration: "", hours: "", group: "", models: "", materials: "", certificate: "" }),
      fields: (c, re) => [
        F.text("Название курса", c, "name", { on: re, max: 120 }),
        row2(F.text("Цена, ₽", c, "price", { type: "number", mode: "numeric", on: re }), F.sel("Направление", c, "cat", S.categories.map((x) => [x.id, x.name]))),
        F.area("Коротко о курсе", c, "short", { max: 400, hint: "Одно-два предложения. Показывается в карточке курса и в поиске" }),
        F.strs("Чему научитесь (темы программы)", c, "topics", { add: "Добавить тему" }),
        row2(F.text("Длительность", c, "duration", { ph: "Например: 3 дня" }), F.text("Часов", c, "hours", { ph: "Например: 18 часов" })),
        row2(F.text("Группа", c, "group", { ph: "Например: до 4 человек" }), F.text("Практика на моделях", c, "models", { ph: "Например: 2 модели" })),
        row2(F.text("Материалы", c, "materials", { ph: "Например: всё выдаём" }), F.text("Документ после курса", c, "certificate", { ph: "Например: сертификат" })),
        F.img("Главное фото курса", c, "photo", "alt"),
        el("div", { class: "f" }, el("span", { text: "Ещё фото на странице курса" }), F.list(c.photos || (c.photos = []), { add: "Добавить фото", untitled: "Фото", title: (p) => p.alt, blank: () => ({ src: "", alt: "" }), fields: (p, r2) => [F.img("Фото", p, "src"), F.text("Что на фото", p, "alt", { on: r2 })] })),
        F.bool("Показывать на главной странице", { get v() { return (S.featured || []).includes(c.slug) && !!c.slug; }, set v(x) { S.featured = (S.featured || []).filter((s) => s !== c.slug); if (x && c.slug) S.featured.push(c.slug); } }, "v"),
        c.slug ? null : el("small", { style: "color:var(--ink2)", text: "Галочку «на главной» можно поставить после первого сохранения курса." }),
        F.sel("Вид первого экрана на странице курса", c, "layout", LAYOUTS),
        F.multi("Кому подходит (для подбора курса)", c, "level", LEVELS), F.multi("Формат (для подбора курса)", c, "format", FORMATS)] }),
    el("h2", { text: "Направления", style: "margin:28px 0 6px" }), el("p", { class: "sub", text: "Группы, по которым разложены курсы." }),
    F.list(S.categories, { add: "Добавить направление", untitled: "Новое направление", title: (c) => c.name,
      blank: () => ({ id: "cat-" + Date.now().toString(36), name: "", text: "", photo: "", alt: "" }),
      fields: (c, re) => [F.text("Название", c, "name", { on: re }), F.text("Подпись", c, "text"), F.img("Фото", c, "photo", "alt")] })];

  const BLOCKS = { hero: "Первый экран", directions: "Направления обучения", featured: "Курсы и цены", enroll: "Блок записи", zoom: "Фото-сцена «Как мы учим»", teacher: "Преимущества и преподаватель", manifest: "Текст с мини-фото", ribbon: "Лента фото" };
  V.home = () => {
    const bl = el("div", { class: "list blocks" });
    const drawB = () => { const on = S.home, off = Object.keys(BLOCKS).filter((b) => !on.includes(b));
      bl.replaceChildren(...on.map((b, i) => el("div", { class: "brow" }, el("span", { text: BLOCKS[b] || b }),
        el("button", { type: "button", class: "ic", text: "↑", "aria-label": "Выше", disabled: i === 0, onclick: () => { [on[i - 1], on[i]] = [on[i], on[i - 1]]; drawB(); touch(); } }),
        el("button", { type: "button", class: "ic", text: "↓", "aria-label": "Ниже", disabled: i === on.length - 1, onclick: () => { [on[i + 1], on[i]] = [on[i], on[i + 1]]; drawB(); touch(); } }),
        el("button", { type: "button", class: "btn btn--sm", text: "Скрыть", onclick: () => { on.splice(i, 1); drawB(); touch(); } }))),
        ...off.map((b) => el("div", { class: "brow", style: "opacity:.6" }, el("span", { text: BLOCKS[b] + " (скрыт)" }), el("button", { type: "button", class: "btn btn--sm", text: "Показать", onclick: () => { on.push(b); drawB(); touch(); } }))));
    }; drawB();
    return [el("h1", { text: "Главная страница" }), el("p", { class: "sub", text: "Тексты и фото главной. Порядок блоков меняется стрелками." }),
      box("Первый экран", "заголовок и фото", [F.area("Заголовок", S.hero, "title", { max: 160 }), F.area("Короткий текст под заголовком", S.hero, "short", { max: 240 }), F.img("Фото", S.hero, "photo", "alt")], true),
      box("Порядок блоков", "что и в каком порядке показывать", [bl]),
      box("Блок записи", null, [F.area("Заголовок", S.enroll, "title", { max: 160 }), F.area("Текст", S.enroll, "text", { max: 400 }), F.img("Фото", S.enroll, "photo", "alt")]),
      box("Фото-сцена «Как мы учим»", null, [F.text("Надпись над заголовком", S.zoom, "kicker"), F.text("Заголовок", S.zoom, "title"), F.img("Главное фото", S.zoom, "main", "alt"),
        el("div", { class: "f" }, el("span", { text: "Четыре боковых фото" }), F.list(S.zoom.side, { fixed: true, title: (p) => p.cap, untitled: "Фото", fields: (p, re) => [F.text("Подпись", p, "cap", { on: re }), F.img("Фото", p, "src")] }))]),
      box("Преимущества", "плитки с фото", [F.list(S.advantages, { add: "Добавить преимущество", title: (a) => a.t, blank: () => ({ t: "", short: "", d: "", photo: "" }),
        fields: (a, re) => [F.text("Заголовок", a, "t", { on: re }), F.text("Короткая подпись на плитке", a, "short"), F.area("Описание", a, "d", { max: 400 }), F.img("Фото", a, "photo")] })])];
  };

  const CHN = { phone: ["Телефон", "+7 927 123-45-67"], whatsapp: ["WhatsApp", "Номер: 79271234567"], telegram: ["Telegram", "Ник или ссылка: @altynnur"], max: ["Макс", "Ссылка на профиль"], vk: ["ВКонтакте", "https://vk.ru/..."], instagram: ["Instagram", "Ник или ссылка"], email: ["Почта", "name@mail.ru"] };
  V.contacts = () => { const o = S.org; if (!o.map) o.map = { link: "", lon: "", lat: "", zoom: 15 };
    return [el("h1", { text: "Контакты" }), el("p", { class: "sub", text: "Пустой или выключенный способ связи на сайте не показывается." }),
      box("Способы связи", null, [el("div", { class: "list" }, S.contacts.map((c) => el("div", { class: "item", style: "padding:10px 12px;display:grid;gap:8px" },
        F.bool((CHN[c.type] || [c.type])[0] + ": показывать на сайте", c, "on"), F.text("", c, "value", { ph: (CHN[c.type] || [])[1] }))))], true),
      box("Адрес и график", null, [F.text("Адрес", o, "address", { ph: "Например: ул. Ленина, 10, 2 этаж" }), F.text("Часы работы", o, "hours", { ph: "Например: ежедневно 10:00-19:00" }),
        F.text("Ссылка на точку в Яндекс Картах", o.map, "link", { max: 600, hint: "Откройте Яндекс Карты, найдите свой адрес, нажмите «Поделиться» и вставьте ссылку сюда. Карта на сайте встанет в эту точку" })]),
      box("Об организации", null, [row2(F.text("Название", o, "name"), F.text("Что это", o, "kind")), row2(F.text("Город", o, "city"), F.text("Город в предложном падеже (в ...)", o, "cityIn", { hint: "Например: Туймазах" })), F.text("Регион", o, "region"), F.text("Основательница", o, "owner")])];
  };

  V.pages = () => { const t = S.teacher, a = S.about;
    return [el("h1", { text: "Тексты страниц" }), el("p", { class: "sub", text: "Преподаватель, «Об академии», обучение, вопросы и работы." }),
      box("Преподаватель", null, [F.text("Имя", t, "name"), F.text("Кто она", t, "role"), F.area("О себе", t, "bio", { hint: "Опыт, образование, почему преподаёте" }), F.img("Портрет", t, "photo"), F.strs("Факты (опыт, сертификаты)", t, "facts", { add: "Добавить факт" })]),
      box("Об академии", null, [F.area("Главная фраза", a, "lead", { max: 300 }), el("div", { class: "f" }, el("span", { text: "Подход к обучению" }), F.list(a.approach, { add: "Добавить пункт", title: (x) => x.t, blank: () => ({ t: "", d: "" }), fields: (x, re) => [F.text("Заголовок", x, "t", { on: re }), F.area("Текст", x, "d")] })),
        el("div", { class: "f" }, el("span", { text: "Фото" }), F.list(a.collage, { add: "Добавить фото", untitled: "Фото", title: (p) => p.alt, blank: () => ({ src: "", alt: "" }), fields: (p, re) => [F.img("Фото", p, "src"), F.text("Что на фото", p, "alt", { on: re })] }))]),
      box("Для кого обучение", null, [F.list(S.audience, { add: "Добавить", title: (x) => x.t, blank: () => ({ t: "", d: "" }), fields: (x, re) => [F.text("Заголовок", x, "t", { on: re }), F.area("Текст", x, "d")] })]),
      box("Как проходит обучение", "шаги по порядку", [F.list(S.process, { add: "Добавить шаг", title: (x) => x.t, blank: () => ({ t: "", d: "" }), fields: (x, re) => [F.text("Шаг", x, "t", { on: re }), F.area("Описание", x, "d")] })]),
      box("Частые вопросы", null, [F.list(S.faq, { add: "Добавить вопрос", title: (x) => x.q, untitled: "Новый вопрос", blank: () => ({ q: "", a: "" }), fields: (x, re) => [F.text("Вопрос", x, "q", { on: re }), F.area("Ответ", x, "a")] })]),
      box("Работы учениц", "галерея", [el("small", { style: "color:var(--ink2)", text: "Только настоящие работы и с согласия учениц. Пока галерея пуста, на сайте стоит заглушка." }),
        F.list(S.works, { add: "Добавить работу", untitled: "Работа", title: (w) => w.alt || w.author, blank: () => ({ src: "", alt: "", cat: (S.categories[0] || {}).id || "", author: "", kind: "student" }),
          fields: (w, re) => [F.img("Фото", w, "src"), F.text("Что на фото", w, "alt", { on: re }), row2(F.sel("Направление", w, "cat", S.categories.map((x) => [x.id, x.name])), F.sel("Чья работа", w, "kind", [["student", "Ученицы"], ["teacher", "Преподавателя"]])), F.text("Автор (по желанию)", w, "author")] })]),
      box("Подбор курса", "заголовок теста", [F.text("Заголовок", S.quiz, "title"), F.area("Текст", S.quiz, "text")])];
  };

  V.look = () => [el("h1", { text: "Оформление" }), el("p", { class: "sub", text: "Общий вид сайта. Изменения видны после публикации, заранее посмотреть можно кнопкой «Посмотреть»." }),
    box("Цвет, шрифт и движение", null, [
      F.sel("Цвета", S, "theme", [["gold", "Кость и золото"], ["burgundy", "Кость и бордо"], ["night", "Ночное золото"]]),
      F.sel("Шрифт заголовков", S, "font", [["bona", "Bona Nova"], ["prata", "Prata"], ["cormorant", "Cormorant"]]),
      F.sel("Анимация", S, "anim", [["calm", "Спокойная"], ["soft", "Мягкая"], ["live", "Живая"]]),
      F.sel("Курсы на главной", S, "coursesView", [["flow", "По дуге (карусель)"], ["tiles", "Плиткой"]])], true),
    box("Режим черновика", null, [F.bool("Сайт в режиме черновика", S, "preview"),
      el("small", { style: "color:var(--ink2)", text: "Пока включено: посетители видят панель выбора оформления, поисковики сайт не показывают, а заявка открывает WhatsApp. Перед запуском выключите: заявки начнут сохраняться в раздел «Заявки», а сайт появится в поиске." })], true)];

  V.set = () => {
    if (DEMO) return [el("h1", { text: "Настройки" }), el("p", { class: "sub", text: "На сервере здесь меняется пароль, включаются уведомления о заявках и хранится история версий сайта." }),
      el("button", { class: "btn btn--bad", text: "Сбросить пробные изменения", onclick: () => { if (confirm("Вернуть всё как было?")) { localStorage.removeItem(DKEY); location.reload(); } } })];
    const pw = { old: "", n1: "", n2: "" }, nt = { tg_token: "", tg_chat: "", email: "" };
    const vbox = el("div", {}), nbox = el("div", { class: "box__in", style: "padding:0" });
    api("versions").then((j) => vbox.replaceChildren(...(j.items.length ? j.items.map((v) => el("div", { class: "ver" }, el("span", { text: hhmm(v.created_at) + ", " + v.author }),
      el("button", { class: "btn btn--sm", text: "Вернуть", onclick: async () => { if (!confirm("Вернуть версию от " + hhmm(v.created_at) + " в черновик? Сайт изменится после публикации")) return; try { S = (await api("restore", { id: v.id })).site; unpublished = true; dirty = false; render(); toast("Версия возвращена в черновик"); } catch (e) { toast(e.message, true); } } }))) : [el("small", { text: "Версии появятся после первой публикации" })]))).catch(() => {});
    api("notify").then((j) => { nt.tg_chat = j.tg_chat; nt.email = j.email;
      const sv = async (test) => { try { await api("notify", { tg_chat: nt.tg_chat, email: nt.email, tg_token: nt.tg_token, test }); toast(test ? "Сохранено, проверочное уведомление отправлено" : "Сохранено"); } catch (e) { toast(e.message, true); } };
      nbox.replaceChildren(F.text("Почта для заявок", nt, "email", { ph: "name@mail.ru", quiet: true }),
        F.text("Токен Telegram-бота" + (j.tg_token_set ? " (уже сохранён, поле можно не трогать)" : ""), nt, "tg_token", { type: "password", quiet: true, hint: "Создаётся в Telegram у @BotFather. Хранится на сервере и на сайте не показывается" }),
        F.text("Номер чата Telegram", nt, "tg_chat", { quiet: true, hint: "Ваш ID: напишите боту @userinfobot, он пришлёт число" }),
        el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, el("button", { class: "btn", text: "Сохранить", onclick: () => sv(false) }), el("button", { class: "btn", text: "Сохранить и проверить", onclick: () => sv(true) })));
    }).catch(() => {});
    return [el("h1", { text: "Настройки" }), el("p", { class: "sub", text: "Вы вошли как " + USER + "." }),
      box("Уведомления о заявках", "почта и Telegram", [nbox], true),
      box("История версий", "последние 30 публикаций", [vbox]),
      box("Сменить пароль", null, [F.text("Текущий пароль", pw, "old", { type: "password", quiet: true }), F.text("Новый пароль (от 10 символов)", pw, "n1", { type: "password", quiet: true }), F.text("Новый пароль ещё раз", pw, "n2", { type: "password", quiet: true }),
        el("button", { class: "btn", style: "justify-self:start", text: "Сменить пароль", onclick: async () => { if (pw.n1 !== pw.n2) return toast("Новые пароли не совпадают", true); try { await api("password", { old: pw.old, new: pw.n1 }); toast("Пароль изменён"); } catch (e) { toast(e.message, true); } } })]),
      el("button", { class: "btn", text: "Выйти", onclick: async () => { await saveDraft(); try { await api("logout", {}); } catch (e) {} USER = null; CSRF = null; screenLogin(); } })];
  };

  /* ---------- каркас ---------- */
  const TABS = [["leads", "Заявки"], ["courses", "Курсы"], ["home", "Главная"], ["contacts", "Контакты"], ["pages", "Тексты"], ["look", "Оформление"], ["set", "Настройки"]];
  function paintTabs() { const n = LEADS.filter((l) => l.status === "new").length; const t = $('[data-tab="leads"]'); if (t) t.replaceChildren("Заявки", n ? el("b", { text: n }) : ""); }
  function render() {
    app.replaceChildren(
      el("header", { class: "top" }, el("div", { class: "top__in" }, el("span", { class: "top__name", text: "АлтынНур" }), el("span", { class: "state", id: "state" }),
        el("button", { class: "btn", text: "Посмотреть", onclick: preview }), el("button", { class: "btn btn--acc", id: "pubBtn", text: "Опубликовать", onclick: publish })),
        el("nav", { class: "tabs", role: "tablist" }, TABS.map(([id, n]) => el("button", { class: "tab", role: "tab", "data-tab": id, "aria-selected": String(TAB === id), text: n, onclick: () => { TAB = id; render(); window.scrollTo(0, 0); } })))),
      el("main", { class: "wrap" }, DEMO ? el("div", { class: "demo", text: "Пробный режим. Так выглядит админка: можно менять всё и нажимать «Посмотреть». Изменения остаются только в этом браузере, сайт не меняется." }) : null, V[TAB]()));
    paintTabs(); paintState();
  }
  function screenLogin(msg) {
    const d = { login: "", pass: "" }, m = el("div", { class: "msg", text: msg || "" });
    const go = async (e) => { e.preventDefault(); m.textContent = ""; try { const j = await api("login", d); USER = j.user; CSRF = j.csrf; await boot2(); } catch (er) { m.textContent = er.message; } };
    app.replaceChildren(el("form", { class: "login", onsubmit: go }, el("h1", { text: "АлтынНур" }), el("p", { class: "sub", style: "margin:0", text: "Вход в админку сайта" }),
      F.wrap("Логин", el("input", { type: "text", autocomplete: "username", autocapitalize: "none", required: true, oninput: (e) => (d.login = e.target.value) })),
      F.wrap("Пароль", el("input", { type: "password", autocomplete: "current-password", required: true, oninput: (e) => (d.pass = e.target.value) })), m,
      el("button", { class: "btn btn--acc", text: "Войти" })));
  }
  function screenInstall() {
    const d = { db_host: "localhost", db_name: "", db_user: "", db_pass: "", base_url: location.origin + location.pathname.replace(/admin\/?(index\.html)?$/, "").replace(/\/$/, ""), login: "", pass: "" }, m = el("div", { class: "msg" });
    const inp = (label, k, type, hint) => F.wrap(label, el("input", { type: type || "text", value: d[k], autocapitalize: "none", oninput: (e) => (d[k] = e.target.value) }), hint);
    const go = async (e) => { e.preventDefault(); m.textContent = ""; try { await api("install", d); const j = await api("login", { login: d.login, pass: d.pass }); USER = j.user; CSRF = j.csrf; await boot2(); toast("Готово. Нажмите «Опубликовать», чтобы сайт начал брать данные из админки"); } catch (er) { m.textContent = er.message; } };
    app.replaceChildren(el("form", { class: "login", style: "margin-top:5vh", onsubmit: go }, el("h1", { text: "Установка" }), el("p", { class: "sub", style: "margin:0", text: "Один раз: подключаем базу данных и создаём вход в админку. База создаётся в панели хостинга, раздел «MySQL»." }),
      inp("Адрес базы", "db_host", "text", "На Beget обычно localhost"), inp("Имя базы", "db_name"), inp("Пользователь базы", "db_user"), inp("Пароль базы", "db_pass", "password"), inp("Адрес сайта", "base_url", "text", "Например: https://altynnur.ru"),
      inp("Логин для админки", "login", "text", "Латинскими буквами"), inp("Пароль для админки", "pass", "password", "Не короче 10 символов"), m, el("button", { class: "btn btn--acc", text: "Установить" })));
  }
  async function boot2() {
    const j = await api("draft"); S = j.site; META = { draft_at: j.draft_at, published_at: j.published_at };
    unpublished = !j.published_at || (j.draft_at && j.draft_at > j.published_at);
    try { LEADS = (await api("leads")).items; } catch (e) { LEADS = []; }
    TAB = LEADS.some((l) => l.status === "new") ? "leads" : "courses"; render();
  }
  (async function boot() {
    let p = null;
    try { const r = await fetch(API + "?r=ping", { credentials: "same-origin" }); p = await r.json(); } catch (e) {}
    if (!p || p.ok !== true) { DEMO = true; S = await demoLoad(); TAB = "courses"; return render(); }
    if (!p.installed) return screenInstall();
    if (!p.user) return screenLogin();
    USER = p.user; CSRF = p.csrf; boot2().catch((e) => toast(e.message, true));
  })();
})();
