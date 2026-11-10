/* «Между нами»: всё хранится на телефоне (localStorage), сервер не нужен */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DUR = { 1: "до 5 минут", 2: "10-20 минут", 3: "от 30 минут" };
  const CATN = Object.fromEntries(CATS.map((c) => [c.id, c.name]));

  /* ---------- все карточки ---------- */
  const ALL = [];
  POSES.forEach((p, i) => ALL.push({ id: "poses:" + i, cat: "poses", t: p[0], base: p[1], prop: p[2], d: p[3], tags: p[4] || [], who: "both", dur: 2, tip: (window.POSE_TIPS || {})[p[1]] || "" }));
  Object.entries(CARDS).forEach(([cat, list]) => list.forEach((c, i) => ALL.push({ id: cat + ":" + i, cat, t: c[0], d: c[1], who: c[2], dur: c[3], tags: c[4] || [], tip: c[5] || "" })));
  const BYID = Object.fromEntries(ALL.map((c) => [c.id, c]));
  const PRACT = ["оральные ласки", "анальный секс", "страпон", "игрушки", "БДСМ", "связывание", "шлепки", "доминирование", "раздевание", "повязка на глаза"];
  const TAGS = [...new Set(ALL.flatMap((c) => c.tags))].filter((t) => !PRACT.includes(t)).sort((a, b) => a.localeCompare(b, "ru"));
  const SOFT = ["анальный секс", "страпон", "БДСМ", "связывание", "шлепки", "доминирование", "акробатика"];

  /* ---------- хранение ---------- */
  const KEY = "mezhdu-nami-v1";
  const def = () => ({ adult: false, cats: Object.fromEntries(CATS.map((c) => [c.id, true])), exTags: [], exCards: [], who: "both", dur: 3, favs: [], hist: [], bags: {}, lead: "she" });
  let S;
  try { S = Object.assign(def(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = def(); }
  CATS.forEach((c) => { if (S.cats[c.id] === undefined) S.cats[c.id] = true; });
  Object.keys(S.cats).forEach((k) => { if (!CATS.some((c) => c.id === k)) delete S.cats[k]; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  /* ---------- случайность без повторов ---------- */
  const rnd = (n) => { if (window.crypto && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } return Math.floor(Math.random() * n); };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // подходит ли карточка под фильтры
  const allowed = (c, scope) => (scope ? c.cat === scope : S.cats[c.cat]) && !S.exCards.includes(c.id) && !c.tags.some((t) => S.exTags.includes(t)) && c.dur <= S.dur;
  const pool = (scope) => ALL.filter((c) => allowed(c, scope));
  // «мешок»: карточки выпадают по одной, пока все не выпадут, потом мешок перемешивается заново
  function draw(scope, avoid = []) {
    const p = pool(scope); if (!p.length) return null;
    const sig = (scope || "all") + "|" + S.dur + "|" + S.exTags.join(",") + "|" + Object.keys(S.cats).filter((k) => S.cats[k]).join(",");
    const ids = new Set(p.map((c) => c.id));
    let bag = (S.bags[sig] || []).filter((id) => ids.has(id));
    if (!bag.length) { bag = shuffle(p.map((c) => c.id)); const last = S.hist[0] && S.hist[0].id; if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop()); }
    let k = bag.length - 1; while (k > 0 && avoid.includes(bag[k])) k--;
    const id = bag.splice(k, 1)[0];
    S.bags = { [sig]: bag }; save();
    return BYID[id];
  }

  /* ---------- кто ведёт ---------- */
  const NAMES = { he: { N: "Он", n: "он", d: "ему", a: "его", i: "ним" }, she: { N: "Она", n: "она", d: "ей", a: "её", i: "ней" } };
  const other = (w) => (w === "he" ? "she" : "he");
  function leaderFor(mode) {
    if (mode === "he" || mode === "she") return mode;
    if (S.who === "he" || S.who === "she") return S.who;
    if (mode === "turns") { S.lead = other(S.lead); save(); return S.lead; }
    return rnd(2) ? "he" : "she";
  }
  const fill = (txt, L) => { const A = NAMES[L], B = NAMES[other(L)];
    return txt.replace(/\{(A|a|B|b|bd|ba|bi|ad|aa)\}/g, (_, k) => ({ A: A.N, a: A.n, B: B.N, b: B.n, bd: B.d, ba: B.a, bi: B.i, ad: A.d, aa: A.a })[k]); };

  /* ---------- общий интерфейс ---------- */
  let TAB = "play";
  const app = $("#app");
  const toast = (t) => { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 1600); };
  const header = () => `<div class="top"><h1>Между <i>нами</i></h1></div>
    <nav class="tabs" role="tablist">${[["play", "Игра"], ["favs", "Избранное"], ["hist", "История"], ["set", "Настройки"]].map(([id, n]) => `<button role="tab" data-tab="${id}" aria-selected="${TAB === id}">${n}${id === "favs" && S.favs.length ? `<b>${S.favs.length}</b>` : ""}</button>`).join("")}</nav>`;
  function render() {
    app.innerHTML = header() + `<div class="view">${V[TAB]()}</div>`;
  }
  const mini = (c) => c.cat === "poses" ? `<span class="mini">${poseSVG(c.base, c.prop)}</span>` : "";

  /* ---------- экраны ---------- */
  const V = {};
  V.play = () => {
    const n = pool().length;
    return `<button class="hero-play" data-start="random"><span class="deck"></span><h2>Полный рандом</h2><p>Случайная карточка из всех включённых категорий. ${n} вариантов.</p><span class="go">→</span></button>
      <p class="sub">Режимы</p>
      <div class="modes">
        <button class="mode" data-start="she"><span class="ic" style="background:rgba(255,138,120,.18)">♀</span><b>Она выбирает</b><span>3 варианта, решает она</span></button>
        <button class="mode" data-start="he"><span class="ic" style="background:rgba(169,155,230,.18)">♂</span><b>Он выбирает</b><span>3 варианта, решает он</span></button>
        <button class="mode" data-start="turns"><span class="ic" style="background:rgba(255,255,255,.08)">⇄</span><b>По очереди</b><span>Ведущий меняется каждый ход</span></button>
        <button class="mode" data-start="offer"><span class="ic" style="background:rgba(255,255,255,.08)">☝</span><b>Один предлагает</b><span>Второй выбирает из трёх</span></button>
        <div class="mode wide"><div><b>Серия</b><br><span>Игра из нескольких карточек</span></div><div class="series"><button data-series="5">5</button><button data-series="10">10</button><button data-series="15">15</button></div></div>
      </div>
      <p class="sub">Только одна категория</p>
      <div class="cats">${CATS.map((c) => `<button class="cat${S.cats[c.id] ? "" : " off"}" data-cat="${c.id}"><b>${esc(c.name)}</b><span>${esc(c.hint)}</span></button>`).join("")}</div>
      <div class="lead-info"><span class="dot" style="background:${S.who === "he" ? "var(--he)" : S.who === "she" ? "var(--she)" : "linear-gradient(90deg,var(--he) 50%,var(--she) 50%)"}"></span>Задания ведёт: ${S.who === "he" ? "он" : S.who === "she" ? "она" : "оба по жребию"} · длительность ${DUR[S.dur]}. Изменить в настройках.</div>
      <p class="note">Любую карточку можно пропустить. Делайте только то, что приятно и комфортно обоим.</p>`;
  };
  V.favs = () => {
    const list = S.favs.map((id) => BYID[id]).filter(Boolean);
    if (!list.length) return `<div class="empty">Здесь появятся карточки, которые вы отметите сердечком ♡</div>`;
    return `<div class="list">${list.map((c) => `<button class="item" data-open="${c.id}"><span><b>${esc(c.t)}</b><small>${esc(CATN[c.cat])}</small></span>${mini(c)}</button>`).join("")}</div>`;
  };
  V.hist = () => {
    if (!S.hist.length) return `<div class="empty">Здесь будут недавние карточки</div>`;
    const lab = { done: ["Выполнено", "ok"], skip: ["Пропущено", ""], seen: ["Показано", ""] };
    return `<div class="list">${S.hist.slice(0, 80).map((h) => { const c = BYID[h.id]; if (!c) return ""; const [l, cl] = lab[h.s] || lab.seen;
      return `<button class="item" data-open="${c.id}"><span><b>${esc(c.t)}</b><small>${esc(CATN[c.cat])} · ${new Date(h.at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</small></span><span class="st ${cl}">${l}</span></button>`; }).join("")}</div>
      <button class="danger" data-clear="hist">Очистить историю</button>`;
  };
  V.set = () => `<p class="sub" style="margin-top:0">Категории</p>
      ${CATS.map((c) => `<div class="row"><span>${esc(c.name)}<br><small class="note" style="margin:0">${ALL.filter((x) => x.cat === c.id).length} карточек</small></span><button class="sw" role="switch" aria-checked="${!!S.cats[c.id]}" data-tcat="${c.id}" aria-label="${esc(c.name)}"></button></div>`).join("")}
      <p class="sub">Кто ведёт задания</p>
      <div class="seg">${[["both", "Оба"], ["she", "Она"], ["he", "Он"]].map(([v, n]) => `<button data-who="${v}" aria-pressed="${S.who === v}">${n}</button>`).join("")}</div>
      <p class="sub">Длительность заданий</p>
      <div class="seg">${[[1, "до 5 мин"], [2, "до 20 мин"], [3, "любые"]].map(([v, n]) => `<button data-dur="${v}" aria-pressed="${S.dur === v}">${n}</button>`).join("")}</div>
      <p class="sub">Практики: что исключить</p>
      <div class="presets"><button data-preset="soft">Только нежно</button><button data-preset="all">Разрешить всё</button></div>
      ${PRACT.map((t) => `<div class="row"><span>${esc(t[0].toUpperCase() + t.slice(1))}<br><small class="note" style="margin:0">${ALL.filter((c) => c.tags.includes(t)).length} карточек</small></span><button class="sw" role="switch" aria-checked="${!S.exTags.includes(t)}" data-tag="${esc(t)}" aria-label="${esc(t)}"></button></div>`).join("")}
      <p class="sub">Другие темы</p>
      <div class="chips">${TAGS.map((t) => `<button class="chip ex" data-tag="${esc(t)}" aria-pressed="${S.exTags.includes(t)}">${esc(t)}</button>`).join("")}</div>
      <p class="note">Выключенные практики и зачёркнутые темы не выпадут ни в одном режиме, включая позы.</p>
      ${S.exCards.length ? `<p class="sub">Скрытые карточки</p><div class="chips">${S.exCards.map((id) => BYID[id] ? `<button class="chip" data-unhide="${id}">↺ ${esc(BYID[id].t)}</button>` : "").join("")}</div><p class="note">Нажмите, чтобы вернуть карточку.</p>` : ""}
      <button class="danger" data-clear="all">Сбросить всё: настройки, избранное, историю</button>`;

  /* ---------- игра ---------- */
  let G = null; // текущая игра
  const stage = (html) => { let st = $("#stage"); if (!st) { st = document.createElement("div"); st.id = "stage"; st.className = "stage"; document.body.appendChild(st); document.documentElement.style.overflow = "hidden"; } st.innerHTML = `<div class="stage-in">${html}</div>`; return st; };
  const closeStage = () => { const st = $("#stage"); if (st) st.remove(); document.documentElement.style.overflow = ""; G = null; render(); };
  const sbar = (title) => `<div class="sbar"><button class="ibtn" data-close aria-label="Закрыть">✕</button><span class="ttl">${esc(title)}</span><span class="ibtn" style="visibility:hidden"></span></div>`;
  const MODEN = { random: "Полный рандом", she: "Она выбирает", he: "Он выбирает", turns: "По очереди", offer: "Один предлагает", series: "Серия", cat: "", view: "" };

  function start(mode, opt = {}) {
    G = { mode, scope: opt.scope || null, n: opt.n || 0, i: 0, done: 0, shown: [] };
    if (!pool(G.scope).length) { toast("Нет карточек: проверьте фильтры"); G = null; return; }
    next();
  }
  function next() {
    if (G.mode === "series" && G.i >= G.n) return finish();
    if (G.mode === "she" || G.mode === "he" || G.mode === "offer") return choose();
    const c = draw(G.scope, G.shown); if (!c) { toast("Карточки закончились"); return closeStage(); }
    show(c, leaderFor(G.mode));
  }
  function choose() {
    const L = G.mode === "offer" ? leaderFor("random") : G.mode;
    const opts = []; for (let k = 0; k < 3; k++) { const c = draw(G.scope, G.shown.concat(opts.map((o) => o.id))); if (c && !opts.includes(c)) opts.push(c); }
    const who = G.mode === "offer" ? `${NAMES[L].N} предлагает, ${NAMES[other(L)].n} выбирает` : `Выбирает ${NAMES[L].n}`;
    stage(`${sbar(MODEN[G.mode])}<p class="chooser">${esc(who)}</p><div class="pick">${opts.map((c) => `<button data-pickc="${c.id}"><span><b>${esc(c.t)}</b><small>${esc(CATN[c.cat])}</small></span>${mini(c)}</button>`).join("")}</div>
      <div class="more"><button data-reroll>Другие варианты</button></div>`);
    G.opts = opts; G.L = G.mode === "offer" ? other(L) : L;
  }
  function show(c, L, readonly) {
    if (G && !readonly) { G.cur = c; G.L = L; G.shown.push(c.id); G.i++; addHist(c.id, "seen"); }
    const fav = S.favs.includes(c.id);
    const whoTxt = c.cat === "poses" ? "Вдвоём" : c.who === "both" ? "Вместе" : `Ведёт ${NAMES[L].n}`;
    const prog = G && G.mode === "series" ? `<div class="prog"><i style="width:${(G.i / G.n) * 100}%"></i></div>` : "";
    const title = G ? (G.mode === "series" ? `Серия · ${G.i} из ${G.n}` : G.scope ? CATN[G.scope] : MODEN[G.mode] || "Карточка") : "Карточка";
    stage(`${sbar(title)}${prog}<div class="cardwrap"><article class="card" id="card">
        <div class="ctag"><span class="pill">${esc(CATN[c.cat])}</span><span class="pill who">${whoTxt}</span></div>
        ${c.cat === "poses" ? `<div class="art">${poseSVG(c.base, c.prop)}<div class="legend"><span><i class="dot" style="background:var(--she)"></i>она</span><span><i class="dot" style="background:var(--he)"></i>он</span></div></div>` : ""}
        <h2>${esc(fill(c.t, L))}</h2><p class="d">${esc(fill(c.d, L))}</p>
        ${c.tip ? `<div class="tip"><b>${c.cat === "poses" ? "Как устроиться" : "Совет"}</b>${esc(fill(c.tip, L))}</div>` : ""}
        <div class="meta"><span>⏱ ${DUR[c.dur]}</span>${c.tags.length ? `<span>· ${c.tags.map(esc).join(", ")}</span>` : ""}</div>
      </article></div>
      ${readonly ? `<div class="acts" style="grid-template-columns:1fr auto"><button class="b-done" data-close>Готово</button><button class="b-fav" data-fav="${c.id}" aria-pressed="${fav}" aria-label="В избранное">${fav ? "♥" : "♡"}</button></div>`
        : `<div class="acts"><button class="b-skip" data-act="skip">Пропустить</button><button class="b-next" data-act="next">Следующее</button><button class="b-done" data-act="done">Выполнить</button><button class="b-fav" data-fav="${c.id}" aria-pressed="${fav}" aria-label="В избранное">${fav ? "♥" : "♡"}</button></div>
      <div class="more"><button data-hide="${c.id}">Больше не показывать</button></div><p class="hint">Свайп влево: пропустить · вправо: следующее</p>`}`);
    if (!readonly) swipe($("#card"));
  }
  function finish() {
    stage(`${sbar("Серия")}<div class="done-box"><h2>Серия пройдена</h2><p style="color:var(--text2);margin:0">Выполнено ${G.done} из ${G.n}</p><button class="big" data-again>Ещё серию</button><button class="b-skip" style="border-radius:18px;min-height:52px" data-close>На главную</button></div>`);
  }
  function act(a) {
    if (!G || !G.cur) return;
    const card = $("#card");
    if (a === "done") { setHist(G.cur.id, "done"); G.done++; toast("Отмечено ✓"); }
    if (a === "skip") setHist(G.cur.id, "skip");
    if (card) { card.classList.add(a === "skip" ? "out-l" : "out-r"); setTimeout(next, 260); } else next();
  }
  function addHist(id, s) { S.hist.unshift({ id, s, at: Date.now() }); S.hist = S.hist.slice(0, 200); save(); }
  function setHist(id, s) { const h = S.hist.find((x) => x.id === id); if (h) h.s = s; save(); }
  function swipe(el) {
    let x0 = null, dx = 0;
    el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; dx = 0; el.style.transition = "none"; }, { passive: true });
    el.addEventListener("touchmove", (e) => { if (x0 == null) return; dx = e.touches[0].clientX - x0; if (Math.abs(dx) > 8) el.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`; }, { passive: true });
    el.addEventListener("touchend", () => { el.style.transition = ""; if (Math.abs(dx) > 90) act(dx < 0 ? "skip" : "next"); else el.style.transform = ""; x0 = null; });
  }

  /* ---------- нажатия ---------- */
  document.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    let b;
    if ((b = t("[data-tab]"))) { TAB = b.dataset.tab; render(); return; }
    if ((b = t("[data-start]"))) return start(b.dataset.start);
    if ((b = t("[data-series]"))) return start("series", { n: +b.dataset.series });
    if ((b = t("[data-cat]"))) { if (!S.cats[b.dataset.cat]) { S.cats[b.dataset.cat] = true; save(); } return start("random", { scope: b.dataset.cat }); }
    if ((b = t("[data-close]"))) return closeStage();
    if ((b = t("[data-act]"))) return act(b.dataset.act);
    if ((b = t("[data-pickc]"))) { const c = BYID[b.dataset.pickc]; G.shown.push(...G.opts.map((o) => o.id).filter((id) => id !== c.id)); return show(c, G.L); }
    if ((b = t("[data-reroll]"))) { G.shown.push(...G.opts.map((o) => o.id)); return choose(); }
    if ((b = t("[data-again]"))) return start("series", { n: G.n });
    if ((b = t("[data-fav]"))) { const id = b.dataset.fav, i = S.favs.indexOf(id); if (i >= 0) S.favs.splice(i, 1); else S.favs.unshift(id); save(); const on = i < 0; b.setAttribute("aria-pressed", on); b.textContent = on ? "♥" : "♡"; toast(on ? "В избранном" : "Убрано из избранного"); return; }
    if ((b = t("[data-hide]"))) { S.exCards.push(b.dataset.hide); save(); toast("Карточка скрыта"); return next(); }
    if ((b = t("[data-open]"))) { G = null; return show(BYID[b.dataset.open], S.who === "he" ? "he" : "she", true); }
    if ((b = t("[data-tcat]"))) { const id = b.dataset.tcat; S.cats[id] = !S.cats[id]; if (!Object.values(S.cats).some(Boolean)) { S.cats[id] = true; toast("Нужна хотя бы одна категория"); } save(); render(); return; }
    if ((b = t("[data-who]"))) { S.who = b.dataset.who; save(); render(); return; }
    if ((b = t("[data-dur]"))) { S.dur = +b.dataset.dur; save(); render(); return; }
    if ((b = t("[data-tag]"))) { const g = b.dataset.tag, i = S.exTags.indexOf(g); if (i >= 0) S.exTags.splice(i, 1); else S.exTags.push(g); save(); render(); return; }
    if ((b = t("[data-preset]"))) { S.exTags = b.dataset.preset === "soft" ? [...new Set(S.exTags.concat(SOFT))] : S.exTags.filter((x) => !PRACT.includes(x) && x !== "акробатика"); save(); render(); toast(b.dataset.preset === "soft" ? "Включён нежный режим" : "Все практики разрешены"); return; }
    if ((b = t("[data-unhide]"))) { S.exCards = S.exCards.filter((x) => x !== b.dataset.unhide); save(); render(); return; }
    if ((b = t("[data-clear]"))) {
      if (b.dataset.clear === "hist") { if (confirm("Очистить историю?")) { S.hist = []; save(); render(); } return; }
      if (confirm("Сбросить настройки, избранное и историю?")) { const a = S.adult; S = def(); S.adult = a; save(); render(); }
      return;
    }
    if ((b = t("[data-adult]"))) { S.adult = true; save(); $("#gate").remove(); render(); }
  });
  document.addEventListener("keydown", (e) => { if (!$("#stage") || !G || !G.cur) return; if (e.key === "ArrowLeft") act("skip"); if (e.key === "ArrowRight") act("next"); if (e.key === "Escape") closeStage(); });

  /* ---------- старт ---------- */
  render();
  if (!S.adult) {
    const g = document.createElement("div"); g.className = "gate"; g.id = "gate";
    g.innerHTML = `<div class="gate-in"><h1>Между нами</h1><p>Интимная игра для пары: позы, ласки, игрушки, ролевые сценарии и откровенные вопросы.</p><p>Только для взрослых. Всё по взаимному согласию: любую карточку можно пропустить, а ненужные практики выключить в настройках.</p><button class="big" data-adult>Мне есть 18, начать</button><small>Настройки, избранное и история хранятся только на этом телефоне.</small></div>`;
    document.body.appendChild(g);
  }
})();
