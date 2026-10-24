// Админка: владелец меняет товары, цены, тексты, цвета и контакты.
// Правки сохраняются в этом браузере. Кнопка «Скачать data.js» отдаёт файл,
// который кладётся на хостинг, чтобы изменения увидели все.
(function () {
  var S = window.Store, esc = S.esc;
  var data = S.load();
  var tab = "items";
  var dirty = false;

  var FONTS = ["Playfair Display", "Lora", "Cormorant Garamond", "PT Serif", "Manrope", "Montserrat", "Nunito", "Rubik", "Raleway", "Comfortaa", "Unbounded", "Inter"];
  var PALETTES = [
    ["#B5523B", "#F2C14E", "#FFF8F1", "#2B1D16"],
    ["#D9738A", "#F7D6DC", "#FFF7F8", "#3A1F27"],
    ["#5B3A29", "#D9A066", "#F8F1E7", "#2A1A12"],
    ["#2F5D50", "#E8B4A0", "#F6F3EE", "#1E2A26"],
    ["#1F6BFF", "#FFD23F", "#F7F9FF", "#121826"],
    ["#7A5C9E", "#F4C7D9", "#FBF7FF", "#271B33"],
    ["#222222", "#C9A86A", "#FAF7F2", "#141414"]
  ];

  // Вход
  var hint = document.getElementById("pinHint");
  document.getElementById("loginTitle").textContent = "Вход: " + data.brand.name;
  if (data.demo && data.demo.banner) hint.textContent = "Это демо, PIN: " + data.demo.pin;
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (document.getElementById("pin").value === String(data.demo.pin)) {
      try { sessionStorage.setItem(S.KEY + ":in", "1"); } catch (err) {}
      openAdmin();
    } else {
      document.getElementById("loginErr").hidden = false;
    }
  });
  try { if (sessionStorage.getItem(S.KEY + ":in")) openAdmin(); } catch (err) {}

  function openAdmin() {
    document.getElementById("login").hidden = true;
    document.getElementById("admin").hidden = false;
    document.getElementById("siteName").textContent = data.brand.name;
    render();
  }

  function get(path) { return path.split(".").reduce(function (o, k) { return o == null ? "" : o[k]; }, data); }
  function set(path, val) {
    var ks = path.split("."), o = data;
    for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }

  function field(label, path, opts) {
    opts = opts || {};
    var v = esc(get(path));
    var input = opts.area
      ? '<textarea data-k="' + path + '" rows="' + (opts.rows || 3) + '">' + v + '</textarea>'
      : '<input data-k="' + path + '" value="' + v + '"' + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + '>';
    return '<label>' + esc(label) + '</label>' + input;
  }

  function itemsTab() {
    return '<h2>Товары и цены</h2><p class="sub">Меняйте названия, цены и фото. Нажмите «Сохранить», и сайт обновится.</p>' +
      data.items.map(function (it, n) {
        return '<div class="item">' +
          '<div class="ph">' + (it.photo ? '<img src="' + esc(it.photo) + '" alt="">' : esc(it.emoji || "🍰")) + '</div>' +
          '<div class="fields">' +
            '<input class="nm" data-k="items.' + n + '.name" value="' + esc(it.name) + '" aria-label="Название" placeholder="Название">' +
            '<input class="price-in" data-k="items.' + n + '.price" data-num value="' + esc(it.price) + '" inputmode="numeric" aria-label="Цена" placeholder="Цена">' +
            '<textarea class="full" data-k="items.' + n + '.desc" rows="2" aria-label="Описание" placeholder="Описание">' + esc(it.desc) + '</textarea>' +
            '<input data-k="items.' + n + '.tag" value="' + esc(it.tag) + '" aria-label="Метка" placeholder="Метка: Хит, Новинка">' +
            '<input data-k="items.' + n + '.emoji" value="' + esc(it.emoji) + '" aria-label="Эмодзи" placeholder="Эмодзи">' +
          '</div>' +
          '<div class="acts">' +
            '<label class="ghost">📷 Загрузить фото<input type="file" accept="image/*" data-photo="' + n + '" hidden></label>' +
            (it.photo ? '<button class="ghost" data-nophoto="' + n + '">Убрать фото</button>' : '') +
            (n > 0 ? '<button class="ghost" data-up="' + n + '" aria-label="Выше">↑</button>' : '') +
            '<button class="danger" data-del="' + n + '">Удалить</button>' +
          '</div></div>';
      }).join("") +
      '<button class="primary" data-addItem>+ Добавить товар</button>';
  }

  function textsTab() {
    return '<h2>Тексты</h2><p class="sub">Всё, что написано на сайте.</p>' +
      field("Название", "brand.name") + field("Подпись под названием", "brand.tagline") + field("Город", "brand.city") +
      field("Главный заголовок", "hero.title", { area: true, rows: 2 }) + field("Текст под заголовком", "hero.text", { area: true }) +
      field("Кнопка на первом экране", "hero.cta") +
      field("Заголовок каталога", "sections.catalogTitle") + field("Текст каталога", "sections.catalogText", { area: true }) +
      field("Заголовок «О нас»", "sections.aboutTitle") + field("Текст «О нас»", "sections.aboutText", { area: true, rows: 4 }) +
      data.features.map(function (f, n) {
        return '<div class="row2">' + field("Преимущество " + (n + 1), "features." + n + ".title") + field("Иконка", "features." + n + ".icon") + '</div>' +
          field("Описание", "features." + n + ".text", { area: true, rows: 2 });
      }).join("");
  }

  function designTab() {
    var c = data.colors;
    var opt = function (path) {
      return FONTS.concat(FONTS.indexOf(get(path)) < 0 ? [get(path)] : []).map(function (f) {
        return '<option' + (f === get(path) ? ' selected' : '') + '>' + esc(f) + '</option>';
      }).join("");
    };
    return pagesBlock() + '<h2>Цвета и шрифты</h2><p class="sub">Выберите готовую палитру или настройте цвета вручную.</p>' +
      '<div class="presets">' + PALETTES.map(function (p, n) {
        return '<button data-pal="' + n + '" aria-label="Палитра ' + (n + 1) + '">' + p.map(function (x) { return '<i style="background:' + x + '"></i>'; }).join("") + '</button>';
      }).join("") + '</div>' +
      '<div class="colors">' +
        [["main", "Основной"], ["accent", "Акцент"], ["bg", "Фон"], ["text", "Текст"]].map(function (r) {
          return '<div><label>' + r[1] + '</label><input type="color" data-k="colors.' + r[0] + '" value="' + esc(c[r[0]]) + '"></div>';
        }).join("") +
      '</div>' +
      '<label>Шрифт заголовков</label><select data-k="fonts.head">' + opt("fonts.head") + '</select>' +
      '<label>Шрифт текста</label><select data-k="fonts.body">' + opt("fonts.body") + '</select>' +
      field("Валюта", "currency", { ph: "₽" });
  }

  // Выбор дизайна, если у сайта их несколько (extra.designPages): сайт сразу открывается в выбранном
  function curPage() { try { return localStorage.getItem(S.KEY + ":page") || "index.html"; } catch (e) { return "index.html"; } }
  function pagesBlock() {
    var x = data.extra || {}, P = x.designPages;
    if (!P || P.length < 2) return "";
    var cur = curPage(), names = x.designNames || [];
    return '<h2>Дизайн сайта</h2><p class="sub">Тексты, цены и фото общие, меняется только вид. Включается сразу.</p><div class="pages">' +
      P.map(function (p, n) {
        var v = ((x.pageExtra || {})[p] || {}).vars || {}, c = data.colors;
        var bg = v.bg || c.bg, fg = v.text || c.text, m = v.main || c.main;
        return '<button data-page="' + esc(p) + '"' + (p === cur ? ' class="on"' : '') + ' style="background:' + esc(bg) + ';color:' + esc(fg) + '">' +
          '<i style="background:' + esc(m) + '"></i><b>' + esc(names[n] || "Дизайн " + (n + 1)) + '</b><small>' + (p === cur ? "Включён" : "Включить") + '</small></button>';
      }).join("") + '</div><a class="ghost seesite" href="' + esc(cur) + '" target="_blank">Открыть сайт</a>';
  }

  function contactsTab() {
    return '<h2>Контакты</h2><p class="sub">Куда приходят заказы и как вас найти.</p>' +
      field("Телефон", "contacts.phone", { ph: "+7 700 000 00 00" }) +
      field("WhatsApp для заказов (только цифры)", "contacts.whatsapp", { ph: "77000000000" }) +
      field("Telegram (ник без @)", "contacts.telegram") + field("Instagram (ник без @)", "contacts.instagram") +
      field("Адрес", "contacts.address") + field("Часы работы", "contacts.hours");
  }

  function moreTab() {
    return '<h2>Ещё</h2><p class="sub">Сохранение для всех посетителей, PIN и сброс.</p>' +
      field("PIN для входа в админку", "demo.pin") +
      '<label><input type="checkbox" data-k="demo.banner" style="width:auto"' + (data.demo.banner ? ' checked' : '') + '> Показывать полоску «Это демо»</label>' +
      '<div class="stack"><button class="primary" data-export>Скачать data.js</button><button class="ghost" data-exportjson>Скачать копию в JSON</button><button class="danger" data-reset>Сбросить все правки</button></div>' +
      '<div class="note">Правки сохраняются в этом браузере, сайт сразу показывает их вам. Чтобы их увидели все посетители, скачайте data.js и отправьте его в shak.web: обновим сайт за пару минут.</div>';
  }

  var TABS = { items: itemsTab, texts: textsTab, design: designTab, contacts: contactsTab, more: moreTab };

  function render() {
    document.getElementById("panel").innerHTML = TABS[tab]();
    [].forEach.call(document.querySelectorAll("#tabs button"), function (b) { b.classList.toggle("on", b.dataset.tab === tab); });
  }

  function markDirty() {
    dirty = true;
    document.querySelector(".savebar").classList.add("dirty");
    document.getElementById("status").textContent = "Есть несохранённые изменения";
  }

  function save() {
    var ok = S.save(data);
    dirty = false;
    document.querySelector(".savebar").classList.toggle("dirty", !ok);
    document.getElementById("status").textContent = ok ? "Сохранено ✓ Сайт обновлён" : "Не хватает места: уменьшите или уберите часть фото";
    document.getElementById("siteName").textContent = data.brand.name;
    var f = document.getElementById("frame");
    if (f && f.contentWindow) f.contentWindow.location.reload();
  }

  function download(name, text, type) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // Фото ужимаем до 900 px, чтобы влезло в память браузера
  function readPhoto(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 900 / Math.max(img.width, img.height));
        var cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL("image/jpeg", 0.8));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  var panel = document.getElementById("panel");
  panel.addEventListener("input", function (e) {
    var k = e.target.dataset.k;
    if (!k) return;
    var v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (e.target.hasAttribute("data-num")) v = Number(String(v).replace(/\D/g, "")) || 0;
    set(k, v);
    markDirty();
  });
  panel.addEventListener("change", function (e) {
    var n = e.target.dataset.photo;
    if (n != null && e.target.files[0]) {
      readPhoto(e.target.files[0], function (url) { data.items[n].photo = url; markDirty(); render(); });
    }
  });
  panel.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    var d = t.dataset;
    if (d.del != null) { if (confirm("Удалить «" + data.items[d.del].name + "»?")) { data.items.splice(d.del, 1); markDirty(); render(); } }
    else if (d.up != null) { var i = +d.up; data.items.splice(i - 1, 0, data.items.splice(i, 1)[0]); markDirty(); render(); }
    else if (d.nophoto != null) { data.items[d.nophoto].photo = ""; markDirty(); render(); }
    else if (t.hasAttribute("data-additem")) {
      data.items.push({ id: "i" + Date.now(), name: "Новый товар", desc: "", price: 0, emoji: "🍰", photo: "", tag: "" });
      markDirty(); render();
    }
    else if (d.page != null) {
      try { localStorage.setItem(S.KEY + ":page", d.page); } catch (err) {}
      document.getElementById("status").textContent = "Дизайн включён ✓ Сайт обновлён";
      var fr = document.getElementById("frame");
      if (fr && fr.contentWindow) fr.contentWindow.location.reload();
      render();
    }
    else if (d.pal != null) {
      var p = PALETTES[d.pal];
      data.colors = { main: p[0], accent: p[1], bg: p[2], text: p[3] };
      markDirty(); render();
    }
    else if (t.hasAttribute("data-export")) download("data.js", "window.SITE = " + JSON.stringify(data, null, 2) + ";\n", "text/javascript");
    else if (t.hasAttribute("data-exportjson")) download("site-backup.json", JSON.stringify(data, null, 2), "application/json");
    else if (t.hasAttribute("data-reset")) { if (confirm("Вернуть сайт к исходному виду?")) { data = S.reset(); dirty = false; save(); render(); } }
  });
  document.getElementById("tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) { tab = b.dataset.tab; render(); }
  });
  document.getElementById("saveBtn").addEventListener("click", save);
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
})();
