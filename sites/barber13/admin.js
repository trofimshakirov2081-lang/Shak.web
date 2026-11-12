// Админка BARBER 13. Подгружается только по ссылке «Вход для мастера» или по адресу #admin.
// Все правки сразу видны на сайте; кнопка «Сохранить» записывает их (в черновике в этом браузере, в рабочей версии в таблицу).
window.B13Admin = (function () {
  const DAYS = [[1, "Пн"], [2, "Вт"], [3, "Ср"], [4, "Чт"], [5, "Пт"], [6, "Сб"], [0, "Вс"]];
  const BUILT_IN = { team: "Мастера", quick: "Быстрая запись", map: "Адрес и карта", outro: "Финал с машинкой" };
  const MENU = [
    ["Работа", [["bookings", "Записи"], ["schedule", "Расписание"]]],
    ["Салон", [["masters", "Мастера"], ["services", "Услуги и цены"], ["quick", "Быстрая запись"]]],
    ["Сайт", [["texts", "Тексты и контакты"], ["sections", "Разделы сайта"], ["look", "Оформление"]]],
    ["Настройки", [["bot", "Telegram-бот"], ["pass", "Пароль"]]]
  ];
  let root, tab = null, dirty = false, authed = false, PASS = "", LIST = null; // LIST: записи из таблицы
  const bookings = () => API ? (LIST || []) : load();
  const toMin = v => { const [h, m] = (v || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
  const toHM = m => hm(m);
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  const css = `
  .adm{position:fixed;inset:0;z-index:100;background:rgba(8,7,6,.7);display:flex;justify-content:center;align-items:flex-start;overflow:auto;-webkit-overflow-scrolling:touch}
  .adm .pan{width:100%;max-width:720px;min-height:100%;background:var(--onyx);border-left:1px solid var(--line);border-right:1px solid var(--line)}
  .adm .top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(14,12,11,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
  .adm .top b{font:400 20px var(--fh,"Forum");min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .adm .top .btn{padding:9px 14px}
  .adm .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--gold);margin-left:6px;vertical-align:middle}
  .adm .bd{padding:16px 16px 60px}
  .adm h3{font:400 24px var(--fh,"Forum");margin:22px 0 10px}
  .adm h3:first-child{margin-top:4px}
  .adm .mg{margin:0 0 18px}
  .adm .mg>span{display:block;font-size:13px;color:var(--smoke);margin:0 0 6px}
  .adm .row-l{display:flex;align-items:center;justify-content:space-between;width:100%;padding:15px 16px;margin:0 0 -1px;background:rgba(255,255,255,.03);border:1px solid var(--line);color:var(--ivory);text-align:left;cursor:pointer;font-size:17px}
  .adm .mg .row-l:first-of-type{border-radius:14px 14px 0 0}.adm .mg .row-l:last-of-type{border-radius:0 0 14px 14px}
  .adm .mg .row-l:only-of-type{border-radius:14px}
  .adm .row-l small{color:var(--smoke);font-size:14px}
  .adm .card{background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:14px;padding:14px;margin:0 0 10px}
  .adm label.f{display:block;font-size:13px;color:var(--smoke);margin:10px 0 4px}
  .adm input:not([type=checkbox]):not([type=radio]):not([type=file]),.adm select,.adm textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 11px;background:rgba(255,255,255,.05);color:var(--ivory);font:inherit;font-size:16px}
  .adm select option{background:var(--onyx)}
  .adm textarea{min-height:90px;resize:vertical}
  .adm input[type=checkbox],.adm input[type=radio]{width:20px;height:20px;accent-color:var(--gold);flex:none}
  .adm input[type=range]{accent-color:var(--gold)}
  .adm .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .adm .line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .adm .line+.line{margin-top:8px}
  .adm .sm{background:none;border:1px solid var(--line);color:var(--ivory);border-radius:999px;padding:7px 13px;cursor:pointer;font:inherit;font-size:14px}
  .adm .sm.del{color:#FF9A8A;border-color:rgba(255,154,138,.35)}
  .adm .add{width:100%;margin-top:6px;padding:13px;border:1px dashed var(--line);border-radius:14px;background:none;color:var(--ivory);cursor:pointer;font:inherit}
  .adm .hint{font-size:14px;color:var(--smoke);margin:6px 0 12px;line-height:1.5}
  .adm .ph{width:64px;height:64px;border-radius:12px;object-fit:cover;background:#000;flex:none}
  .adm .wk{display:grid;grid-template-columns:30px 22px minmax(0,1fr) minmax(0,1fr);gap:6px 8px;align-items:center}
  .adm .wk input[type=time]{min-width:0;padding:9px 6px}
  .adm .wk span{font-weight:800}
  .adm .wk input[type=time]:disabled{opacity:.3}
  .adm .bk{display:flex;gap:10px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--line)}
  .adm .bk:first-child{border-top:0}
  .adm .bk .tm{font:400 22px var(--fh,"Forum");min-width:58px}
  .adm .bk .i{flex:1;font-size:15px;line-height:1.45}
  .adm .bk .i small{color:var(--smoke)}
  .adm .tag{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:1px 8px;margin-left:4px;color:var(--smoke)}
  .adm .sw{display:flex;gap:4px;margin:6px 0}.adm .sw i{width:22px;height:22px;border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.15)}
  .adm .opt{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
  .adm .opt.on{border-color:var(--ivory)}
  .adm .toast{position:fixed;left:50%;top:76px;transform:translateX(-50%);background:var(--ivory);color:var(--ink);font-weight:800;border-radius:999px;padding:9px 18px;z-index:3}
  .adm .login{max-width:340px;margin:18vh auto 0;padding:0 16px}
  .adm .login .btn{width:100%;margin-top:10px}
  .adm .err{min-height:1.2em}
  `;

  // ---------- график одной строкой (тот же разбор, что в боте) ----------
  const DMAP = { "пн": 1, "вт": 2, "ср": 3, "чт": 4, "пт": 5, "сб": 6, "вс": 0 }, DNAME = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  function parseSchedule(text) {
    const masters = SHOP.masters, out = [], all = masters.map(m => m.id);
    String(text).split(/[\n;,]+/).forEach(part => {
      let p = part.trim().toLowerCase().replace(/\u2014|\u2013/g, "-"); if (!p) return;
      let who = all; const mm = masters.find(m => p.startsWith(m.name.toLowerCase()));
      if (mm) { who = [mm.id]; p = p.slice(mm.name.length).replace(/^[\s:]+/, ""); }
      const whoName = mm ? mm.name : "все";
      let date = null; const dm = p.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
      if (dm) { const y = dm[3] ? (dm[3].length === 2 ? "20" + dm[3] : dm[3]) : String(new Date().getFullYear()); date = `${y}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`; p = p.replace(dm[0], " "); }
      const off = /выходн|не работ/.test(p);
      const h = p.match(/(\d{1,2})(?::(\d\d))?\s*(?:-|до)\s*(\d{1,2})(?::(\d\d))?/);
      const hours = h ? [+h[1] * 60 + +(h[2] || 0), +h[3] * 60 + +(h[4] || 0)] : null;
      if (!off && (!hours || hours[1] <= hours[0])) return;
      const label = off ? "выходной" : hm(hours[0]) + "-" + hm(hours[1]);
      if (date) {
        const ids = who === all ? ["all"] : who;
        SHOP.exceptions = SHOP.exceptions.filter(x => !(x.date === date && ids.includes(x.master)));
        ids.forEach(id => SHOP.exceptions.push(off ? { date, master: id, off: true } : { date, master: id, from: hours[0], to: hours[1] }));
        out.push(`${niceDate(date)}, ${whoName}: ${label}`); return;
      }
      let days = [];
      if (/будн/.test(p)) days = [1, 2, 3, 4, 5];
      const rg = p.match(/(пн|вт|ср|чт|пт|сб|вс)\s*-\s*(пн|вт|ср|чт|пт|сб|вс)/);
      if (rg) { let d = DMAP[rg[1]]; const e = DMAP[rg[2]]; for (let k = 0; k < 7; k++) { days.push(d); if (d === e) break; d = (d + 1) % 7; } p = p.replace(rg[0], " "); }
      (p.match(/пн|вт|ср|чт|пт|сб|вс/g) || []).forEach(t => days.push(DMAP[t]));
      if (!days.length) days = [1, 2, 3, 4, 5, 6, 0];
      masters.filter(m => who.includes(m.id)).forEach(m => { m.hours = clone(m.hours || WEEK); days.forEach(d => m.hours[d] = off ? null : hours.slice()); });
      out.push(`${days.length === 7 ? "каждый день" : days.map(d => DNAME[d]).join(", ")}, ${whoName}: ${label}`);
    });
    return out;
  }

  // ---------- общие кусочки ----------
  function toast(t) { const x = document.createElement("div"); x.className = "toast"; x.textContent = t; root.appendChild(x); setTimeout(() => x.remove(), 1800); }
  function changed() { dirty = true; drawAll(); top(); }
  function photoInput(act, i) { return `<input type="file" accept="image/*" data-act="${act}" data-i="${i}" hidden id="f-${act}-${i}"><label class="sm" for="f-${act}-${i}">Заменить фото</label>`; }
  // Фото сжимаем до 800 px, чтобы влезали в хранилище
  function readPhoto(file, cb) {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", .82)); }; img.src = r.result; };
    r.readAsDataURL(file);
  }
  const mName = id => id === "all" ? "Все мастера" : (SHOP.masters.find(m => m.id === id) || {}).name || "?";

  // ---------- разделы админки ----------
  const V = {};
  V.menu = () => MENU.map(([g, items]) => `<div class="mg"><span>${g}</span>${items.map(([id, l]) =>
    `<button class="row-l" data-open="${id}">${l}<small>${hint(id)}</small></button>`).join("")}</div>`).join("") +
    `<p class="hint">Все правки сразу видны на сайте за этим окном. Чтобы они остались, нажмите «Сохранить».${API ? " Записи и настройки хранятся в Google-таблице." : " Пока сайт не подключён к таблице, сохранение работает только в этом браузере."}</p>`;
  function hint(id) {
    const now = ymd(new Date());
    if (id === "bookings") { const n = bookings().filter(b => b.status !== "cancelled" && b.date >= now).length; return n ? n + " впереди" : ""; }
    if (id === "masters") return SHOP.masters.length;
    if (id === "services") return SHOP.services.length;
    if (id === "quick") return SHOP.quick.length + " карточек";
    if (id === "sections") { const h = SHOP.sections.filter(s => !s.on).length; return h ? "скрыто: " + h : ""; }
    if (id === "look") return (THEMES[SHOP.theme] || {}).name || "";
    return "";
  }

  V.bookings = () => {
    const now = ymd(new Date()), all = bookings().filter(b => b.date >= now).sort((a, b) => (a.date + String(a.start).padStart(4, "0")).localeCompare(b.date + String(b.start).padStart(4, "0")));
    const days = [...new Set(all.map(b => b.date))];
    return `<button class="btn" data-act="newBooking" style="width:100%">Записать клиента</button>
      <p class="hint">Записи с сайта появляются здесь. Отмена и перенос освобождают время для других.</p>` +
      (days.length ? days.map(d => `<h3>${niceDate(d)}</h3><div class="card">${all.filter(b => b.date === d).map(b => `<div class="bk">
        <div class="tm">${hm(b.start)}</div><div class="i"><b>${esc(b.name)}</b> <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>${b.status === "cancelled" ? '<span class="tag">отменена</span>' : b.status === "moved" ? '<span class="tag">перенесена</span>' : ""}<br>
        ${esc(mName(b.master))}: ${esc(b.svc.join(", "))}<br><small>${dur(b.len)}, ${rub(b.price)}${b.comment ? ". " + esc(b.comment) : ""}</small>
        ${b.status !== "cancelled" ? `<div class="line" style="margin-top:8px"><button class="sm" data-act="moveBooking" data-id="${b.id}">Перенести</button><button class="sm del" data-act="cancelBooking" data-id="${b.id}">Отменить</button></div>` : ""}</div></div>`).join("")}</div>`).join("")
        : `<div class="card">Пока записей нет. Как только кто-то запишется на сайте, запись появится здесь.</div>`);
  };

  V.schedule = () => `<h3>Быстро заполнить</h3><div class="card">
      <p class="hint" style="margin-top:0">Напишите график одной строкой, как в боте. Например: <b>пн-пт 10-21, сб 11-19, вс выходной</b>, или просто <b>10-21</b> на каждый день, или <b>31.10 выходной</b>. Для одного мастера: <b>Иван: сб 12-20</b>.</p>
      <input id="qsched" placeholder="пн-пт 10-21, сб 11-19, вс выходной"><button class="btn" data-act="quickSched" style="width:100%;margin-top:10px">Применить</button><p class="hint" id="qschedMsg"></p></div>` +
    SHOP.masters.map((m, i) => `<h3>${esc(m.name)}</h3><div class="card"><div class="wk">${DAYS.map(([d, l]) => {
      const h = m.hours && m.hours[d];
      return `<span>${l}</span><input type="checkbox" data-act="dayOn" data-i="${i}" data-d="${d}" ${h ? "checked" : ""} aria-label="${l}: работает">
        <input type="time" step="1800" data-act="dayFrom" data-i="${i}" data-d="${d}" value="${toHM(h ? h[0] : 600)}" ${h ? "" : "disabled"}>
        <input type="time" step="1800" data-act="dayTo" data-i="${i}" data-d="${d}" value="${toHM(h ? h[1] : 1260)}" ${h ? "" : "disabled"}>`; }).join("")}</div>
      <p class="hint" style="margin-bottom:0">Галочка снята: выходной.</p>${SHOP.masters.length > 1 ? `<button class="sm" data-act="copySched" data-i="${i}" style="margin-top:10px">Такой же график всем мастерам</button>` : ""}</div>`).join("") +
    `<h3>Выходные и особые дни</h3><p class="hint">Отпуск, больничный, короткий день. Это важнее обычного графика.</p>` +
    SHOP.exceptions.slice().sort((a, b) => a.date.localeCompare(b.date)).map(x => `<div class="card line" style="justify-content:space-between">
      <span><b>${niceDate(x.date)}</b>, ${esc(mName(x.master))}: ${x.off ? "выходной" : hm(x.from) + "-" + hm(x.to)}</span>
      <button class="sm del" data-act="delEx" data-k="${SHOP.exceptions.indexOf(x)}">Убрать</button></div>`).join("") +
    `<div class="card"><div class="two"><div><label class="f">Дата</label><input type="date" id="exDate" value="${ymd(new Date())}"></div>
      <div><label class="f">Кто</label><select id="exWho"><option value="all">Все мастера</option>${SHOP.masters.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></div></div>
      <div class="line" style="margin-top:10px"><label class="line"><input type="radio" name="exKind" value="off" checked> Выходной</label><label class="line"><input type="radio" name="exKind" value="hours"> Другие часы</label></div>
      <div class="two" style="margin-top:8px"><input type="time" id="exFrom" value="10:00" step="1800"><input type="time" id="exTo" value="15:00" step="1800"></div>
      <button class="add" data-act="addEx">Добавить</button></div>` +
    `<h3>Запись</h3><div class="card"><div class="two">
      <div><label class="f">Шаг времени</label><select data-act="step">${[15, 30, 60].map(v => `<option ${SHOP.step === v ? "selected" : ""} value="${v}">${v} мин</option>`).join("")}</select></div>
      <div><label class="f">Дней вперёд</label><input type="number" min="3" max="60" data-act="daysAhead" value="${SHOP.daysAhead}"></div></div>
      <label class="line" style="margin-top:12px"><input type="checkbox" data-act="demoBusy" ${SHOP.demoBusy ? "checked" : ""}> Показывать пример занятого времени (для демонстрации, в рабочей версии выключить)</label></div>`;

  V.masters = () => SHOP.masters.map((m, i) => `<div class="card"><div class="line"><img class="ph" src="${m.photo || "img/scis.webp"}" alt="" style="object-position:50% ${m.pos == null ? 50 : m.pos}%">
      <div style="flex:1;min-width:160px"><input data-act="mName" data-i="${i}" value="${esc(m.name)}" placeholder="Имя"><input data-act="mRole" data-i="${i}" value="${esc(m.role)}" placeholder="Должность" style="margin-top:6px"></div></div>
      <label class="f">Лицо на фото: двигайте, чтобы лицо было по центру</label><input type="range" min="0" max="100" data-act="mPos" data-i="${i}" value="${m.pos == null ? 50 : m.pos}" style="width:100%">
      <div class="line" style="margin-top:10px">${photoInput("mPhoto", i)}<button class="sm del" data-act="mDel" data-i="${i}">Удалить мастера</button></div></div>`).join("") +
    `<button class="add" data-act="mAdd">+ Добавить мастера</button><p class="hint">Часы работы нового мастера настраиваются в разделе «Расписание», услуги в «Услугах и ценах».</p>`;

  V.services = () => `<p class="hint">«Доп. услуга» показывается в записи отдельно, в блоке «Можно добавить».</p>` + SHOP.services.map((s, i) => `<div class="card">
      <input data-act="sT" data-i="${i}" value="${esc(s.t)}" placeholder="Название услуги">
      <div class="two" style="margin-top:8px"><div><label class="f">Цена, ₽</label><input type="number" min="0" step="50" data-act="sP" data-i="${i}" value="${s.p}"></div>
      <div><label class="f">Длительность, мин</label><input type="number" min="5" step="5" data-act="sM" data-i="${i}" value="${s.m}"></div></div>
      <div class="line" style="margin-top:10px">${SHOP.masters.map(m => `<label class="line"><input type="checkbox" data-act="sWho" data-i="${i}" data-m="${m.id}" ${s.who.includes(m.id) ? "checked" : ""}> ${esc(m.name)}</label>`).join("")}
      <label class="line"><input type="checkbox" data-act="sExtra" data-i="${i}" ${s.extra ? "checked" : ""}> Доп. услуга</label></div>
      <div class="line" style="margin-top:10px"><button class="sm" data-act="sUp" data-i="${i}">Выше</button><button class="sm del" data-act="sDel" data-i="${i}">Удалить</button></div></div>`).join("") +
    `<button class="add" data-act="sAdd">+ Добавить услугу</button>`;

  V.quick = () => `<p class="hint">Карточки в барабане «Быстрая запись». Клиент нажимает, и в записи уже выбраны мастер и услуга.</p>` + SHOP.quick.map(([sid, mid], i) => {
      const s = SHOP.services.find(x => x.id === sid);
      return `<div class="card"><div class="two"><select data-act="qS" data-i="${i}">${SHOP.services.filter(x => !x.extra || x.id === sid).map(x => `<option value="${x.id}" ${x.id === sid ? "selected" : ""}>${esc(x.t)}, ${rub(x.p)}</option>`).join("")}</select>
        <select data-act="qM" data-i="${i}">${SHOP.masters.filter(m => !s || s.who.includes(m.id)).map(m => `<option value="${m.id}" ${m.id === mid ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></div>
        <div class="line" style="margin-top:8px"><button class="sm" data-act="qUp" data-i="${i}">Выше</button><button class="sm del" data-act="qDel" data-i="${i}">Убрать</button></div></div>`; }).join("") +
    `<button class="add" data-act="qAdd">+ Добавить карточку</button>`;

  V.texts = () => {
    const T = SHOP.texts, f = (k, l, ph) => `<label class="f">${l}</label><input data-act="text" data-k="${k}" value="${esc(T[k])}" placeholder="${ph || ""}">`;
    return `<div class="card">${f("h1", "Заголовок")}${f("lead", "Строка под заголовком")}${f("address", "Адрес")}${f("phone", "Телефон на сайте", "Не показывать, если пусто")}${f("outro", "Надпись в конце страницы")}</div>
      <div class="card"><label class="line"><input type="checkbox" data-act="showFind" ${SHOP.showFind ? "checked" : ""}> Показывать кнопки «Моя запись» и «Перенести или отменить запись»</label></div>`;
  };

  V.sections = () => `<p class="hint">Порядок блоков под записью. Скрытый раздел не виден на сайте, но не удаляется.</p>` + SHOP.sections.map((s, i) => `<div class="card">
      <div class="line" style="justify-content:space-between"><label class="line"><input type="checkbox" data-act="secOn" data-i="${i}" ${s.on ? "checked" : ""}> <b>${esc(s.custom ? s.title || "Новый раздел" : BUILT_IN[s.id])}</b></label>
      <span class="line"><button class="sm" data-act="secUp" data-i="${i}" aria-label="Выше">Выше</button>${s.custom ? `<button class="sm del" data-act="secDel" data-i="${i}">Удалить</button>` : ""}</span></div>
      ${s.custom ? `<label class="f">Заголовок</label><input data-act="secTitle" data-i="${i}" value="${esc(s.title)}">
        <label class="f">Текст</label><textarea data-act="secText" data-i="${i}">${esc(s.text)}</textarea>
        <div class="line" style="margin-top:8px">${s.photo ? `<img class="ph" src="${s.photo}" alt="">` : ""}${photoInput("secPhoto", i)}${s.photo ? `<button class="sm del" data-act="secNoPhoto" data-i="${i}">Убрать фото</button>` : ""}</div>` : ""}</div>`).join("") +
    `<button class="add" data-act="secAdd">+ Добавить свой раздел</button><p class="hint">Например: «Акции», «Подарочные сертификаты», «Правила записи».</p>`;

  V.look = () => { Object.entries(FONTS).forEach(([k, f]) => { if (f.q && !document.querySelector(`link[data-f="${k}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.dataset.f = k; l.href = `https://fonts.googleapis.com/css2?${f.q}&display=swap`; document.head.appendChild(l); } });
    return `<h3>Цвета</h3>` + Object.entries(THEMES).map(([k, t]) => {
      const v = Object.assign({ "--onyx": "#0E0C0B", "--onyx2": "#1A1614", "--gold": "#C9A063", "--ivory": "#EFE7DA", "--smoke": "#9A9087" }, t.v);
      return `<div class="card opt ${SHOP.theme === k ? "on" : ""}" data-act="theme" data-k="${k}"><input type="radio" name="th" ${SHOP.theme === k ? "checked" : ""}>
        <div><b>${t.name}</b><div class="sw">${["--onyx", "--onyx2", "--gold", "--ivory", "--smoke"].map(c => `<i style="background:${v[c]}"></i>`).join("")}</div></div></div>`; }).join("") +
    `<h3>Шрифты</h3>` + Object.entries(FONTS).map(([k, f]) => `<div class="card opt ${SHOP.font === k ? "on" : ""}" data-act="font" data-k="${k}"><input type="radio" name="fn" ${SHOP.font === k ? "checked" : ""}>
      <div><b style="font:400 24px '${f.h}',serif">Барбершоп на Юбилейной</b><div style="font-family:'${f.b}'">${f.name}. Запись за минуту, звонить не нужно.</div></div></div>`).join(""); };

  V.bot = () => `<div class="card"><b>Как работает бот</b><p class="hint" style="margin-bottom:0">Мастеру приходят новые записи, отмены и переносы. Клиент, который нажал «Start» в боте, получает напоминание за день и за 2 часа.<br><br>
      Расписание можно менять прямо в боте: команда /расписание, дальше кнопки «выходной» или «работаю с … до …» на нужный день. Если бот не отвечает, всё то же самое есть здесь в разделе «Расписание».</p></div>
    <h3>Изменить токен бота</h3><div class="card">
      <p class="hint" style="margin-top:0">Токен выдаёт @BotFather (команда /newbot или /token). Он хранится в закрытой таблице, а не в коде сайта, поэтому его никто не увидит.</p>
      <input type="password" id="botToken" autocomplete="off" placeholder="1234567890:AAH...">
      <button class="btn" data-act="saveToken" style="width:100%;margin-top:10px">Сохранить токен</button><p class="hint err" id="botMsg"></p></div>
    <div class="card"><b>Чтобы записи приходили вам</b><p class="hint" style="margin-bottom:0">Откройте бота${BOT ? " @" + BOT : ""} и отправьте ему: /admin и ваш пароль от админки через пробел. После этого бот присылает записи, переносы и отмены.</p></div>`;

  V.pass = () => `<div class="card"><label class="f">Новый пароль</label><input type="password" id="np1" autocomplete="new-password"><label class="f">Ещё раз</label><input type="password" id="np2" autocomplete="new-password">
    <button class="btn" data-act="savePass" style="width:100%;margin-top:12px">Сменить пароль</button><p class="hint err" id="passMsg"></p></div>`;

  // ---------- отрисовка ----------
  function top() {
    const t = tab ? MENU.flatMap(g => g[1]).find(x => x[0] === tab)[1] : "Админка";
    root.querySelector(".top").innerHTML = `${tab ? '<button class="sm" data-act="back">Назад</button>' : ""}<b>${t}${dirty ? '<i class="dot" title="Есть несохранённые правки"></i>' : ""}</b>
      <button class="btn" data-act="save">Сохранить</button><button class="sm" data-act="close">На сайт</button>`;
  }
  function render() {
    if (!authed) { root.querySelector(".top").innerHTML = `<b>Вход для мастера</b><button class="sm" data-act="close">На сайт</button>`;
      root.querySelector(".bd").innerHTML = `<div class="login"><input type="password" id="pw" placeholder="Пароль" autocomplete="current-password"><button class="btn" data-act="login">Войти</button><p class="hint err" id="pwMsg"></p></div>`;
      setTimeout(() => { const p = root.querySelector("#pw"); p && p.focus(); }, 50); return; }
    top(); const st0 = root.scrollTop;
    root.querySelector(".bd").innerHTML = V[tab || "menu"]();
    root.scrollTop = st0;
  }
  function go(t) {
    tab = t; render(); root.scrollTop = 0;
    if (t === "bookings" && API) api({ action: "list", pass: PASS }).then(r => { if (r.ok) { LIST = r.list.map(b => Object.assign(b, { date: fixDay(b.date) })); if (tab === "bookings") render(); } });
  }

  // ---------- действия ----------
  const A = {
    login() {
      const v = root.querySelector("#pw").value, ok = () => { authed = true; PASS = v; try { sessionStorage.setItem("b13adm", v); } catch (e) {} render(); }, no = t => root.querySelector("#pwMsg").textContent = t;
      if (!API) return v === (SHOP.adminPass || "barber13") ? ok() : no("Неверный пароль.");
      no("Проверяю..."); api({ action: "login", pass: v }).then(r => r.ok ? ok() : no("Неверный пароль.")).catch(() => no("Нет связи с таблицей."));
    },
    back() { go(null); },
    close() { if (dirty && confirm("Сохранить изменения?")) A.save(); else if (dirty) { SHOP = Object.assign(clone(DEFAULT_SHOP), JSON.parse(localStorage.getItem("b13cfg") || "{}")); drawAll(); } dirty = false; root.remove(); root = null; history.replaceState(null, "", location.pathname + location.search); },
    save() {
      if (!API) { if (saveShop()) { dirty = false; top(); toast("Сохранено"); } return; }
      toast("Сохраняю...");
      api({ action: "saveCfg", pass: PASS, cfg: SHOP }).then(r => { if (r.ok) { saveShop(); dirty = false; top(); toast("Сохранено"); } else alert("Не сохранилось: " + (r.error || "ошибка")); }).catch(() => alert("Нет связи с таблицей, попробуйте ещё раз."));
    },
    newBooking() { A.close(); st.edit = null; st.master = null; st.svc.clear(); st.date = null; st.time = null; $("flow").hidden = false; $("done").hidden = true; drawAll(); show(1); $("book").scrollIntoView({ behavior: "smooth" }); },
    cancelBooking(el) {
      if (!confirm("Отменить запись?")) return; const id = el.dataset.id;
      if (!API) { const l = load(), r = l.find(b => b.id === id); r.status = "cancelled"; save(l); drawMine(); drawDays(); drawTimes(); render(); return; }
      api({ action: "adminCancel", pass: PASS, id }).then(r => { if (!r.ok) return alert("Не получилось отменить."); LIST.find(b => b.id === id).status = "cancelled"; BUSY = (BUSY || []).filter(b => b[4] !== id); drawDays(); drawTimes(); render(); });
    },
    moveBooking(el) { const r = bookings().find(b => b.id === el.dataset.id); A.close(); st.edit = r.id; st.master = r.master; st.svc = new Set(r.svcIds || []); st.date = null; st.time = null;
      $("name").value = r.name; $("phone").value = r.phone; $("comment").value = r.comment || ""; $("flow").hidden = false; $("done").hidden = true; drawAll(); show(3); },
    quickSched() {
      const res = parseSchedule(root.querySelector("#qsched").value), msg = root.querySelector("#qschedMsg");
      if (!res.length) { msg.textContent = "Не понял. Пример: пн-пт 10-21, сб 11-19, вс выходной"; return; }
      changed(); render(); root.querySelector("#qschedMsg").textContent = "Готово: " + res.join("; ") + ". Не забудьте «Сохранить».";
    },
    copySched(el) { const h = SHOP.masters[+el.dataset.i].hours; SHOP.masters.forEach(m => m.hours = clone(h)); changed(); render(); toast("График скопирован"); },
    addEx() { const kind = root.querySelector("[name=exKind]:checked").value, x = { date: root.querySelector("#exDate").value, master: root.querySelector("#exWho").value };
      if (!x.date) return; if (kind === "off") x.off = true; else { x.from = toMin(root.querySelector("#exFrom").value); x.to = toMin(root.querySelector("#exTo").value); if (x.to <= x.from) return alert("Конец должен быть позже начала."); }
      SHOP.exceptions.push(x); changed(); render(); },
    delEx(el) { SHOP.exceptions.splice(+el.dataset.k, 1); changed(); render(); },
    mAdd() { SHOP.masters.push({ id: uid("m"), name: "Новый мастер", role: "Барбер", photo: "", hours: clone(WEEK) }); changed(); render(); },
    mDel(el) { const m = SHOP.masters[+el.dataset.i]; if (!confirm(`Удалить мастера ${m.name}? Его услуги и карточки быстрой записи тоже уберутся.`)) return;
      SHOP.masters.splice(+el.dataset.i, 1); SHOP.services.forEach(s => s.who = s.who.filter(w => w !== m.id)); SHOP.services = SHOP.services.filter(s => s.who.length);
      SHOP.quick = SHOP.quick.filter(q => q[1] !== m.id); changed(); render(); },
    sAdd() { SHOP.services.push({ id: Date.now(), t: "Новая услуга", p: 1000, m: 60, who: SHOP.masters.map(m => m.id) }); changed(); render(); },
    sDel(el) { const s = SHOP.services[+el.dataset.i]; if (!confirm(`Удалить услугу «${s.t}»?`)) return; SHOP.services.splice(+el.dataset.i, 1); SHOP.quick = SHOP.quick.filter(q => q[0] !== s.id); changed(); render(); },
    sUp(el) { const i = +el.dataset.i; if (i) { [SHOP.services[i - 1], SHOP.services[i]] = [SHOP.services[i], SHOP.services[i - 1]]; changed(); render(); } },
    qAdd() { const s = SHOP.services.find(x => !x.extra); if (s) { SHOP.quick.push([s.id, s.who[0]]); changed(); render(); } },
    qDel(el) { SHOP.quick.splice(+el.dataset.i, 1); changed(); render(); },
    qUp(el) { const i = +el.dataset.i; if (i) { [SHOP.quick[i - 1], SHOP.quick[i]] = [SHOP.quick[i], SHOP.quick[i - 1]]; changed(); render(); } },
    secAdd() { SHOP.sections.push({ id: uid("c"), custom: true, on: true, title: "Новый раздел", text: "" }); changed(); render(); },
    secDel(el) { if (confirm("Удалить раздел?")) { SHOP.sections.splice(+el.dataset.i, 1); changed(); render(); } },
    secUp(el) { const i = +el.dataset.i; if (i) { [SHOP.sections[i - 1], SHOP.sections[i]] = [SHOP.sections[i], SHOP.sections[i - 1]]; changed(); render(); } },
    secNoPhoto(el) { delete SHOP.sections[+el.dataset.i].photo; changed(); render(); },
    theme(el) { SHOP.theme = el.dataset.k; changed(); render(); },
    font(el) { SHOP.font = el.dataset.k; changed(); render(); },
    async saveToken() {
      const t = root.querySelector("#botToken").value.trim(), msg = root.querySelector("#botMsg");
      if (!/^\d{6,}:[\w-]{30,}$/.test(t)) { msg.textContent = "Похоже, это не токен. Он выглядит так: 1234567890:AAH... (цифры, двоеточие, буквы)."; return; }
      if (!API) { msg.textContent = "Таблица ещё не подключена, поэтому токен пока некуда сохранить. Вставьте его сюда ещё раз после подключения. В коде сайта токен не хранится."; return; }
      msg.textContent = "Сохраняю...";
      try { const r = await api({ action: "setToken", token: t, pass: PASS });
        if (r.ok) BOT = r.bot;
        msg.textContent = r.ok ? `Готово: подключён бот @${r.bot}. Отправьте ему /admin и пароль, чтобы получать записи.` : "Не получилось: " + (r.error || "ошибка таблицы"); }
      catch (e) { msg.textContent = "Нет связи с таблицей, попробуйте ещё раз."; }
      root.querySelector("#botToken").value = "";
    },
    savePass() { const a = root.querySelector("#np1").value, b = root.querySelector("#np2").value, msg = root.querySelector("#passMsg");
      if (a.length < 6) msg.textContent = "Пароль должен быть не короче 6 символов."; else if (a !== b) msg.textContent = "Пароли не совпадают.";
      else if (!API) { SHOP.adminPass = a; A.save(); msg.textContent = "Пароль изменён."; }
      else api({ action: "setPass", pass: PASS, newPass: a }).then(r => { if (r.ok) { PASS = a; try { sessionStorage.setItem("b13adm", a); } catch (e) {} } msg.textContent = r.ok ? "Пароль изменён. В боте тоже теперь новый." : "Не получилось: " + (r.error || "ошибка"); }); }
  };
  // Поля, которые меняются при вводе
  const F = {
    dayOn(el) { const m = SHOP.masters[+el.dataset.i], d = el.dataset.d; m.hours = clone(m.hours || WEEK); m.hours[d] = el.checked ? [600, 1260] : null; changed(); render(); },
    dayFrom(el) { const m = SHOP.masters[+el.dataset.i]; m.hours = clone(m.hours); m.hours[el.dataset.d][0] = toMin(el.value); changed(); },
    dayTo(el) { const m = SHOP.masters[+el.dataset.i]; m.hours = clone(m.hours); m.hours[el.dataset.d][1] = toMin(el.value); changed(); },
    step(el) { SHOP.step = +el.value; changed(); },
    daysAhead(el) { SHOP.daysAhead = Math.max(3, Math.min(60, +el.value || 14)); changed(); },
    demoBusy(el) { SHOP.demoBusy = el.checked; changed(); },
    mName(el) { SHOP.masters[+el.dataset.i].name = el.value; changed(); },
    mPos(el) { SHOP.masters[+el.dataset.i].pos = +el.value; changed(); const ph = el.closest(".card").querySelector(".ph"); if (ph) ph.style.objectPosition = `50% ${el.value}%`; },
    mRole(el) { SHOP.masters[+el.dataset.i].role = el.value; changed(); },
    mPhoto(el) { el.files[0] && readPhoto(el.files[0], u => { SHOP.masters[+el.dataset.i].photo = u; changed(); render(); }); },
    sT(el) { SHOP.services[+el.dataset.i].t = el.value; changed(); },
    sP(el) { SHOP.services[+el.dataset.i].p = Math.max(0, +el.value || 0); changed(); },
    sM(el) { SHOP.services[+el.dataset.i].m = Math.max(5, +el.value || 30); changed(); },
    sWho(el) { const s = SHOP.services[+el.dataset.i]; s.who = el.checked ? [...new Set([...s.who, el.dataset.m])] : s.who.filter(w => w !== el.dataset.m); changed(); },
    sExtra(el) { SHOP.services[+el.dataset.i].extra = el.checked; changed(); },
    qS(el) { const q = SHOP.quick[+el.dataset.i], s = SHOP.services.find(x => x.id === +el.value); q[0] = s.id; if (!s.who.includes(q[1])) q[1] = s.who[0]; changed(); render(); },
    qM(el) { SHOP.quick[+el.dataset.i][1] = el.value; changed(); },
    text(el) { SHOP.texts[el.dataset.k] = el.value; changed(); },
    showFind(el) { SHOP.showFind = el.checked; changed(); },
    secOn(el) { SHOP.sections[+el.dataset.i].on = el.checked; changed(); },
    secTitle(el) { SHOP.sections[+el.dataset.i].title = el.value; changed(); },
    secText(el) { SHOP.sections[+el.dataset.i].text = el.value; changed(); },
    secPhoto(el) { el.files[0] && readPhoto(el.files[0], u => { SHOP.sections[+el.dataset.i].photo = u; changed(); render(); }); },
    _(el) {}
  };

  function open() {
    if (root) return;
    if (!document.getElementById("admcss")) { const s = document.createElement("style"); s.id = "admcss"; s.textContent = css; document.head.appendChild(s); }
    try { PASS = sessionStorage.getItem("b13adm") || ""; authed = !!PASS; } catch (e) {}
    root = document.createElement("div"); root.className = "adm"; root.innerHTML = `<div class="pan"><div class="top"></div><div class="bd"></div></div>`;
    document.body.appendChild(root); tab = null; render();
    if (API) apiGet({ a: "init" }).then(r => { if (r.ok && r.cfg && r.cfg.masters && !dirty) { SHOP = Object.assign(clone(DEFAULT_SHOP), r.cfg); SHOP.demoBusy = false; BUSY = r.busy; drawAll(); if (root) render(); } }).catch(() => {});
    root.addEventListener("click", e => {
      const o = e.target.closest("[data-open]"); if (o) return go(o.dataset.open);
      const a = e.target.closest("[data-act]"); if (a && A[a.dataset.act]) { e.preventDefault(); A[a.dataset.act](a); }
    });
    root.addEventListener("input", e => { const f = F[e.target.dataset.act]; if (f && e.target.type !== "checkbox" && e.target.type !== "file" && e.target.tagName !== "SELECT") f(e.target); });
    root.addEventListener("change", e => { const f = F[e.target.dataset.act]; if (f && (e.target.type === "checkbox" || e.target.type === "file" || e.target.tagName === "SELECT")) f(e.target); });
    root.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "pw") A.login(); if (e.key === "Enter" && e.target.id === "qsched") A.quickSched(); });
  }
  return { open };
})();
