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
    S.courses.forEach((x, i) => { if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(x.slug || "")) { let s = slugify(x.name || "") || "kurs-" + (i + 1); while (used.has(s)) s += "-2"; x.slug = s; used.add(s); } });
    const slugs = new Set(S.courses.map((x) => x.slug));
    S.featured = (S.featured || []).filter((s) => slugs.has(s));
  }
  // Слияние изменений: base = версия сайта, с которой начали править; mine = наш черновик; theirs = то, что на сайте сейчас.
  // Что поменяли мы, берём наше; что поменяли на сайте без нас (другой человек, Трофим), сохраняем.
  let BASE = null;
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  function merge3(base, mine, theirs) {
    if (eq(mine, base)) return theirs; if (eq(theirs, base) || eq(theirs, mine)) return mine;
    if (isObj(mine) && isObj(theirs)) { const out = {}, b = isObj(base) ? base : {};
      new Set([...Object.keys(mine), ...Object.keys(theirs)]).forEach((k) => { if (!(k in mine) && k in b) return; if (!(k in theirs) && k in b && eq(mine[k], b[k])) return; const v = merge3(b[k], mine[k], theirs[k]); if (v !== undefined) out[k] = v; });
      return out; }
    return mine; }
  function touch() { dirty = true; unpublished = true; paintState(); clearTimeout(saveT); saveT = setTimeout(saveDraft, 700); }
  // номер вкладки: черновик общий для всех вкладок этого браузера, правки соседней вкладки сливаются, а не затираются
  const TABID = Math.random().toString(36).slice(2); let OTHER = false;
  function writeGH() { // синхронно, чтобы успеть при закрытии страницы
    let cur = null; try { cur = JSON.parse(localStorage.getItem(GKEY) || "null"); } catch (e) {}
    if (cur && cur.tab && cur.tab !== TABID && cur.site && (cur.base || BASE)) { const m = merge3(cur.base || BASE, S, cur.site); if (!eq(m, S)) { S = m; OTHER = true; } }
    META.draft_at = new Date().toISOString().slice(0, 19).replace("T", " ");
    localStorage.setItem(GKEY, JSON.stringify({ site: S, base: BASE, at: META.draft_at, tab: TABID }));
  }
  function flushDraft() { if (!dirty || !S) return; clearTimeout(saveT); try { beforeSave(); if (GHM) writeGH(); else if (DEMO) localStorage.setItem(DKEY, JSON.stringify(S)); else return; dirty = false; } catch (e) {} }
  window.addEventListener("pagehide", flushDraft);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushDraft(); else if (OTHER) { OTHER = false; render(); toast("Добавлены правки из другой вкладки"); } });
  window.addEventListener("storage", (e) => { if (e.key !== GKEY || !GHM || !S || !BASE || !e.newValue) return; let o = null; try { o = JSON.parse(e.newValue); } catch (er) {} if (!o || o.tab === TABID) return;
    flushDraft(); const m = merge3(o.base || BASE, S, o.site); if (eq(m, S)) return; S = m; unpublished = true; if (document.hidden) OTHER = true; else { render(); toast("Добавлены правки из другой вкладки"); } });
  async function saveDraft() {
    if (!dirty || saving) return;
    saving = true; clearTimeout(saveT); beforeSave();
    try {
      if (DEMO) { localStorage.setItem(DKEY, JSON.stringify(S)); META.draft_at = new Date().toISOString().slice(0, 19).replace("T", " "); }
      else if (GHM) { try { writeGH(); } catch (er) { throw new Error("Не хватает места для черновика в браузере. Опубликуйте изменения сейчас"); } if (OTHER && !document.hidden) { OTHER = false; render(); toast("Добавлены правки из другой вкладки"); } }
      else META.draft_at = (await api("draft", { site: S })).draft_at;
      dirty = false;
    } catch (e) { fail(e.message); }
    saving = false; paintState();
  }
  // что нельзя публиковать: пустой курс превращается в страницу без названия
  function problems() { const p = []; S.courses.forEach((c, i) => { if (!String(c.name || "").trim()) p.push("У курса №" + (i + 1) + " нет названия"); });
    (S.categories || []).forEach((c, i) => { if (!String(c.name || "").trim()) p.push("У направления №" + (i + 1) + " нет названия"); }); return p; }
  let publishing = false;
  async function publish() {
    if (publishing) return; const pr = problems(); if (pr.length) { TAB = "courses"; render(); return fail(pr.join(". ") + ". Заполните или удалите и опубликуйте снова"); }
    dirty = true; flushDraft(); beforeSave();
    if (DEMO) { localStorage.setItem(DKEY, JSON.stringify(S)); toast("Пробный режим: на сервере это опубликует сайт"); return; }
    const b = $("#pubBtn"); b.disabled = true; b.textContent = "Публикуем…"; publishing = true;
    try {
      if (GHM) { const cur = await GH.loadSite(); if (BASE && !eq(cur, BASE)) { S = merge3(BASE, S, cur); render(); } await GH.publish(S); BASE = JSON.parse(JSON.stringify(S)); META.published_at = new Date().toISOString().slice(0, 19).replace("T", " "); try { localStorage.removeItem(GKEY); } catch (e) {} toast("Опубликовано. Сайт обновится примерно через минуту"); }
      else { META.published_at = (await api("publish", { site: S })).published_at; toast("Опубликовано. Сайт обновлён"); }
      dirty = false; unpublished = false;
    }
    catch (e) { dirty = true; flushDraft(); fail(e.message + ". Изменения остались в черновике на этом устройстве, попробуйте опубликовать ещё раз"); }
    publishing = false; const b2 = $("#pubBtn") || b; b2.textContent = "Опубликовать"; paintState();
  }
  function preview() {
    beforeSave();
    try { localStorage.setItem("altyn-admin-draft", JSON.stringify(S)); } catch (e) { return toast("Не удалось открыть просмотр", true); }
    // просмотр открывает страницу того раздела, где вы сейчас
    const openBox = (t) => [...app.querySelectorAll("main details.box[open] > summary")].some((x) => x.textContent.includes(t));
    let path = "", hash = "";
    if (TAB === "courses") { const it = app.querySelector("main > .list > details.item[open]"); const i = it ? [...it.parentElement.querySelectorAll(":scope > details.item")].indexOf(it) : -1; path = i >= 0 && S.courses[i] && S.courses[i].slug ? "courses/" + S.courses[i].slug + "/" : "courses/"; }
    else if (TAB === "contacts") path = "contacts/";
    else if (TAB === "pages") path = openBox("Частые вопросы") ? "faq/" : openBox("Работы") ? "works/" : openBox("Как проходит") || openBox("Подбор") ? "training/" : "about/";
    else if (TAB === "build") { const it = app.querySelector(".bl-list > details.item[open]"); const i = it ? [...it.parentElement.querySelectorAll(":scope > details.item")].indexOf(it) : -1; const bl = i >= 0 && S.blocks[i]; if (bl) { const pg = S.home.includes("b:" + bl.id) ? "" : ((bl.pages || [])[0] === "course" ? "courses/" + ((S.courses[0] || {}).slug || "") + "/" : (bl.pages || [])[0] ? bl.pages[0] + "/" : ""); path = pg; hash = "#" + (bl.anchor || "cb-" + bl.id); } }
    window.open("../" + path + "?draft=1" + hash, "_blank");
  }
  function paintState() {
    const st = $("#state"), b = $("#pubBtn"); if (!st) return;
    st.textContent = dirty ? "Сохраняем…" : unpublished ? (GHM ? "Черновик сохранён на этом устройстве. На сайте ещё старая версия" : "Черновик сохранён. На сайте ещё старая версия") : META.published_at ? "Опубликовано " + hhmm(META.published_at) : "Ещё не опубликовано";
    if (b) b.disabled = publishing || (!unpublished && !!META.published_at);
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
  // фото первого экрана: плитки «Главное», «Фото 2», «Фото 3» с кнопками под каждой и плитка «+ Добавить фото»
  const pickPhoto = (done) => { const inp = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp", style: "display:none" });
    inp.addEventListener("change", async () => { const f = inp.files[0]; inp.remove(); if (!f) return;
      if (DEMO) return toast("Пробный режим: загрузка фото работает на сервере", true);
      toast("Загружаем фото…");
      try { if (GHM) { const r = await GH.uploadPhoto(f); IMG[r.src] = r.preview; done(r.src); } else { done((await api("upload", (() => { const fd = new FormData(); fd.append("file", f); return fd; })(), true)).src); } toast("Фото загружено. Нажмите «Опубликовать»"); }
      catch (er) { fail(er.message); } });
    document.body.append(inp); inp.click(); };
  const heroPhotos = () => {
    if (!Array.isArray(S.hero.more)) S.hero.more = [];
    const wrap = el("div", { class: "f" });
    const url = (src) => `url("${IMG[src] || "../" + String(src).replace(/"/g, "") + "-640.webp"}")`;
    const draw = () => {
      const more = S.hero.more.filter((m) => m && m.src); S.hero.more = more;
      const tile = (label, src, onRep, onDel) => el("div", { class: "hp-tile" }, el("div", { class: "hp-tile__pv", style: src ? `background-image:${url(src)}` : "" }), el("b", { text: label }),
        el("div", { class: "hp-tile__b" }, el("button", { type: "button", class: "btn btn--sm", text: src ? "Заменить" : "Загрузить", onclick: onRep }), src ? cropBtn(() => src) : null, onDel ? el("button", { type: "button", class: "btn btn--sm btn--bad", text: "Убрать", onclick: onDel }) : null));
      wrap.replaceChildren(el("span", { text: "Фото первого экрана" }), el("small", { class: "hint", text: more.length ? "Фото плавно сменяют друг друга каждые 5 секунд. Первое показывается сразу." : "Можно добавить ещё до двух фото: тогда они будут плавно сменять друг друга." }),
        el("div", { class: "hp-tiles" },
          tile("Главное", S.hero.photo, () => pickPhoto((src) => { S.hero.photo = src; touch(); draw(); }), null),
          ...more.map((m, i) => tile("Фото " + (i + 2), m.src, () => pickPhoto((src) => { m.src = src; touch(); draw(); }), () => { if (!confirm("Убрать это фото с первого экрана?")) return; S.hero.more.splice(i, 1); touch(); draw(); toast("Фото убрано. Нажмите «Опубликовать»"); })),
          more.length < 2 ? el("button", { type: "button", class: "hp-tile hp-tile--add", onclick: () => pickPhoto((src) => { S.hero.more.push({ src, alt: "" }); touch(); draw(); }) }, el("span", { text: "+" }), el("b", { text: "Добавить фото" })) : null),
        F.text("Что на главном фото (для поиска и незрячих)", S.hero, "alt", { ph: "Например: наращенные ресницы крупным планом" }));
    };
    draw(); return wrap;
  };
  // кадр: нажмите на главное в фото, ползунком приблизьте. Сайт сдвигает фото к этой точке во всех рамках
  function cropEditor(src) { if (!src) return; S.crop = S.crop || {}; const c0 = S.crop[src] || { x: 50, y: 50, z: 1 }, c = { x: +c0.x || 50, y: +c0.y || 50, z: +c0.z || 1 };
    const url = IMG[src] || "../" + String(src).replace(/"/g, "") + "-1280.webp";
    const dot = el("i", { class: "cr__dot" }), img = el("img", { src: url, alt: "", draggable: "false" }), stage = el("div", { class: "cr__stage" }, img, dot);
    const frames = [["Квадрат", "1/1"], ["Вертикаль", "4/5"], ["Широкий", "16/9"]].map(([n, r]) => { const im = el("img", { src: url, alt: "" }); return { im, node: el("figure", { class: "cr__f" }, el("div", { class: "cr__fb", style: "aspect-ratio:" + r }, im), el("figcaption", { text: n })) }; });
    const zoom = el("input", { type: "range", min: "1", max: "2.5", step: "0.05", value: String(c.z) });
    const paint = () => { dot.style.left = c.x + "%"; dot.style.top = c.y + "%"; frames.forEach((f) => { f.im.style.objectPosition = c.x + "% " + c.y + "%"; f.im.style.scale = String(c.z); f.im.style.transformOrigin = c.x + "% " + c.y + "%"; }); };
    const setXY = (e) => { const r = img.getBoundingClientRect(); c.x = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))); c.y = Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100))); paint(); };
    stage.addEventListener("pointerdown", (e) => { e.preventDefault(); stage.setPointerCapture(e.pointerId); setXY(e); const mv = (ev) => setXY(ev), up = () => { stage.removeEventListener("pointermove", mv); stage.removeEventListener("pointerup", up); }; stage.addEventListener("pointermove", mv); stage.addEventListener("pointerup", up); });
    zoom.addEventListener("input", () => { c.z = +zoom.value; paint(); });
    const close = () => { wrap.remove(); document.documentElement.style.overflow = ""; };
    const wrap = el("div", { class: "cr", role: "dialog", "aria-modal": "true", "aria-label": "Кадр фото" }, el("div", { class: "cr__box" },
      el("h2", { text: "Кадр фото" }), el("p", { class: "sub", text: "Нажмите на то, что важно показать: сайт сдвинет фото к этой точке. Ползунком можно приблизить." }), stage,
      el("label", { class: "f" }, el("span", { text: "Приближение" }), zoom), el("div", { class: "cr__fs" }, frames.map((f) => f.node)),
      el("div", { class: "cr__b" }, el("button", { type: "button", class: "btn btn--bad", text: "Сбросить", onclick: () => { delete S.crop[src]; touch(); close(); toast("Кадр сброшен"); } }),
        el("button", { type: "button", class: "btn", text: "Отмена", onclick: close }),
        el("button", { type: "button", class: "btn btn--acc", text: "Готово", onclick: () => { if (c.x === 50 && c.y === 50 && c.z === 1) delete S.crop[src]; else S.crop[src] = { x: c.x, y: c.y, z: Math.round(c.z * 100) / 100 }; touch(); close(); toast("Кадр сохранён. Посмотрите в «Просмотре»"); } }))));
    document.body.append(wrap); document.documentElement.style.overflow = "hidden"; paint(); }
  const cropBtn = (getSrc) => el("button", { type: "button", class: "btn btn--sm", text: "Кадр", title: "Сдвинуть и приблизить фото", onclick: () => cropEditor(getSrc()) });
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
      o[k] ? cropBtn(() => o[k]) : null,
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
        const ttl = el("span", { class: "ttl", text: opt.title(it) || (opt.untitled ? opt.untitled + (arr.length > 1 ? " " + (i + 1) : "") : "Без названия") }); if (opt.meta) ttl.dataset.meta = opt.meta(it) || "";
        // миниатюра в строке: сразу видно, какое фото, без раскрытия
        const tsrc = opt.thumb ? opt.thumb(it) : (it && typeof it.src === "string" && it.src ? it.src : (it && typeof it.photo === "string" && it.photo ? it.photo : ""));
        const thumb = tsrc ? el("span", { class: "thumb", style: `background-image:url("${IMG[tsrc] || "../" + String(tsrc).replace(/"/g, "") + "-640.webp"}")` }) : null;
        const delNow = opt.fixed ? null : el("button", { type: "button", class: "ic ic--del", "aria-label": opt.del || "Удалить", title: opt.del || "Удалить", text: "×", onclick: (e) => { e.preventDefault(); if (opt.onDelete ? opt.onDelete(it) : confirm((opt.del || "Удалить") + "?")) { arr.splice(i, 1); openI = -1; if (opt.onChange) opt.onChange(); draw(); touch(); } } });
        const meta = opt.meta ? el("span", { class: "meta", text: opt.meta(it) }) : null;
        const d = el("details", { class: "item", open: i === openI, ontoggle: (e) => { if (e.target.open) openI = i; else if (openI === i) openI = -1; } },
          el("summary", {}, opt.fixed ? null : el("span", { class: "drag", "aria-label": "Перетащить", title: "Перетащить", text: "⠿" }), thumb, ttl, meta, opt.fixed ? null : el("span", { class: "ord" },
            el("button", { type: "button", class: "ic", "aria-label": "Выше", text: "↑", disabled: i === 0, onclick: (e) => { e.preventDefault(); [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; openI = -1; draw(); touch(); } }),
            el("button", { type: "button", class: "ic", "aria-label": "Ниже", text: "↓", disabled: i === arr.length - 1, onclick: (e) => { e.preventDefault(); [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; openI = -1; draw(); touch(); } }), delNow)),
          el("div", { class: "item__in" }, opt.fields(it, () => { ttl.textContent = opt.title(it) || opt.untitled || "Без названия"; if (meta) { meta.textContent = opt.meta(it); ttl.dataset.meta = opt.meta(it) || ""; } }),
            opt.fixed ? null : el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, el("button", { type: "button", class: "btn btn--sm", text: opt.copyText || "Копировать как шаблон", onclick: () => { const c = JSON.parse(JSON.stringify(it)); ["name", "t", "title", "q", "code"].forEach((k) => { if (c[k]) c[k] += k === "code" ? "2" : " (копия)"; }); if ("slug" in c) c.slug = ""; if (opt.onCopy) opt.onCopy(c, it); arr.splice(i + 1, 0, c); openI = i + 1; draw(); touch(); } }),
            el("button", { type: "button", class: "btn btn--sm btn--bad", text: opt.del || "Удалить", onclick: () => { if (opt.onDelete ? opt.onDelete(it) : confirm("Удалить «" + (opt.title(it) || "элемент") + "»?")) { arr.splice(i, 1); openI = -1; if (opt.onChange) opt.onChange(); draw(); touch(); } } }))));
        return d;
      }), opt.fixed ? "" : el("button", { type: "button", class: "btn", text: opt.add || "Добавить", style: "justify-self:start", onclick: () => { arr.push(opt.blank()); openI = arr.length - 1; draw(); touch(); const n = box.querySelectorAll(".item")[openI]; if (n) { n.scrollIntoView({ block: "center" }); const f = n.querySelector("input"); if (f) f.focus(); } } }));
    };
    draw(); return box;
  };
  const box = (title, note, kids, open) => { const k0 = kids && kids[0], bid = k0 && k0.dataset && k0.dataset.block;
    const badge = bid ? el("span", { class: "bstate" }) : null; if (badge) k0._badge = badge;
    const d = el("details", { class: "box", open: !!open }, el("summary", {}, title, badge, note ? el("small", { text: note }) : null), el("div", { class: "box__in" }, kids));
    if (k0 && k0._sync) k0._sync(); return d; };
  const row2 = (...k) => el("div", { class: "row2" }, k);

  /* ---------- разделы ---------- */
  const V = {};
  const STATUS = [["new", "Новая"], ["work", "В работе"], ["done", "Записалась"], ["refuse", "Отказ"]];
  V.leads = () => {
    if (GHM) return [el("h1", { text: "Заявки" }), el("p", { class: "sub", text: "Сейчас форма на сайте открывает у клиента WhatsApp с готовым сообщением: имя, телефон и курс. Заявка дойдёт, только если клиент нажмёт «Отправить» в WhatsApp. Здесь заявки не хранятся." }), el("p", { class: "sub", text: "Чтобы заявки не терялись, их можно сохранять на сервере с уведомлением в Telegram. Это подключает Трофим." })];
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
      // в направлении есть курсы: не даём им пропасть из фильтров, переносим в другое направление
      onDelete: (cat) => { const used = S.courses.filter((c) => c.cat === cat.id), other = S.categories.find((c) => c !== cat);
        if (!used.length) return confirm("Удалить направление «" + (cat.name || "без названия") + "»?");
        if (!other) { toast("Это последнее направление. Сначала создайте другое", true); return false; }
        if (!confirm("В направлении «" + cat.name + "» " + used.length + " курс(ов). Удалить направление и перенести курсы в «" + other.name + "»?")) return false;
        used.forEach((c) => (c.cat = other.id)); (S.works || []).forEach((w) => { if (w.cat === cat.id) w.cat = other.id; }); return true; },
      fields: (c, re) => [F.text("Название", c, "name", { on: re }), F.text("Подпись", c, "text"), F.img("Фото", c, "photo", "alt")] })];

  const BLOCKS = { scrub: "Видео на прокрутке", compare: "Сравнение курсов (под курсами)", calc: "Калькулятор дохода (под курсами)", referral: "Приведи подругу", notify: "Сообщить о наборе", promo: "Акция", batches: "Ближайшие наборы", numbers: "Цифры", reviews: "Отзывы", cert: "Сертификат", gallery: "Фото-блок", hero: "Первый экран", directions: "Направления обучения", featured: "Курсы и цены", enroll: "Блок записи", zoom: "Фото-сцена «Как мы учим»", teacher: "Преимущества и преподаватель", manifest: "Текст с мини-фото", ribbon: "Лента фото" };
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
      box("Первый экран", "заголовок и фото", [F.area("Заголовок", S.hero, "title", { max: 160 }), F.area("Короткий текст под заголовком", S.hero, "short", { max: 240 }), heroPhotos()], true),
      el("p", { class: "sub" }, "Порядок и показ блоков: вкладка ", el("a", { href: "#", onclick: (e) => { e.preventDefault(); TAB = "sections"; render(); } }, "«Разделы сайта»"), "."),
      box("Блок записи", null, [onHome("enroll"), F.area("Заголовок", S.enroll, "title", { max: 160 }), F.area("Текст", S.enroll, "text", { max: 400 }), F.img("Фото", S.enroll, "photo", "alt")]),
      box("Фото-сцена «Как мы учим»", null, [onHome("zoom"), F.text("Надпись над заголовком", S.zoom, "kicker"), F.text("Заголовок", S.zoom, "title"), F.img("Главное фото", S.zoom, "main", "alt"),
        el("div", { class: "f" }, el("span", { text: "Четыре боковых фото" }), F.list(S.zoom.side, { fixed: true, title: (p) => p.cap, untitled: "Фото", fields: (p, re) => [F.text("Подпись", p, "cap", { on: re }), F.img("Фото", p, "src")] }))]),
      box("Преимущества", "плитки с фото рядом с преподавателем", [onHome("teacher"), F.list(S.advantages, { add: "Добавить преимущество", title: (a) => a.short || a.t, blank: () => ({ t: "", short: "", d: "", photo: "" }),
        fields: (a, re) => [F.text("Подпись на плитке (главная)", a, "short", { on: re }), F.text("Заголовок (страница «Об академии»)", a, "t"), F.area("Описание (страница «Об академии»)", a, "d", { max: 400 }), F.img("Фото", a, "photo")] })])];
  };

  // иконки видов блоков: одинаковые линии на любом телефоне (эмодзи на iPhone выглядят разнобойно)
  const BICO = {"text": "<path d=\"M5 6h14M5 10h14M5 14h14M5 18h9\"/>", "text-photo": "<rect x=\"13\" y=\"6\" width=\"8\" height=\"12\" rx=\"1.5\"/><path d=\"M3 7h7M3 11h7M3 15h5\"/>", "banner": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 16 5-5 4 4 3-3 6 6\"/><path d=\"M7 9h0\"/>", "cta": "<rect x=\"3\" y=\"8\" width=\"18\" height=\"8\" rx=\"4\"/><path d=\"M10 12h5m-2-2 2 2-2 2\"/>", "list": "<path d=\"M9 6h11M9 12h11M9 18h11\"/><circle cx=\"4.5\" cy=\"6\" r=\"1\"/><circle cx=\"4.5\" cy=\"12\" r=\"1\"/><circle cx=\"4.5\" cy=\"18\" r=\"1\"/>", "cards": "<rect x=\"3\" y=\"4\" width=\"7.5\" height=\"7\" rx=\"1.5\"/><rect x=\"13.5\" y=\"4\" width=\"7.5\" height=\"7\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7.5\" height=\"7\" rx=\"1.5\"/><rect x=\"13.5\" y=\"14\" width=\"7.5\" height=\"7\" rx=\"1.5\"/>", "steps": "<circle cx=\"5\" cy=\"6\" r=\"2\"/><circle cx=\"5\" cy=\"18\" r=\"2\"/><path d=\"M5 8v8M10 6h10M10 18h10\"/>", "prices": "<path d=\"M4 7h9M4 12h9M4 17h9\"/><path d=\"M16 7h4M16 12h4M16 17h4\"/>", "stats": "<path d=\"M4 20V10M10 20V4M16 20v-7M21 20H3\"/>", "gallery": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"m3 16 5-5 4 4 3-3 6 6\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.3\"/>", "video": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m10 9 5 3-5 3z\"/>", "quote": "<path d=\"M5 18c2-1 3-3 3-6H5V7h5v5c0 4-2 6-5 7zM14 18c2-1 3-3 3-6h-3V7h5v5c0 4-2 6-5 7z\"/>", "timer": "<circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 9v4l3 2M9 2h6\"/>", "form": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"M8 8h8M8 12h8M8 16h4\"/>", "contacts": "<path d=\"M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z\"/><circle cx=\"12\" cy=\"9\" r=\"2.5\"/>", "accordion": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"6\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"18\" height=\"6\" rx=\"1.5\"/><path d=\"m15 6 1.5 1.5L18 6\"/>", "divider": "<path d=\"M3 12h18\"/><path d=\"M8 7h8M8 17h8\" opacity=\".35\"/>"};
  const bico = (id) => { const sp = el("b", { class: "bico", "aria-hidden": "true" }); sp.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${BICO[id] || ""}</svg>`; return sp; };
  const TYPES = [["text", "📄", "Текст"], ["text-photo", "🖼", "Текст и фото"], ["banner", "🌄", "Фото на фоне"], ["cta", "→", "Кнопка"], ["list", "☰", "Список"], ["cards", "▤", "Карточки"],
    ["steps", "①", "Шаги"], ["prices", "₽", "Цены"], ["stats", "#", "Цифры"], ["gallery", "▦", "Фото"], ["video", "▶", "Видео"], ["quote", "❝", "Цитата"],
    ["timer", "⏱", "Таймер"], ["form", "✎", "Форма заявки"], ["contacts", "📍", "Контакты"], ["accordion", "▾", "Вопрос-ответ"], ["divider", "—", "Разделитель"]];
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
    // старые блоки: одна галочка показа (через главную), ссылка кнопки отдельно от ссылки видео, «без кнопки» явно
    S.blocks.forEach((b) => { const id = "b:" + b.id;
      if (b.on === false) { b.on = true; S.home = S.home.filter((x) => x !== id); S.homeOff = S.homeOff || []; if (!S.homeOff.includes(id)) S.homeOff.unshift(id); }
      if (b.link == null) b.link = b.type !== "video" ? b.url || "" : "";
      if (!b.act || (b.act === "enroll" && !b.btn)) b.act = "none"; });
    const add = (t) => { const id = Date.now().toString(36);
      S.blocks.push({ id, type: t, on: true, title: "", text: "", align: "left", bg: "none", photos: [], size: "m", side: "right", btn: t === "cta" || t === "form" ? "Записаться" : "", act: t === "cta" || t === "form" ? "enroll" : "none", url: "", link: "", waText: "", course: "", act2: "none", btn2: "", link2: "", waText2: "", course2: "", pages: [], from: "", to: "", pad: "m", width: "m", hsize: "m", anchor: "", bgc: "#c9a24b", until: "", end: "hide", after: "" });
      if (pos.where === "start") S.home.unshift("b:" + id); else if (pos.where === "hidden") { (S.homeOff = S.homeOff || []).unshift("b:" + id); } else S.home.push("b:" + id); touch(); render(); toast("Блок создан, заполните его ниже"); setTimeout(() => { const n = [...document.querySelectorAll(".bl-list > .item")].pop(); if (n) { n.open = true; n.scrollIntoView({ block: "start" }); } }, 60); };
    const DESC = { text: "заголовок и абзацы", "text-photo": "текст рядом с фото", banner: "большое фото, текст поверх", list: "пункты с точками", gallery: "одно или несколько фото", cards: "плитки: заголовок и текст", quote: "крупная цитата с автором",
      stats: "крупные цифры с подписями", cta: "призыв и кнопка", video: "YouTube, Rutube, VK или своё", form: "форма заявки прямо в блоке", accordion: "вопросы, ответ по нажатию", divider: "линия между блоками",
      steps: "нумерованные шаги", prices: "прайс: название и цена", timer: "обратный отсчёт до даты", contacts: "адрес, часы, телефон" };
    const EX = "Каждая строка отдельно. Левую и правую часть разделите двумя двоеточиями, например:\n";
    const hint = { text: "Каждый абзац с новой строки.", list: "Каждый пункт с новой строки.", cards: EX + "Практика :: занятия на моделях", stats: EX + "8 лет :: опыт преподавания", accordion: EX + "Сколько длится курс? :: 3 дня",
      steps: EX + "Заявка :: оставляете номер на сайте", prices: EX + "Наращивание ресниц :: 15 000 ₽", quote: "Текст цитаты.", banner: "Короткий текст поверх фото.", timer: "Текст над таймером, например: до конца скидки осталось", contacts: "Можно пусто. Адрес, часы и телефон берутся из вкладки «Контакты»." };
    const BTN0 = { enroll: "Записаться", wa: "Написать в WhatsApp", link: "Подробнее", tel: "Позвонить" };
    const ACTS = [["none", "Без кнопки"], ["enroll", "Открывает заявку"], ["wa", "Пишет в WhatsApp"], ["tel", "Звонит по телефону"], ["link", "Ведёт по ссылке"]];
    const PAGES = [["courses", "Все курсы"], ["course", "Каждый курс"], ["about", "Об академии"], ["works", "Работы"], ["faq", "Вопросы"], ["contacts", "Контакты"], ["training", "Обучение"]];
    const sec = (t, sub) => el("p", { class: "bsec" }, t, sub ? el("small", { text: sub }) : null);
    const selF = (label, o, k, opts, after, hintT) => F.wrap(label, (() => { const s2 = el("select", { onchange: (e) => { const was = o[k]; o[k] = e.target.value; touch(); after && after(was); } }, opts.map(([v, n]) => el("option", { value: v, text: n }))); s2.value = o[k] == null ? opts[0][0] : o[k]; return s2; })(), hintT);
    // поля одной кнопки; n = "" для первой, "2" для второй
    const btnF = (b, n, redraw) => { const K = (x) => x + n, act = b[K("act")] || "none", out = [selF(n ? "Вторая кнопка" : "Кнопка в блоке", b, K("act"), ACTS, (was) => { if (!b[K("btn")] || b[K("btn")] === BTN0[was]) b[K("btn")] = BTN0[b[K("act")]] || ""; redraw(); })];
      if (act === "none") return out;
      out.push(F.text("Надпись на кнопке", b, K("btn"), { ph: BTN0[act] }));
      if (act === "link") out.push(F.text("Куда ведёт", b, K("link"), { ph: "https://... или courses/lashes/ или #zapis", max: 400 }), el("small", { class: "hint", text: "Другой сайт откроется в новой вкладке. Страница этого сайта: courses/, contacts/. Блок на этой же странице: # и его адрес из «Оформления»." }));
      if (act === "wa") out.push(F.text("Текст сообщения в WhatsApp", b, K("waText"), { ph: "Здравствуйте! Хочу узнать про курс", max: 300 }));
      if (act === "enroll") out.push(F.sel("Курс в заявке", b, K("course"), [["", "Клиент выберет сам"]].concat(S.courses.map((c) => [c.slug, c.name]))));
      return out; };
    const fields = (b, re) => { const wrap = el("div", { class: "bfields" });
      const draw = () => { const T = b.type; if (!Array.isArray(b.pages)) b.pages = [];
        const F2 = [sec("Где показывать"), onHome("b:" + b.id), F.multi("Также внизу страниц", b, "pages", PAGES),
          row2(F.text("Показывать с", b, "from", { type: "date" }), F.text("по (включительно)", b, "to", { type: "date" })), el("small", { class: "hint", text: "Даты можно не заполнять. Удобно для акций: блок сам появится и сам исчезнет." }),
          sec("Вид и текст"), selF("Вид блока", b, "type", TYPES.map((t) => [t[0], t[2] + ": " + DESC[t[0]]]), () => { re(); draw(); }, "Можно поменять в любой момент, тексты сохранятся.")];
        if (T !== "divider") F2.push(F.text(T === "quote" ? "Автор цитаты" : "Заголовок", b, "title", { on: re }));
        else F2.push(F.text("Надпись на разделителе (можно пусто)", b, "title", { on: re }));
        if (!["divider", "gallery"].includes(T)) F2.push(F.area(T === "quote" ? "Цитата" : "Текст", b, "text", { max: 3000, hint: hint[T] || "" }));
        if (T === "gallery") F2.push(F.area("Подпись под заголовком", b, "text", { max: 400 }));
        if (T === "video") F2.push(F.text("Ссылка на видео", b, "url", { ph: "YouTube, Rutube или VK Видео", max: 400 }));
        if (["text-photo", "gallery", "video", "banner"].includes(T)) F2.push(F.photos(T === "video" ? "Или своё фото и видео (если ссылки нет)" : T === "banner" ? "Фото на фон (берётся первое)" : "Фото", b, "photos"));
        if (T === "text-photo") F2.push(F.sel("Где фото", b, "side", [["right", "Справа"], ["left", "Слева"], ["top", "Сверху"]]));
        if (T === "gallery" || T === "video") F2.push(F.sel("Размер", b, "size", SIZES));
        if (T === "timer") F2.push(F.text("До какого момента", b, "until", { type: "datetime-local" }), selF("Когда время вышло", b, "end", [["hide", "Скрыть блок"], ["text", "Показать надпись"]], draw),
          b.end === "text" ? F.text("Надпись после окончания", b, "after", { ph: "Акция закончилась" }) : null);
        if (!["divider", "quote", "stats", "accordion"].includes(T)) { F2.push(sec("Кнопки", T === "contacts" ? "если без кнопки, встанут «Записаться», WhatsApp и «Как добраться»" : ""), ...btnF(b, "", draw));
          if (b.act && b.act !== "none") F2.push(...btnF(b, "2", draw)); }
        if (T !== "divider") F2.push(sec("Оформление"),
          row2(F.sel("Текст по", b, "align", [["left", "Левому краю"], ["center", "Центру"], ["right", "Правому краю"]]), selF("Фон", b, "bg", [["none", "Без фона"], ["card", "Светлая карточка"], ["accent", "С золотой рамкой"], ["gold", "Золотой"], ["dark", "Тёмный"], ["color", "Свой цвет"]], draw)),
          b.bg === "color" ? F.text("Цвет фона", b, "bgc", { type: "color" }) : null,
          row2(F.sel("Отступы", b, "pad", [["m", "Обычные"], ["s", "Плотнее"], ["l", "Просторнее"]]), F.sel("Ширина", b, "width", [["m", "Обычная"], ["s", "Узкая, по центру"], ["l", "Во весь экран"]])),
          row2(F.sel("Размер заголовка", b, "hsize", [["m", "Обычный"], ["l", "Крупный"]]), F.text("Адрес блока (для ссылок)", b, "anchor", { ph: "например zapis", max: 40 })));
        wrap.replaceChildren(...F2.filter(Boolean)); };
      draw(); return [wrap]; };
    const clean = () => { const ids = new Set(S.blocks.map((b) => "b:" + b.id)); S.home = S.home.filter((x) => !x.startsWith("b:") || ids.has(x)); S.homeOff = (S.homeOff || []).filter((x) => !x.startsWith("b:") || ids.has(x)); };
    // копия блока получает свой номер и встаёт на главной сразу после оригинала
    const onCopy = (c, orig) => { c.id = Date.now().toString(36); const i = S.home.indexOf("b:" + orig.id); if (i >= 0) S.home.splice(i + 1, 0, "b:" + c.id); else (S.homeOff = S.homeOff || []).unshift("b:" + c.id); };
    const list = F.list(S.blocks, { title: (b) => b.title || (TYPES.find((t) => t[0] === b.type) || [, , "Блок"])[2], meta: (b) => (TYPES.find((t) => t[0] === b.type) || [, , ""])[2] + (S.home.includes("b:" + b.id) ? "" : ", скрыт"), untitled: "Блок", fields, del: "Удалить блок", blank: () => ({}), onChange: clean, onCopy, copyText: "Сделать копию" });
    list.classList.add("bl-list"); const addBtn = list.querySelector(":scope > .btn"); if (addBtn) addBtn.remove();
    return [el("h1", { text: "Конструктор блоков" }),
      el("ol", { class: "steps" }, el("li", { text: "Нажмите на вид блока ниже." }), el("li", { text: "Заполните текст, фото и, если нужно, кнопку." }), el("li", { text: "Нажмите «Просмотр» вверху, чтобы увидеть, затем «Опубликовать»." })),
      box("Новый блок", "выберите вид", [F.sel("Куда поставить", pos, "where", [["end", "В конец главной"], ["start", "В начало главной"], ["hidden", "Пока скрыть"]]),
        el("div", { class: "types" }, TYPES.map(([id, ic, n]) => el("button", { type: "button", class: "type", onclick: () => add(id) }, bico(id), el("span", { text: n }), el("small", { text: DESC[id] }))))], true),
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
  const onHome = (id) => { const box2 = el("div", { class: "brow onhome", style: "flex-wrap:wrap;gap:8px" }); box2.dataset.block = id;
    box2._sync = () => { const shown = S.home.includes(id); if (box2._badge) { box2._badge.textContent = shown ? "на главной" : "скрыт на сайте"; box2._badge.className = "bstate" + (shown ? " bstate--on" : ""); } };
    const draw = () => { const i = S.home.indexOf(id), shown = i >= 0; box2._sync();
      box2.replaceChildren(...[el("label", { class: "chk", style: "font-weight:600;flex:1 1 auto" }, el("input", { type: "checkbox", checked: shown, onchange: (e) => { S.home = S.home.filter((b) => b !== id); if (e.target.checked) S.home.splice(Math.min(1, S.home.length), 0, id); touch(); draw(); } }), el("span", { text: "Показывать на главной" })),
        shown ? el("span", { style: "color:var(--ink2);font-size:.9rem", text: `место ${i + 1} из ${S.home.length}` + (S.home[i - 1] ? `, после «${bName(S.home[i - 1])}»` : ", первым") }) : null,
        shown ? el("button", { type: "button", class: "ic", text: "↑", "aria-label": "Выше", disabled: i === 0, onclick: () => { [S.home[i - 1], S.home[i]] = [S.home[i], S.home[i - 1]]; touch(); draw(); } }) : null,
        shown ? el("button", { type: "button", class: "ic", text: "↓", "aria-label": "Ниже", disabled: i === S.home.length - 1, onclick: () => { [S.home[i + 1], S.home[i]] = [S.home[i], S.home[i + 1]]; touch(); draw(); } }) : null].filter(Boolean)); };
    draw(); return box2; };
  const ensure = (k, def) => { if (!S[k] || typeof S[k] !== "object") S[k] = def; return S[k]; };
  V.sales = () => {
    const pr = ensure("promo", { on: true, kicker: "Акция", title: "", text: "", until: "", btn: "Записаться со скидкой", photos: [], size: "m", codes: [] }); if (!Array.isArray(pr.codes)) pr.codes = [];
    const pay = ensure("pay", { on: false, text: "Можно оплатить частями" }), ce = ensure("cert", { on: true, title: "Сертификат после обучения", text: "", photos: [], size: "m" }), ga = ensure("gallery", { on: true, title: "Как проходят занятия", text: "", photos: [], size: "m" });
    ["batches", "numbers", "reviews"].forEach((k) => { if (!Array.isArray(S[k])) S[k] = []; });
    const courses = [["", "Выберите курс"]].concat(S.courses.map((c) => [c.slug, c.name]));
    return [el("h1", { text: "Продажи и доверие" }), el("p", { class: "sub", text: "То, что помогает решиться на запись. Блок появляется на главной, когда он заполнен и стоит галочка «Показывать на главной». Порядок блоков меняется на вкладке «Главная»." }),
      box("Акция", "скидка, подарок, срок", [onHome("promo"), el("small", { class: "hint", text: "Акция видна на сайте, только когда заполнен заголовок." }), F.text("Метка", pr, "kicker", { ph: "Акция" }), F.text("Заголовок", pr, "title", { ph: "Например: −10% на курс ресниц до конца месяца" }), F.area("Текст", pr, "text", { max: 400 }),
        row2(F.text("До какого числа", pr, "until", { ph: "30 ноября" }), F.text("Надпись на кнопке", pr, "btn")), F.photos("Фото акции", pr, "photos"), F.sel("Размер фото", pr, "size", SIZES)], true),
      box("Промокоды", "поле в форме заявки", [el("small", { style: "color:var(--ink2)", text: "Когда есть хотя бы один промокод, в форме заявки появляется поле «Промокод». Неверный код сайт не примет, верный придёт вам в сообщении с заявкой." }),
        F.list(pr.codes, { title: (c) => c.code, untitled: "Новый промокод", add: "Добавить промокод", blank: () => ({ code: "", text: "" }), fields: (c, re) => [row2(F.text("Промокод", c, "code", { on: re, ph: "ЗОЛОТО" }), F.text("Что даёт", c, "text", { ph: "скидка 10%" }))] })]),
      box("Оплата частями", null, [el("small", { class: "hint", text: "Текст появляется рядом с ценой на странице курса и в карточках." }), F.bool("Показывать «можно частями» у цен", pay, "on"), F.text("Текст", pay, "text")]),
      box("Ближайшие наборы", "даты и свободные места", [onHome("batches"), el("small", { class: "hint", text: "Блок появится на сайте, когда добавите хотя бы одну дату набора." }), F.text("Подпись под заголовком", S, "batchesNote", { ph: "Например: группы до 3 человек" }),
        F.list(S.batches, { title: (b) => [b.start, (S.courses.find((c) => c.slug === b.course) || {}).name].filter(Boolean).join(", "), untitled: "Новый набор", add: "Добавить набор", blank: () => ({ course: "", start: "", format: "", seats: "", on: true }),
          fields: (b, re) => [F.sel("Курс", b, "course", courses, { hint: "" }), row2(F.text("Дата старта", b, "start", { ph: "1 декабря", on: re }), F.text("Свободных мест", b, "seats", { ph: "3", hint: "3 и меньше: «Осталось 3 места». 0: «Мест нет»" })), F.text("Формат", b, "format", { ph: "Будни, 10:00-17:00" }), F.bool("Показывать", b, "on")] })]),
      box("Цифры", "опыт, выпускницы", [onHome("numbers"), F.list(S.numbers, { title: (n) => [n.n, n.t].filter(Boolean).join(" "), untitled: "Новая цифра", add: "Добавить цифру", blank: () => ({ n: "", t: "" }),
        fields: (n, re) => [row2(F.text("Число", n, "n", { ph: "8 лет", on: re }), F.text("Подпись", n, "t", { ph: "преподаю наращивание", on: re }))] })]),
      box("Отзывы", "только настоящие", [onHome("reviews"), F.list(S.reviews, { title: (r) => r.name, untitled: "Новый отзыв", add: "Добавить отзыв", blank: () => ({ name: "", course: "", text: "", stars: "5", photos: [] }),
        fields: (r, re) => [row2(F.text("От кого (имя)", r, "name", { on: re }), F.text("Курс", r, "course")), F.sel("Оценка", r, "stars", [["5", "★★★★★ 5"], ["4", "★★★★ 4"], ["3", "★★★ 3"], ["2", "★★ 2"], ["1", "★ 1"], ["", "Без звёзд"]]), F.area("Текст отзыва", r, "text", { max: 800 }), F.photos("Скриншоты или фото (можно без них)", r, "photos")] })]),
      box("Сертификат", null, [onHome("cert"), F.text("Заголовок", ce, "title"), F.area("Текст", ce, "text", { max: 400, ph: "" }), F.photos("Фото сертификата", ce, "photos"), F.sel("Размер фото", ce, "size", SIZES)]),
      box("Сравнение курсов", "таблица: что входит", [onHome("compare"), el("small", { class: "hint", text: "Показывается свёрнутой кнопкой под курсами на главной." }), F.text("Заголовок", ensure("compare", { on: true, title: "Какой курс выбрать", text: "", courses: ["lashes", "lashes-pro"] }), "title"), F.area("Подпись", S.compare, "text", { max: 300 }),
        F.multi("Какие курсы сравнить (2-3)", S.compare, "courses", S.courses.map((c) => [c.slug, c.name]))]),
      box("Калькулятор дохода", "когда окупится курс", [onHome("calc"), el("small", { class: "hint", text: "Показывается свёрнутой кнопкой под курсами на главной." }), F.text("Заголовок", ensure("calc", { on: true, title: "Когда окупится обучение", text: "", course: "lashes-pro", price: 2500, per: 3, note: "Расчёт примерный, без учёта материалов и аренды.", btn: "Записаться на курс" }), "title"),
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
      box("Преподаватель", null, [F.text("Имя", t, "name"), F.text("Кто она", t, "role"), F.area("О себе", t, "bio", { hint: "Опыт, образование, почему преподаёте" }), F.img("Портрет", t, "photo"), el("div", { class: "f" }, el("span", { text: "Факты (опыт, судейство)" }), F.list(t.facts = (t.facts || []).map((f) => typeof f === "string" ? { t: f, d: "" } : f), { add: "Добавить факт", untitled: "Факт", title: (f) => [f.t, f.d].filter(Boolean).join(" "), blank: () => ({ t: "", d: "" }), fields: (f, re) => [F.text("Крупно", f, "t", { on: re, ph: "Например: С 2018 года" }), F.text("Подпись", f, "d", { ph: "преподаёт" })] }))]),
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
      F.sel("Шрифт заголовков", S, "font", [["studio", "Студия: узкий капс, как у дизайн-студий"], ["arsenal", "Arsenal (простой)"], ["finlandica", "Finlandica (современный)"], ["bona", "Bona Nova (с засечками)"], ["prata", "Prata (с засечками)"], ["cormorant", "Cormorant (изящный)"]]),
      F.sel("Шрифт текста", ensureD(), "fontBody", [["", "Как задано в шрифте заголовков"], ["ysabeau", "Ysabeau Office"], ["arsenal", "Arsenal"], ["finlandica", "Finlandica"]]),
      F.sel("Стиль блоков", ensureD(), "style", [["studio", "Студия: строгие линии, без плашек"], ["", "Классика: карточки и плашки"]]),
      F.sel("Углы", ensureD(), "corners", [["none", "Без скругления"], ["soft", "Мягкие, скруглённые"], ["sharp", "Острые"], ["round", "Сильно скруглённые"]]),
      F.bool("Стекло: полупрозрачная шапка сайта", ensureD(), "blur"), el("small", { class: "hint", text: "Видно при прокрутке: фото под шапкой сайта слегка просвечивают и размываются. Ещё стекло на метках курсов («С нуля»)." }),
      F.sel("Тени у карточек", ensureD(), "shadow", [["soft", "Лёгкие"], ["none", "Без теней"], ["strong", "Заметные"]]),
      el("div", { class: "f" }, el("span", { text: "Готовые наборы" }), el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [["Мягкий", { corners: "round", blur: true, shadow: "soft" }, "arsenal"], ["Строгий", { corners: "sharp", blur: false, shadow: "none" }, "finlandica"], ["Классика", { corners: "soft", blur: true, shadow: "strong" }, "bona"]]
        .map(([n, d, f]) => el("button", { type: "button", class: "btn btn--sm", text: n, onclick: () => { Object.assign(ensureD(), d); S.font = f; touch(); render(); toast("Набор «" + n + "» применён. Нажмите «Посмотреть»"); } })))),
      F.sel("Анимация", S, "anim", [["calm", "Спокойная"], ["soft", "Мягкая"], ["live", "Живая"]]),
      F.sel("Курсы на главной", S, "coursesView", [["flow", "По дуге (карусель)"], ["tiles", "Плиткой"]]),
      F.sel("Сколько курсов видно сразу", S, "moreAfter", [["4", "4, остальные под «Показать ещё»"], ["6", "6, остальные под «Показать ещё»"], ["8", "8, остальные под «Показать ещё»"], ["12", "12, остальные под «Показать ещё»"], ["0", "Все сразу"]], { hint: "Порядок: сначала курсы из списка «Главные курсы», потом остальные" })], true),
    box("Своя палитра", "фон, текст и акцент: всё остальное сайт подберёт сам", (() => {
      const D = ensureD(), P = D.palette || {}, cur = (k, d) => (/^#[0-9a-f]{6}$/i.test(P[k] || "") ? P[k] : d);
      const pick = (label, k, d) => { const inp = el("input", { type: "color", value: cur(k, d), style: "width:64px;height:44px;padding:0;border:1px solid var(--line);border-radius:10px;background:none;cursor:pointer" });
        inp.addEventListener("input", () => { D.palette = Object.assign({ bg: cur("bg", "#15100D"), text: cur("text", "#EDE5DA"), accent: cur("accent", "#C99A4B") }, D.palette || {}, { [k]: inp.value }); touch(); });
        return el("label", { class: "f", style: "display:flex;align-items:center;gap:12px" }, inp, el("span", { text: label })); };
      const PRE = [["Ночное золото", "#15100D", "#EDE5DA", "#C99A4B"], ["Шоколад и пудра", "#2A1D1A", "#F3E6DF", "#E2A897"], ["Изумруд и золото", "#0F1F1A", "#E8F0EA", "#C9A45C"], ["Графит и розовое золото", "#1B1B1D", "#F1ECE8", "#D7A48C"],
        ["Молоко и бордо", "#F6F1EA", "#2B2523", "#7A2E3A"], ["Пудра и золото", "#F7EDE8", "#3A2A26", "#B07E36"], ["Белый и чёрный", "#FFFFFF", "#141414", "#141414"], ["Лаванда", "#F3F0F7", "#2A2533", "#7A5BA6"]];
      return [pick("Фон", "bg", "#15100D"), pick("Текст", "text", "#EDE5DA"), pick("Акцент: кнопки и цены", "accent", "#C99A4B"),
        el("div", { class: "f" }, el("span", { text: "Готовые палитры" }), el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, PRE.map(([n, b, t, a]) => el("button", { type: "button", class: "btn btn--sm", style: `background:${b};color:${t};border-color:${a}`, onclick: () => { ensureD().palette = { bg: b, text: t, accent: a }; touch(); render(); toast("Палитра «" + n + "». Нажмите «Посмотреть»"); } }, el("i", { style: `display:inline-block;width:10px;height:10px;border-radius:50%;background:${a};margin-right:6px` }), n)))),
        el("button", { type: "button", class: "btn btn--sm", style: "justify-self:start", text: "Вернуть стандартные цвета", onclick: () => { delete ensureD().palette; touch(); render(); toast("Палитра сброшена. Цвета снова из пункта «Цвета»"); } })];
    })()),
    box("Режим черновика", null, [F.bool("Сайт в режиме черновика", S, "preview"),
      el("small", { style: "color:var(--ink2)", text: GHM ? "Пока включено: посетители видят панель выбора оформления, поисковики сайт не показывают. Перед запуском выключите, и сайт появится в поиске." : "Пока включено: посетители видят панель выбора оформления, поисковики сайт не показывают, а заявка открывает WhatsApp. Перед запуском выключите: заявки начнут сохраняться в раздел «Заявки», а сайт появится в поиске." })], true)];

  V.set = () => {
    if (GHM) {
      const pw = { old: "", n1: "", n2: "" }, vbox = el("div", {}, el("small", { text: "Загружаем…" }));
      GH.history().then((items) => vbox.replaceChildren(...(items.length ? items.map((v) => el("div", { class: "ver" }, el("span", { text: hhmm(v.date.slice(0, 19).replace("T", " ")) }),
        el("button", { class: "btn btn--sm", text: "Вернуть", onclick: async () => { if (!confirm("Вернуть эту версию в черновик? Сайт изменится после публикации")) return; try { S = await GH.loadSite(v.sha); unpublished = true; touch(); render(); toast("Версия возвращена в черновик"); } catch (e) { toast(e.message, true); } } }))) : [el("small", { text: "Версии появятся после первой публикации" })]))).catch((e) => vbox.replaceChildren(el("small", { text: e.message })));
      return [el("h1", { text: "Настройки" }),
        box("История версий", "последние 30 публикаций", [vbox], true),
        box("Сменить пароль", null, [F.text("Текущий пароль", pw, "old", { type: "password", quiet: true }), F.text("Новый пароль (от 12 символов)", pw, "n1", { type: "password", quiet: true, hint: "Лучше 3-4 разных слова через дефис и цифры. Пароль защищает доступ к сайту, не используйте его в других местах" }), F.text("Новый пароль ещё раз", pw, "n2", { type: "password", quiet: true }),
          el("button", { class: "btn", style: "justify-self:start", text: "Сменить пароль", onclick: async (e) => { if (pw.n1 !== pw.n2) return toast("Новые пароли не совпадают", true); const w = GH.weak(pw.n1); if (w) return toast(w, true); const bt = e.target; bt.disabled = true; bt.textContent = "Меняем…";
            try { await GH.changePassword(pw.old, pw.n1); toast("Пароль изменён. Запомните его: восстановить нельзя"); } catch (er) { toast(er.message, true); } bt.disabled = false; bt.textContent = "Сменить пароль"; } })]),
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
      el("header", { class: "top" + (Q ? " s-open" : "") }, el("div", { class: "top__in" }, el("span", { class: "top__name", text: "АлтынНур" }), el("span", { class: "state", id: "state" }),
        (() => { const u = el("button", { class: "btn btn--icon", "aria-label": "Отменить изменения в разделе", title: "Отменить: вернуть раздел к тому, каким он был, когда вы его открыли", onclick: () => { if (!SNAP || SNAP === JSON.stringify(S)) return toast("В этом разделе нет изменений"); if (!confirm("Отменить все изменения в этом разделе?")) return; S = JSON.parse(SNAP); touch(); render(); toast("Изменения отменены"); } }); u.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>'; return u; })(),
        (() => { const sb = el("button", { class: "btn btn--icon s-toggle", "aria-label": "Поиск по админке", onclick: () => { const t = app.querySelector(".top"); t.classList.toggle("s-open"); if (t.classList.contains("s-open")) app.querySelector(".search input").focus(); } }); sb.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'; return sb; })(),
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
    // старый черновик без «базы» нельзя аккуратно слить: спрашиваем
    if (local && !local.base && !eq(local.site, pub) && !confirm("На этом устройстве есть неопубликованный черновик от " + (local.at || "прошлого раза") + ". Продолжить с ним?\n\nОтмена: открыть то, что сейчас на сайте.")) { local = null; try { localStorage.removeItem(GKEY); } catch (e) {} }
    S = local ? (local.base ? merge3(local.base, local.site, pub) : local.site) : pub; BASE = JSON.parse(JSON.stringify(pub));
    if (local && eq(S, pub)) { local = null; try { localStorage.removeItem(GKEY); } catch (e) {} }
    META = { draft_at: local ? local.at : null, published_at: null };
    unpublished = !!local; LEADS = []; TAB = "courses"; render();
    if (local) toast("Открыт ваш неопубликованный черновик, свежие изменения с сайта добавлены");
  }
  async function boot2() {
    const j = await api("draft"); S = j.site; META = { draft_at: j.draft_at, published_at: j.published_at };
    unpublished = !j.published_at || (j.draft_at && j.draft_at > j.published_at);
    try { LEADS = (await api("leads")).items; } catch (e) { LEADS = []; }
    TAB = LEADS.some((l) => l.status === "new") ? "leads" : "courses"; render();
  }
  (async function boot() {
    if (GHM) { if (!(await GH.restore())) return screenLoginGH(); return bootGH().catch((e) => screenLoginGH(e.message)); }
    let p = null;
    try { const r = await fetch(API + "?r=ping", { credentials: "same-origin" }); p = await r.json(); } catch (e) {}
    if (!p || p.ok !== true) { DEMO = true; S = await demoLoad(); TAB = "courses"; return render(); }
    if (!p.installed) return screenInstall();
    if (!p.user) return screenLogin();
    USER = p.user; CSRF = p.csrf; boot2().catch((e) => toast(e.message, true));
  })();
})();
