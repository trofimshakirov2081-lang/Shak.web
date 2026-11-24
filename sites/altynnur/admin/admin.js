/* Админка АлтынНур. Без сборки и библиотек.
   Если сервера нет (превью на GitHub Pages), работает в пробном режиме: изменения остаются в этом браузере. */
(function () {
  "use strict";
  const API = "../api/";
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  let S = null;          // данные сайта (черновик)
  let DEMO = false, CSRF = null, USER = null;
  const GHM = !!window.GH;  // сайт на GitHub Pages: данные и фото хранятся в репозитории
  const GKEY = "altyn-gh-draft", IMG = {};
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
  function fail(t) { toast(t, true); setTimeout(() => alert("Не сохранилось: " + t), 50); }
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
      else if (GHM) { META.draft_at = new Date().toISOString().slice(0, 19).replace("T", " "); try { localStorage.setItem(GKEY, JSON.stringify({ site: S, at: META.draft_at })); } catch (er) { throw new Error("Не хватает места для черновика в браузере. Опубликуйте изменения сейчас"); } }
      else META.draft_at = (await api("draft", { site: S })).draft_at;
      dirty = false;
    } catch (e) { fail(e.message); }
    saving = false; paintState();
  }
  async function publish() {
    clearTimeout(saveT); beforeSave();
    if (DEMO) { localStorage.setItem(DKEY, JSON.stringify(S)); toast("Пробный режим: на сервере это опубликует сайт"); return; }
    const b = $("#pubBtn"); b.disabled = true; b.textContent = "Публикуем…";
    try {
      if (GHM) { await GH.publish(S); META.published_at = new Date().toISOString().slice(0, 19).replace("T", " "); try { localStorage.removeItem(GKEY); } catch (e) {} toast("Опубликовано. Сайт обновится примерно через минуту"); }
      else { META.published_at = (await api("publish", { site: S })).published_at; toast("Опубликовано. Сайт обновлён"); }
      dirty = false; unpublished = false;
    }
    catch (e) { fail(e.message + ". Изменения остались в черновике на этом устройстве, попробуйте опубликовать ещё раз"); }
    b.textContent = "Опубликовать"; paintState();
  }
  function preview() {
    beforeSave();
    try { localStorage.setItem("altyn-admin-draft", JSON.stringify(S)); } catch (e) { return toast("Не удалось открыть просмотр", true); }
    window.open("../?draft=1", "_blank");
  }
  function paintState() {
    const st = $("#state"), b = $("#pubBtn"); if (!st) return;
    st.textContent = dirty ? "Сохраняем…" : unpublished ? (GHM ? "Черновик сохранён на этом устройстве. На сайте ещё старая версия" : "Черновик сохранён. На сайте ещё старая версия") : META.published_at ? "Опубликовано " + hhmm(META.published_at) : "Ещё не опубликовано";
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
    const paint = () => { pv.style.backgroundImage = o[k] ? `url("${IMG[o[k]] || "../" + String(o[k]).replace(/"/g, "") + "-640.webp"}")` : "none"; };
    const file = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp", style: "display:none", onchange: async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (DEMO) return toast("Пробный режим: загрузка фото работает на сервере", true);
      const ticket = (file.ticket = (file.ticket || 0) + 1); // если пока грузилось, выбрали другое фото, старый ответ не перезапишет новый
      if (GHM) {
        toast("Загружаем фото…");
        try { const r = await GH.uploadPhoto(f); if (ticket !== file.ticket) return; IMG[r.src] = r.preview; o[k] = r.src; paint(); touch(); toast("Фото загружено"); } catch (er) { if (ticket === file.ticket) fail(er.message); }
        e.target.value = ""; return;
      }
      const fd = new FormData(); fd.append("file", f); toast("Загружаем фото…");
      try { const src = (await api("upload", fd, true)).src; if (ticket !== file.ticket) return; o[k] = src; paint(); touch(); toast("Фото загружено"); } catch (er) { if (ticket === file.ticket) fail(er.message); }
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
  // перетаскивание строк пальцем или мышью за ручку ⠿: остальные строки расступаются, порядок меняется в данных
  function dragSort(container, rowSel, onMove) {
    container.addEventListener("pointerdown", (e) => {
      const h = e.target.closest(".drag"); if (!h) return; const row = h.closest(rowSel); if (!row) return;
      e.preventDefault(); const rows = [...container.querySelectorAll(":scope > " + rowSel)], from = rows.indexOf(row); let to = from;
      const y0 = e.clientY, rects = rows.map((r) => r.getBoundingClientRect()); row.classList.add("dragging"); h.setPointerCapture(e.pointerId);
      const move = (ev) => { const dy = ev.clientY - y0; row.style.transform = `translateY(${dy}px)`; const cy = rects[from].top + rects[from].height / 2 + dy;
        to = rects.findIndex((r) => cy < r.top + r.height / 2); if (to < 0) to = rows.length - 1; else if (to > from) to -= 1; };
      const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up); row.style.transform = ""; row.classList.remove("dragging"); if (to !== from) onMove(from, to); };
      h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
    });
  }
  F.list = (arr, opt) => {
    const box = el("div", { class: "list" }); let openI = -1;
    if (!opt.fixed) dragSort(box, ".item", (a, b) => { const [x] = arr.splice(a, 1); arr.splice(b, 0, x); openI = -1; draw(); touch(); });
    const draw = () => {
      box.replaceChildren(...arr.map((it, i) => {
        const ttl = el("span", { class: "ttl", text: opt.title(it) || opt.untitled || "Без названия" });
        const meta = opt.meta ? el("span", { class: "meta", text: opt.meta(it) }) : null;
        const d = el("details", { class: "item", open: i === openI, ontoggle: (e) => { if (e.target.open) openI = i; else if (openI === i) openI = -1; } },
          el("summary", {}, opt.fixed ? null : el("span", { class: "drag", "aria-label": "Перетащить", title: "Перетащить", text: "⠿" }), ttl, meta, opt.fixed ? null : el("span", { class: "ord" },
            el("button", { type: "button", class: "ic", "aria-label": "Выше", text: "↑", disabled: i === 0, onclick: (e) => { e.preventDefault(); [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; openI = -1; draw(); touch(); } }),
            el("button", { type: "button", class: "ic", "aria-label": "Ниже", text: "↓", disabled: i === arr.length - 1, onclick: (e) => { e.preventDefault(); [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; openI = -1; draw(); touch(); } }))),
          el("div", { class: "item__in" }, opt.fields(it, () => { ttl.textContent = opt.title(it) || opt.untitled || "Без названия"; if (meta) meta.textContent = opt.meta(it); }),
            opt.fixed ? null : el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, el("button", { type: "button", class: "btn btn--sm", text: "Копировать как шаблон", onclick: () => { const c = JSON.parse(JSON.stringify(it)); ["name", "t", "title", "q", "code"].forEach((k) => { if (c[k]) c[k] += k === "code" ? "2" : " (копия)"; }); if ("slug" in c) c.slug = ""; arr.splice(i + 1, 0, c); openI = i + 1; draw(); touch(); } }),
            el("button", { type: "button", class: "btn btn--sm btn--bad", text: opt.del || "Удалить", onclick: () => { if (confirm("Удалить «" + (opt.title(it) || "элемент") + "»?")) { arr.splice(i, 1); openI = -1; if (opt.onChange) opt.onChange(); draw(); touch(); } } }))));
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
    if (GHM) return [el("h1", { text: "Заявки" }), el("p", { class: "sub", text: "Заявки с сайта приходят вам сразу в WhatsApp: имя, телефон и выбранный курс. Здесь они не хранятся, поэтому отвечайте прямо в мессенджере." })];
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
        el("div", { class: "f" }, el("span", { text: "Вопросы об этом курсе (покажутся на его странице первыми)" }), F.list(c.faq || (c.faq = []), { add: "Добавить вопрос", untitled: "Новый вопрос", title: (f) => f.q, blank: () => ({ q: "", a: "" }), fields: (f, re2) => [F.text("Вопрос", f, "q", { on: re2, ph: "Нужен ли опыт?" }), F.area("Ответ", f, "a", { max: 800 })] })),
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

  const BLOCKS = { compare: "Сравнение курсов", calc: "Калькулятор дохода", referral: "Приведи подругу", notify: "Сообщить о наборе", promo: "Акция", batches: "Ближайшие наборы", numbers: "Цифры", reviews: "Отзывы", cert: "Сертификат", gallery: "Фото-блок", hero: "Первый экран", directions: "Направления обучения", featured: "Курсы и цены", enroll: "Блок записи", zoom: "Фото-сцена «Как мы учим»", teacher: "Преимущества и преподаватель", manifest: "Текст с мини-фото", ribbon: "Лента фото" };
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
      box("Первый экран", "заголовок и фото", [F.area("Заголовок", S.hero, "title", { max: 160 }), F.area("Короткий текст под заголовком", S.hero, "short", { max: 240 }), F.img("Главное фото", S.hero, "photo", "alt"),
        el("div", { class: "f" }, el("span", { text: "Ещё два фото: стоят рядом с главным, как альбом" }), F.list(Array.isArray(S.hero.more) ? S.hero.more : (S.hero.more = []), { title: (it) => it.alt, untitled: "Фото", fields: (it) => [F.img("Фото", it, "src", "alt")], blank: () => ({ src: "", alt: "" }), add: "Добавить фото", del: "Убрать фото" }))], true),
      el("p", { class: "sub" }, "Порядок и показ блоков: вкладка ", el("a", { href: "#", onclick: (e) => { e.preventDefault(); TAB = "sections"; render(); } }, "«Разделы сайта»"), "."),
      box("Блок записи", null, [F.area("Заголовок", S.enroll, "title", { max: 160 }), F.area("Текст", S.enroll, "text", { max: 400 }), F.img("Фото", S.enroll, "photo", "alt")]),
      box("Фото-сцена «Как мы учим»", null, [F.text("Надпись над заголовком", S.zoom, "kicker"), F.text("Заголовок", S.zoom, "title"), F.img("Главное фото", S.zoom, "main", "alt"),
        el("div", { class: "f" }, el("span", { text: "Четыре боковых фото" }), F.list(S.zoom.side, { fixed: true, title: (p) => p.cap, untitled: "Фото", fields: (p, re) => [F.text("Подпись", p, "cap", { on: re }), F.img("Фото", p, "src")] }))]),
      box("Преимущества", "плитки с фото", [F.list(S.advantages, { add: "Добавить преимущество", title: (a) => a.t, blank: () => ({ t: "", short: "", d: "", photo: "" }),
        fields: (a, re) => [F.text("Заголовок", a, "t", { on: re }), F.text("Короткая подпись на плитке", a, "short"), F.area("Описание", a, "d", { max: 400 }), F.img("Фото", a, "photo")] })])];
  };

  const TYPES = [["text", "📄", "Текст"], ["text-photo", "🖼", "Текст и фото"], ["list", "☰", "Список"], ["gallery", "▦", "Фото"], ["cards", "▤", "Карточки"], ["quote", "❝", "Цитата"],
    ["stats", "#", "Цифры"], ["cta", "→", "Кнопка"], ["video", "▶", "Видео"], ["form", "✎", "Форма заявки"], ["accordion", "▾", "Вопрос-ответ"], ["divider", "—", "Разделитель"]];
  const bName = (id) => { if (id.startsWith("b:")) { const b = (S.blocks || []).find((x) => "b:" + x.id === id); const t = TYPES.find((x) => x[0] === (b && b.type)); return "Свой блок: " + ((b && b.title) || (t ? t[2] : "без названия")); } return BLOCKS[id] || id; };
  /* ---------- разделы сайта: один список, порядок и показ ---------- */
  V.sections = () => {
    if (!Array.isArray(S.homeOff)) S.homeOff = [];
    const all = Object.keys(BLOCKS).concat((S.blocks || []).map((b) => "b:" + b.id)); S.homeOff = S.homeOff.filter((b) => all.includes(b) && !S.home.includes(b)); all.forEach((b) => { if (!S.home.includes(b) && !S.homeOff.includes(b)) S.homeOff.push(b); });
    const list = el("div", { class: "list blocks" });
    const empty = (b) => { const d = { promo: S.promo && S.promo.title, batches: (S.batches || []).length, numbers: (S.numbers || []).length, reviews: (S.reviews || []).length, cert: S.cert && ((S.cert.photos || []).length || S.cert.text), gallery: S.gallery && (S.gallery.photos || []).length }; return b in d && !d[b]; };
    const draw = () => { const on = S.home, off = S.homeOff;
      list.replaceChildren(...on.map((b, i) => el("div", { class: "brow" }, el("span", { class: "drag", text: "⠿", "aria-label": "Перетащить" }),
          el("button", { type: "button", class: "ic", text: "↑", "aria-label": "Выше", disabled: i === 0, onclick: () => { [on[i - 1], on[i]] = [on[i], on[i - 1]]; draw(); touch(); } }),
          el("button", { type: "button", class: "ic", text: "↓", "aria-label": "Ниже", disabled: i === on.length - 1, onclick: () => { [on[i + 1], on[i]] = [on[i], on[i + 1]]; draw(); touch(); } }),
          el("span", { style: "flex:1", text: bName(b) }, empty(b) ? el("small", { style: "display:block;color:var(--ink2)", text: "пока пустой, на сайте не виден: заполните во вкладке «Продажи»" }) : null),
          el("label", { class: "chk" }, el("input", { type: "checkbox", checked: true, onchange: () => { on.splice(i, 1); off.unshift(b); draw(); touch(); } }), el("span", { text: "Показан" })))),
        off.length ? el("p", { class: "sub", style: "margin:14px 0 4px", text: "Скрытые разделы" }) : "",
        ...off.map((b, i) => el("div", { class: "brow", style: "opacity:.65" }, el("span", { style: "flex:1", text: bName(b) }),
          el("label", { class: "chk" }, el("input", { type: "checkbox", checked: false, onchange: () => { off.splice(i, 1); on.push(b); draw(); touch(); } }), el("span", { text: "Скрыт" })))));
    };
    dragSort(list, ".brow", (a, b) => { if (a >= S.home.length || b >= S.home.length) return; const [x] = S.home.splice(a, 1); S.home.splice(b, 0, x); draw(); touch(); });
    draw();
    return [el("h1", { text: "Разделы сайта" }), el("p", { class: "sub", text: "Порядок блоков на главной: тяните за ⠿ или жмите стрелки. Галочка показывает или скрывает раздел." }), list];
  };

  /* ---------- конструктор своих блоков ---------- */
  V.build = () => { if (!Array.isArray(S.blocks)) S.blocks = []; const pos = { where: "end" };
    const add = (t) => { const id = Date.now().toString(36); S.blocks.push({ id, type: t, on: true, title: "", text: "", align: "left", bg: "none", photos: [], size: "m", side: "right", btn: t === "cta" ? "Записаться" : "", act: "enroll", url: "", waText: "", course: "" });
      if (pos.where === "start") S.home.unshift("b:" + id); else if (pos.where === "hidden") { (S.homeOff = S.homeOff || []).unshift("b:" + id); } else S.home.push("b:" + id); touch(); render(); toast("Блок создан, заполните его ниже"); setTimeout(() => { const n = [...document.querySelectorAll(".bl-list > .item")].pop(); if (n) { n.open = true; n.scrollIntoView({ block: "start" }); } }, 60); };
    const hint = { text: "Абзацы с новой строки.", list: "Каждый пункт с новой строки.", cards: "Каждая карточка с новой строки: Заголовок :: текст", stats: "Каждая цифра с новой строки: 8 лет :: опыт преподавания", accordion: "Каждый вопрос с новой строки: Вопрос :: Ответ", quote: "Текст цитаты. Заголовок станет подписью автора." };
    const fields = (b, re) => { const T = b.type, F2 = [onHome("b:" + b.id), F.bool("Показывать этот блок", b, "on"), F.sel("Вид блока", b, "type", TYPES.map((t) => [t[0], t[1] + " " + t[2]]), { hint: "Поменяйте, если нужен другой вид. Тексты сохранятся" })];
      if (T !== "divider") F2.push(F.text(T === "quote" ? "Подпись (автор)" : "Заголовок", b, "title", { on: re }));
      else F2.push(F.text("Надпись на разделителе (можно пусто)", b, "title", { on: re }));
      if (T !== "divider" && T !== "gallery") F2.push(F.area("Текст", b, "text", { max: 3000, hint: hint[T] || "" }));
      if (T === "gallery") F2.push(F.area("Подпись под заголовком", b, "text", { max: 400 }));
      if (["text-photo", "gallery", "video"].includes(T)) F2.push(F.photos(T === "video" ? "Фото, если видео нет" : "Фото", b, "photos"));
      if (T === "text-photo") F2.push(F.sel("Где фото", b, "side", [["right", "Справа"], ["left", "Слева"], ["top", "Сверху"]]));
      if (T === "gallery" || T === "video") F2.push(F.sel("Размер", b, "size", SIZES));
      if (T === "video") F2.push(F.text("Ссылка на видео", b, "url", { ph: "YouTube, Rutube или VK Видео", max: 400 }));
      if (!["divider", "quote", "stats", "accordion"].includes(T)) F2.push(F.text("Кнопка (пусто: без кнопки)", b, "btn", { ph: "Записаться" }), F.sel("Что делает кнопка", b, "act", [["enroll", "Открывает заявку"], ["wa", "Пишет в WhatsApp"], ["link", "Ведёт по ссылке"]]),
        F.text("Ссылка для кнопки", b, "url", { ph: "https://... или courses/", max: 400, hint: "Только если кнопка ведёт по ссылке" }), F.sel("Курс в заявке", b, "course", [["", "Не выбран"]].concat(S.courses.map((c) => [c.slug, c.name]))));
      if (T !== "divider") F2.push(row2(F.sel("Текст по", b, "align", [["left", "Левому краю"], ["center", "Центру"], ["right", "Правому краю"]]), F.sel("Фон", b, "bg", [["none", "Без фона"], ["card", "Карточка"], ["accent", "С золотой рамкой"]])));
      return F2; };
    const clean = () => { const ids = new Set(S.blocks.map((b) => "b:" + b.id)); S.home = S.home.filter((x) => !x.startsWith("b:") || ids.has(x)); S.homeOff = (S.homeOff || []).filter((x) => !x.startsWith("b:") || ids.has(x)); };
    const list = F.list(S.blocks, { title: (b) => b.title || (TYPES.find((t) => t[0] === b.type) || [, , "Блок"])[2], meta: (b) => (TYPES.find((t) => t[0] === b.type) || [, ""])[1] + (b.on === false ? " скрыт" : ""), untitled: "Блок", fields, del: "Удалить блок", blank: () => ({}), onChange: clean });
    list.classList.add("bl-list"); const addBtn = list.querySelector(":scope > .btn"); if (addBtn) addBtn.remove();
    return [el("h1", { text: "Конструктор блоков" }), el("p", { class: "sub", text: "Создайте любой блок с нуля: выберите вид, заполните текст, фото и кнопку. Порядок на главной: стрелки у блока или вкладка «Разделы сайта»." }),
      box("Новый блок", "выберите вид", [F.sel("Куда поставить", pos, "where", [["end", "В конец главной"], ["start", "В начало главной"], ["hidden", "Пока скрыть"]]),
        el("div", { class: "types" }, TYPES.map(([id, ic, n]) => el("button", { type: "button", class: "type", onclick: () => add(id) }, el("b", { text: ic }), el("span", { text: n }))))], true),
      S.blocks.length ? box("Ваши блоки", S.blocks.length + " шт.", [list], true) : el("p", { class: "sub", text: "Своих блоков пока нет." })];
  };

  /* ---------- раздел «Продажи»: акции, промокоды, наборы, отзывы, цифры, сертификат, фото ---------- */
  const SIZES = [["s", "Небольшой"], ["m", "Средний"], ["l", "На всю ширину"]];
  F.photos = (label, o, k) => { if (!Array.isArray(o[k])) o[k] = [];
    return el("div", { class: "f" }, el("span", { text: label }), el("small", { style: "color:var(--ink2)", text: "1 фото будет большим, 2 встанут рядом, 3 в ряд, больше сеткой. Можно без фото." }),
      F.list(o[k], { title: (p) => (p.video ? "▶ " : "") + (p.alt || ""), untitled: "Фото", fields: (p) => [F.img(p.video ? "Обложка видео" : "Фото", p, "src", "alt"), p.video ? el("small", { style: "color:var(--ink2)", text: "Видео: " + p.video + ". На сайте играет без звука, по кругу" }) : null], blank: () => ({ src: "", alt: "" }), add: "Добавить фото", del: "Убрать" }),
      el("label", { class: "btn btn--sm", style: "justify-self:start;cursor:pointer" }, "Добавить видео", el("input", { type: "file", accept: "video/mp4,video/quicktime,video/*", style: "display:none", onchange: async (e) => {
        const f = e.target.files[0]; e.target.value = ""; if (!f) return;
        if (!GHM) return toast(DEMO ? "Пробный режим: видео загружается на рабочем сайте" : "Видео загружается только в GitHub-версии сайта", true);
        toast("Загружаем видео, это может занять минуту…");
        try { const r = await GH.uploadVideo(f); IMG[r.src] = r.preview; o[k].push({ src: r.src, video: r.video, alt: "Видео с занятия" }); touch(); render(); toast("Видео загружено. Нажмите «Опубликовать»"); } catch (er) { fail(er.message); } } })),
      el("small", { style: "color:var(--ink2)", text: "Видео лучше короткое, 5-15 секунд, до 30 МБ." })); };
  // галочка «показывать» и место блока на главной: стрелки двигают его выше или ниже среди остальных блоков
  const onHome = (id) => { const box2 = el("div", { class: "brow", style: "flex-wrap:wrap;gap:8px" });
    const draw = () => { const i = S.home.indexOf(id), shown = i >= 0;
      box2.replaceChildren(el("label", { class: "chk", style: "font-weight:600;flex:1 1 auto" }, el("input", { type: "checkbox", checked: shown, onchange: (e) => { S.home = S.home.filter((b) => b !== id); if (e.target.checked) S.home.splice(Math.min(1, S.home.length), 0, id); touch(); draw(); } }), el("span", { text: "Показывать на главной" })),
        shown ? el("span", { style: "color:var(--ink2);font-size:.9rem", text: `место ${i + 1} из ${S.home.length}` + (S.home[i - 1] ? `, после «${bName(S.home[i - 1])}»` : ", первым") }) : null,
        shown ? el("button", { type: "button", class: "ic", text: "↑", "aria-label": "Выше", disabled: i === 0, onclick: () => { [S.home[i - 1], S.home[i]] = [S.home[i], S.home[i - 1]]; touch(); draw(); } }) : null,
        shown ? el("button", { type: "button", class: "ic", text: "↓", "aria-label": "Ниже", disabled: i === S.home.length - 1, onclick: () => { [S.home[i + 1], S.home[i]] = [S.home[i], S.home[i + 1]]; touch(); draw(); } }) : null); };
    draw(); return box2; };
  const ensure = (k, def) => { if (!S[k] || typeof S[k] !== "object") S[k] = def; return S[k]; };
  V.sales = () => {
    const pr = ensure("promo", { on: true, kicker: "Акция", title: "", text: "", until: "", btn: "Записаться со скидкой", photos: [], size: "m", codes: [] }); if (!Array.isArray(pr.codes)) pr.codes = [];
    const pay = ensure("pay", { on: false, text: "Можно оплатить частями" }), ce = ensure("cert", { on: true, title: "Сертификат после обучения", text: "", photos: [], size: "m" }), ga = ensure("gallery", { on: true, title: "Как проходят занятия", text: "", photos: [], size: "m" });
    ["batches", "numbers", "reviews"].forEach((k) => { if (!Array.isArray(S[k])) S[k] = []; });
    const courses = [["", "Выберите курс"]].concat(S.courses.map((c) => [c.slug, c.name]));
    return [el("h1", { text: "Продажи и доверие" }), el("p", { class: "sub", text: "То, что помогает решиться на запись. Блок появляется на главной, когда он заполнен и стоит галочка «Показывать на главной». Порядок блоков меняется на вкладке «Главная»." }),
      box("Акция", "скидка, подарок, срок", [onHome("promo"), F.text("Метка", pr, "kicker", { ph: "Акция" }), F.text("Заголовок", pr, "title", { ph: "Например: −10% на курс ресниц до конца месяца" }), F.area("Текст", pr, "text", { max: 400 }),
        row2(F.text("До какого числа", pr, "until", { ph: "30 ноября" }), F.text("Надпись на кнопке", pr, "btn")), F.photos("Фото акции", pr, "photos"), F.sel("Размер фото", pr, "size", SIZES)], true),
      box("Промокоды", "поле в форме заявки", [el("small", { style: "color:var(--ink2)", text: "Когда есть хотя бы один промокод, в форме заявки появляется поле «Промокод». Неверный код сайт не примет, верный придёт вам в сообщении с заявкой." }),
        F.list(pr.codes, { title: (c) => c.code, untitled: "Новый промокод", add: "Добавить промокод", blank: () => ({ code: "", text: "" }), fields: (c, re) => [row2(F.text("Промокод", c, "code", { on: re, ph: "ЗОЛОТО" }), F.text("Что даёт", c, "text", { ph: "скидка 10%" }))] })]),
      box("Оплата частями", null, [F.bool("Показывать «можно частями» у цен", pay, "on"), F.text("Текст", pay, "text")]),
      box("Ближайшие наборы", "даты и свободные места", [onHome("batches"), F.text("Подпись под заголовком", S, "batchesNote", { ph: "Например: группы до 3 человек" }),
        F.list(S.batches, { title: (b) => [b.start, (S.courses.find((c) => c.slug === b.course) || {}).name].filter(Boolean).join(", "), untitled: "Новый набор", add: "Добавить набор", blank: () => ({ course: "", start: "", format: "", seats: "", on: true }),
          fields: (b, re) => [F.sel("Курс", b, "course", courses, { hint: "" }), row2(F.text("Дата старта", b, "start", { ph: "1 декабря", on: re }), F.text("Свободных мест", b, "seats", { ph: "3", hint: "3 и меньше: «Осталось 3 места». 0: «Мест нет»" })), F.text("Формат", b, "format", { ph: "Будни, 10:00-17:00" }), F.bool("Показывать", b, "on")] })]),
      box("Цифры", "опыт, выпускницы", [onHome("numbers"), F.list(S.numbers, { title: (n) => [n.n, n.t].filter(Boolean).join(" "), untitled: "Новая цифра", add: "Добавить цифру", blank: () => ({ n: "", t: "" }),
        fields: (n, re) => [row2(F.text("Число", n, "n", { ph: "8 лет", on: re }), F.text("Подпись", n, "t", { ph: "преподаю наращивание", on: re }))] })]),
      box("Отзывы", "только настоящие", [onHome("reviews"), F.list(S.reviews, { title: (r) => r.name, untitled: "Новый отзыв", add: "Добавить отзыв", blank: () => ({ name: "", course: "", text: "", stars: "5", photos: [] }),
        fields: (r, re) => [row2(F.text("От кого (имя)", r, "name", { on: re }), F.text("Курс", r, "course")), F.sel("Оценка", r, "stars", [["5", "★★★★★ 5"], ["4", "★★★★ 4"], ["3", "★★★ 3"], ["2", "★★ 2"], ["1", "★ 1"], ["", "Без звёзд"]]), F.area("Текст отзыва", r, "text", { max: 800 }), F.photos("Скриншоты или фото (можно без них)", r, "photos")] })]),
      box("Сертификат", null, [onHome("cert"), F.text("Заголовок", ce, "title"), F.area("Текст", ce, "text", { max: 400, ph: "" }), F.photos("Фото сертификата", ce, "photos"), F.sel("Размер фото", ce, "size", SIZES)]),
      box("Сравнение курсов", "таблица: что входит", [onHome("compare"), F.text("Заголовок", ensure("compare", { on: true, title: "Какой курс выбрать", text: "", courses: ["lashes", "lashes-pro"] }), "title"), F.area("Подпись", S.compare, "text", { max: 300 }),
        F.multi("Какие курсы сравнить (2-3)", S.compare, "courses", S.courses.map((c) => [c.slug, c.name]))]),
      box("Калькулятор дохода", "когда окупится курс", [onHome("calc"), F.text("Заголовок", ensure("calc", { on: true, title: "Когда окупится обучение", text: "", course: "lashes-pro", price: 2500, per: 3, note: "Расчёт примерный, без учёта материалов и аренды.", btn: "Записаться на курс" }), "title"),
        F.area("Подпись", S.calc, "text", { max: 300 }), F.sel("Курс по умолчанию", S.calc, "course", S.courses.map((c) => [c.slug, c.name])),
        row2(F.text("Цена процедуры, ₽", S.calc, "price", { type: "number", mode: "numeric" }), F.text("Клиенток в неделю", S.calc, "per", { type: "number", mode: "numeric" })), F.text("Примечание", S.calc, "note"), F.text("Кнопка", S.calc, "btn")]),
      box("Приведи подругу", null, [onHome("referral"), F.text("Метка", ensure("referral", { on: true, kicker: "Вдвоём выгоднее", title: "", text: "", btn: "Записаться вдвоём", wa: "Здравствуйте! Хотим записаться на обучение вдвоём с подругой." }), "kicker"),
        F.text("Заголовок", S.referral, "title", { ph: "Приходите с подругой: скидка 10% обеим" }), F.area("Текст", S.referral, "text", { max: 400 }), F.text("Кнопка", S.referral, "btn"), F.text("Сообщение в WhatsApp", S.referral, "wa", { max: 300 })]),
      box("Сообщить о наборе", "если дата не подошла", [onHome("notify"), F.text("Заголовок", ensure("notify", { on: true, title: "Не нашли удобную дату?", text: "Напишите, какой курс интересует, и мы сообщим о следующем наборе.", btn: "Сообщить о наборе" }), "title"),
        F.area("Текст", S.notify, "text", { max: 300 }), F.text("Кнопка", S.notify, "btn")]),
      box("Фото-блок", "любые фото: занятия, студия, выпускницы", [onHome("gallery"), F.text("Заголовок", ga, "title"), F.area("Текст", ga, "text", { max: 400 }), F.photos("Фото", ga, "photos"), F.sel("Размер", ga, "size", SIZES)])];
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

  const ensureD = () => { if (!S.design || typeof S.design !== "object") S.design = { corners: "soft", blur: true, shadow: "soft", fontBody: "" }; return S.design; };
  V.look = () => [el("h1", { text: "Оформление" }), el("p", { class: "sub", text: "Общий вид сайта. Изменения видны после публикации, заранее посмотреть можно кнопкой «Посмотреть»." }),
    box("Цвет, шрифт и движение", null, [
      F.sel("Цвета", S, "theme", [["gold", "Кость и золото"], ["burgundy", "Кость и бордо"], ["night", "Ночное золото"]]),
      F.sel("Шрифт заголовков", S, "font", [["arsenal", "Arsenal (простой)"], ["finlandica", "Finlandica (современный)"], ["bona", "Bona Nova (с засечками)"], ["prata", "Prata (с засечками)"], ["cormorant", "Cormorant (изящный)"]]),
      F.sel("Шрифт текста", ensureD(), "fontBody", [["", "Как задано в шрифте заголовков"], ["ysabeau", "Ysabeau Office"], ["arsenal", "Arsenal"], ["finlandica", "Finlandica"]]),
      F.sel("Углы", ensureD(), "corners", [["soft", "Мягкие, скруглённые"], ["sharp", "Острые"], ["round", "Сильно скруглённые"]]),
      F.bool("Размытие под шапкой и метками (эффект стекла)", ensureD(), "blur"),
      F.sel("Тени у карточек", ensureD(), "shadow", [["soft", "Лёгкие"], ["none", "Без теней"], ["strong", "Заметные"]]),
      el("div", { class: "f" }, el("span", { text: "Готовые наборы" }), el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [["Мягкий", { corners: "round", blur: true, shadow: "soft" }, "arsenal"], ["Строгий", { corners: "sharp", blur: false, shadow: "none" }, "finlandica"], ["Классика", { corners: "soft", blur: true, shadow: "strong" }, "bona"]]
        .map(([n, d, f]) => el("button", { type: "button", class: "btn btn--sm", text: n, onclick: () => { Object.assign(ensureD(), d); S.font = f; touch(); render(); toast("Набор «" + n + "» применён. Нажмите «Посмотреть»"); } })))),
      F.sel("Анимация", S, "anim", [["calm", "Спокойная"], ["soft", "Мягкая"], ["live", "Живая"]]),
      F.sel("Курсы на главной", S, "coursesView", [["flow", "По дуге (карусель)"], ["tiles", "Плиткой"]])], true),
    box("Режим черновика", null, [F.bool("Сайт в режиме черновика", S, "preview"),
      el("small", { style: "color:var(--ink2)", text: GHM ? "Пока включено: посетители видят панель выбора оформления, поисковики сайт не показывают. Перед запуском выключите, и сайт появится в поиске." : "Пока включено: посетители видят панель выбора оформления, поисковики сайт не показывают, а заявка открывает WhatsApp. Перед запуском выключите: заявки начнут сохраняться в раздел «Заявки», а сайт появится в поиске." })], true)];

  V.set = () => {
    if (GHM) {
      const pw = { old: "", n1: "", n2: "" }, vbox = el("div", {}, el("small", { text: "Загружаем…" }));
      GH.history().then((items) => vbox.replaceChildren(...(items.length ? items.map((v) => el("div", { class: "ver" }, el("span", { text: hhmm(v.date.slice(0, 19).replace("T", " ")) }),
        el("button", { class: "btn btn--sm", text: "Вернуть", onclick: async () => { if (!confirm("Вернуть эту версию в черновик? Сайт изменится после публикации")) return; try { S = await GH.loadSite(v.sha); unpublished = true; touch(); render(); toast("Версия возвращена в черновик"); } catch (e) { toast(e.message, true); } } }))) : [el("small", { text: "Версии появятся после первой публикации" })]))).catch((e) => vbox.replaceChildren(el("small", { text: e.message })));
      return [el("h1", { text: "Настройки" }),
        box("История версий", "последние 30 публикаций", [vbox], true),
        box("Сменить пароль", null, [F.text("Текущий пароль", pw, "old", { type: "password", quiet: true }), F.text("Новый пароль (от 8 символов)", pw, "n1", { type: "password", quiet: true }), F.text("Новый пароль ещё раз", pw, "n2", { type: "password", quiet: true }),
          el("button", { class: "btn", style: "justify-self:start", text: "Сменить пароль", onclick: async () => { if (pw.n1 !== pw.n2) return toast("Новые пароли не совпадают", true); try { await GH.changePassword(pw.old, pw.n1); toast("Пароль изменён"); } catch (e) { toast(e.message, true); } } })]),
        el("button", { class: "btn", text: "Выйти", onclick: async () => { await saveDraft(); GH.forget(); screenLoginGH(); } })];
    }
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
  const TABS = [["leads", "Заявки"], ["courses", "Курсы"], ["home", "Главная"], ["sales", "Продажи"], ["build", "Конструктор"], ["sections", "Разделы сайта"], ["contacts", "Контакты"], ["pages", "Тексты"], ["look", "Оформление"], ["set", "Настройки"]];
  function paintTabs() { const n = LEADS.filter((l) => l.status === "new").length; const t = $('[data-tab="leads"]'); if (t) t.replaceChildren("Заявки", n ? el("b", { text: n }) : ""); }
  // поиск по админке: слова, по которым находится вкладка
  const KEYS = { leads: "заявки клиенты", courses: "курсы цены программа фото курса направления", home: "главная первый экран фото заголовок как мы учим преимущества блок записи",
    sales: "продажи сравнение калькулятор доход подруга сообщить о наборе акция скидка промокод частями рассрочка наборы даты места цифры отзывы звёзды сертификат фото-блок галерея", sections: "разделы порядок блоки скрыть показать переставить", build: "конструктор свой блок новый блок текст фото кнопка видео карточки цитата список форма вопрос разделитель",
    contacts: "контакты телефон whatsapp telegram адрес карта график вк", pages: "тексты преподаватель о себе об академии вопросы обучение работы", look: "оформление дизайн цвет шрифт углы скругление размытие стекло тени анимация вид курсов черновик", set: "настройки пароль версии выход" };
  let Q = "", SNAP = null, SNAPTAB = null;
  function snap() { if (SNAPTAB !== TAB) { SNAP = JSON.stringify(S); SNAPTAB = TAB; } }
  // раскрытые разделы и карточки не должны закрываться, когда вкладка перерисовывается (загрузка фото, новый блок, отмена)
  const openKey = (d) => { const p = []; let n = d; while (n && n !== app) { if (n.tagName === "DETAILS") { const sm = n.querySelector(":scope > summary"); p.unshift((sm ? sm.textContent : "").slice(0, 60) + "#" + [...n.parentElement.children].indexOf(n)); } n = n.parentElement; } return p.join("/"); };
  function render() { snap();
    const keep = new Set(), sy = window.scrollY, sameTab = render.lastTab === TAB; render.lastTab = TAB;
    if (sameTab) app.querySelectorAll("main details[open]").forEach((d) => keep.add(openKey(d)));
    app.replaceChildren(
      el("header", { class: "top" }, el("div", { class: "top__in" }, el("span", { class: "top__name", text: "АлтынНур" }), el("span", { class: "state", id: "state" }),
        el("button", { class: "btn btn--icon", text: "↶", "aria-label": "Отменить изменения в разделе", title: "Отменить: вернуть раздел к тому, каким он был, когда вы его открыли", onclick: () => { if (!SNAP || SNAP === JSON.stringify(S)) return toast("В этом разделе нет изменений"); if (!confirm("Отменить все изменения в этом разделе?")) return; S = JSON.parse(SNAP); touch(); render(); toast("Изменения отменены"); } }),
        el("button", { class: "btn", text: "Просмотр", title: "Посмотреть сайт с изменениями", onclick: preview }), el("button", { class: "btn btn--acc", id: "pubBtn", text: "Опубликовать", onclick: publish })),
        el("div", { class: "search" }, el("input", { type: "search", placeholder: "Найти: промокод, отзывы, адрес…", value: Q, oninput: (e) => { Q = e.target.value.trim().toLowerCase(); document.querySelectorAll(".tabs .tab").forEach((t) => { const id = t.dataset.tab; t.hidden = !!Q && !((t.textContent + " " + (KEYS[id] || "")).toLowerCase().includes(Q)); }); },
          onkeydown: (e) => { if (e.key === "Enter") { const t = [...document.querySelectorAll(".tabs .tab")].find((x) => !x.hidden); if (t) t.click(); } } })),
        el("nav", { class: "tabs", role: "tablist" }, TABS.map(([id, n]) => el("button", { class: "tab", role: "tab", "data-tab": id, "aria-selected": String(TAB === id), hidden: !!Q && !((n + " " + (KEYS[id] || "")).toLowerCase().includes(Q)), text: n, onclick: () => { TAB = id; Q = ""; render(); window.scrollTo(0, 0); } })))),
      el("main", { class: "wrap" }, DEMO ? el("div", { class: "demo", text: "Пробный режим. Так выглядит админка: можно менять всё и нажимать «Посмотреть». Изменения остаются только в этом браузере, сайт не меняется." }) : null, V[TAB]()));
    paintTabs(); paintState();
    if (sameTab && keep.size) { app.querySelectorAll("main details").forEach((d) => { if (keep.has(openKey(d))) d.open = true; }); window.scrollTo(0, sy); }
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
  function screenLoginGH(msg) {
    const d = { pass: "", keep: true }, m = el("div", { class: "msg", text: msg || "" });
    const go = async (e) => { e.preventDefault(); m.textContent = ""; const b = e.target.querySelector("button"); b.disabled = true; b.textContent = "Входим…";
      try { await GH.login(d.pass, d.keep); await bootGH(); } catch (er) { m.textContent = er.message; b.disabled = false; b.textContent = "Войти"; } };
    app.replaceChildren(el("form", { class: "login", onsubmit: go }, el("h1", { text: "АлтынНур" }), el("p", { class: "sub", style: "margin:0", text: "Вход в админку сайта" }),
      F.wrap("Пароль", el("input", { type: "password", autocomplete: "current-password", required: true, oninput: (e) => (d.pass = e.target.value) })),
      F.bool("Запомнить на этом устройстве", d, "keep"), m, el("button", { class: "btn btn--acc", text: "Войти" })));
  }
  async function bootGH() {
    const pub = await GH.loadSite();
    let local = null; try { local = JSON.parse(localStorage.getItem(GKEY) || "null"); } catch (e) {}
    S = local ? local.site : pub; META = { draft_at: local ? local.at : null, published_at: null };
    unpublished = !!local; LEADS = []; TAB = "courses"; render();
    if (local) toast("Открыт ваш неопубликованный черновик");
  }
  async function boot2() {
    const j = await api("draft"); S = j.site; META = { draft_at: j.draft_at, published_at: j.published_at };
    unpublished = !j.published_at || (j.draft_at && j.draft_at > j.published_at);
    try { LEADS = (await api("leads")).items; } catch (e) { LEADS = []; }
    TAB = LEADS.some((l) => l.status === "new") ? "leads" : "courses"; render();
  }
  (async function boot() {
    if (GHM) { if (!GH.restore()) return screenLoginGH(); return bootGH().catch((e) => screenLoginGH(e.message)); }
    let p = null;
    try { const r = await fetch(API + "?r=ping", { credentials: "same-origin" }); p = await r.json(); } catch (e) {}
    if (!p || p.ok !== true) { DEMO = true; S = await demoLoad(); TAB = "courses"; return render(); }
    if (!p.installed) return screenInstall();
    if (!p.user) return screenLogin();
    USER = p.user; CSRF = p.csrf; boot2().catch((e) => toast(e.message, true));
  })();
})();
