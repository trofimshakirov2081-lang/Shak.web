// Общий движок для демо со своим дизайном: данные из админки, корзина, заказ в WhatsApp.
// Страница описывает только вид: Core.mount(html) после того, как собрала разметку из Core.data.
(function () {
  var S = window.Store, esc = S.esc;
  var data = S.load();
  var x = data.extra || {};
  // Несколько дизайнов одного сайта: владелец выбирает в админке, сайт открывает нужную страницу
  var PAGE = (location.pathname.split("/").pop() || "index.html");
  var PAGES = x.designPages || null;
  if (PAGES) {
    var want = null; try { want = localStorage.getItem(S.KEY + ":page"); } catch (e) {}
    if (want && want !== PAGE && PAGES.indexOf(want) >= 0 && !/[?&]nodesign/.test(location.search)) { location.replace(want); return; }
    var pe = (x.pageExtra || {})[PAGE]; if (pe) { var merged = {}; for (var k0 in x) merged[k0] = x[k0]; for (var k1 in pe) merged[k1] = pe[k1]; x = merged; }
  }
  var sec = data.sections || {};
  var CART_KEY = S.KEY + ":cart";
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "{}"); } catch (e) {}

  // Цвета и шрифты из админки: страница опирается на --main, --accent, --bg, --text, --font-head, --font-body
  (function theme() {
    var c = data.colors, st = document.documentElement.style;
    ["main", "accent", "bg", "text"].forEach(function (k) { if (c[k]) st.setProperty("--" + k, c[k]); });
    // Дополнительные цвета конкретного дизайна из настроек демо (extra.vars)
    var v = x.vars || {};
    for (var k in v) st.setProperty("--" + k, v[k]);
    // Свои шрифты у отдельного дизайна (pageExtra.fonts), иначе общие из админки
    var fonts = x.fonts || data.fonts;
    st.setProperty("--font-head", "'" + fonts.head + "', Georgia, serif");
    st.setProperty("--font-body", "'" + fonts.body + "', system-ui, sans-serif");
    var have = (document.documentElement.getAttribute("data-fonts") || "").split("|");
    [fonts.head, fonts.body].forEach(function (f) {
      if (!f || have.indexOf(f) >= 0) return;
      // У части шрифтов только обычное начертание: запрос с толщиной 700 для них вернул бы ошибку
      var single = /^(Yeseva One|Tenor Sans|Marmelad|Forum|Alice|Prata|Kurale|Russo One|Lobster|Pacifico)$/.test(f);
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(f) + (single ? "" : ":wght@400;700") + "&display=swap";
      document.head.appendChild(l);
    });
  })();

  // Каркас корзины, полоски демо и уведомления. Вид (цвета, скругления, шрифт) страница переопределяет у себя.
  var css = document.createElement("style");
  css.textContent =
    ".c-demo{display:flex;align-items:center;gap:12px;padding:8px 16px;font:13px/1.3 var(--font-body);background:var(--text);color:var(--bg)}" +
    ".c-demo p{margin:0;flex:1}.c-demo a{color:inherit;font-weight:700;white-space:nowrap}.c-demo button{background:none;border:0;color:inherit;font-size:20px;cursor:pointer;padding:0 4px}" +
    "@media(max-width:600px){.c-demo p span{display:none}}" +
    ".c-shade{position:fixed;inset:0;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .25s;z-index:50}" +
    ".c-drawer{position:fixed;top:0;right:0;height:100%;width:min(420px,100%);background:var(--c-surface,var(--bg));color:var(--text);z-index:51;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1);font-family:var(--font-body)}" +
    ".c-open .c-shade{opacity:1;pointer-events:auto}.c-open .c-drawer{transform:none}.c-open{overflow:hidden}" +
    ".c-drawer header{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid color-mix(in srgb,var(--text) 12%,transparent)}" +
    ".c-drawer h3{margin:0;font:400 24px/1.1 var(--font-head)}.c-drawer header button{background:none;border:0;font-size:30px;line-height:1;color:inherit;cursor:pointer}" +
    ".c-list{flex:1;overflow:auto;padding:8px 20px}.c-empty{opacity:.7}" +
    ".c-line{display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid color-mix(in srgb,var(--text) 8%,transparent)}" +
    ".c-line strong{display:block;font-weight:600;line-height:1.25}.c-line span{font-size:14px;opacity:.75}" +
    ".c-thumb{width:52px;height:52px;object-fit:cover;border-radius:var(--c-radius,10px);display:grid;place-items:center;font-size:26px}" +
    ".c-qty{display:flex;align-items:center;gap:8px}.c-qty button{width:30px;height:30px;border-radius:50%;border:1px solid color-mix(in srgb,var(--text) 25%,transparent);background:none;color:inherit;font-size:16px;cursor:pointer}" +
    ".c-foot{padding:16px 20px 22px;display:grid;gap:10px;border-top:1px solid color-mix(in srgb,var(--text) 12%,transparent)}" +
    ".c-total{display:flex;justify-content:space-between;font-size:18px}" +
    ".c-foot input,.c-foot textarea{font:16px var(--font-body);padding:12px 14px;border-radius:var(--c-radius,10px);border:1px solid color-mix(in srgb,var(--text) 20%,transparent);background:transparent;color:inherit;width:100%;box-sizing:border-box}" +
    ".c-send{font:700 16px var(--font-body);padding:15px;border:0;border-radius:var(--c-radius,10px);background:var(--main);color:#fff;cursor:pointer}" +
    ".c-toast{position:fixed;top:16px;left:50%;transform:translate(-50%,-150%);background:var(--text);color:var(--bg);padding:12px 18px;border-radius:12px;font:15px var(--font-body);z-index:60;transition:transform .3s}" +
    ".c-toast.show{transform:translate(-50%,0)}" +
    ":focus-visible{outline:2px solid var(--main);outline-offset:2px}" +
    "@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-delay:0s!important;transition-duration:.01ms!important}}";
  document.head.insertBefore(css, document.head.firstChild);

  function money(n) { return S.money(n, data.currency); }
  function item(id) { return data.items.filter(function (i) { return i.id === id; })[0]; }
  function digits(s) { return String(s || "").replace(/\D/g, ""); }
  function tg(text) { return "https://t.me/" + String(data.contacts.telegram || "").replace(/^@/, "") + (text ? "?text=" + encodeURIComponent(text) : ""); }
  function wa(text) { return "https://wa.me/" + digits(data.contacts.whatsapp) + (text ? "?text=" + encodeURIComponent(text) : ""); }
  function pic(i, cls) {
    return i.photo ? '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + esc(i.photo) + '" alt="' + esc(i.name) + '" loading="lazy">'
      : '<span class="' + (cls || "") + ' noimg" aria-hidden="true">' + esc(i.emoji || "") + "</span>";
  }
  function phone(s) {
    var d = digits(s);
    return d.length === 11 ? "+" + d[0] + " " + d.slice(1, 4) + " " + d.slice(4, 7) + "-" + d.slice(7, 9) + "-" + d.slice(9) : "+" + d;
  }
  function count() { var n = 0; for (var k in cart) n += cart[k]; return n; }

  // Контакты списком [подпись, значение, ссылка]
  function contacts() {
    var c = data.contacts, out = [];
    if (c.address) out.push(["Адрес", (data.brand.city ? data.brand.city + ", " : "") + c.address, ""]);
    if (c.phone) out.push(["Телефон", c.phone, "tel:" + c.phone.replace(/[^\d+]/g, "")]);
    if (c.whatsapp) out.push(["WhatsApp", phone(c.whatsapp), wa()]);
    if (x.vk) out.push(["ВКонтакте", x.vk.replace(/^https?:\/\//, ""), (/^https?:/.test(x.vk) ? "" : "https://") + x.vk]);
    if (c.telegram) out.push(["Telegram", "@" + c.telegram.replace(/^@/, ""), "https://t.me/" + c.telegram.replace(/^@/, "")]);
    if (c.instagram) out.push(["Instagram", "@" + c.instagram.replace(/^@/, ""), "https://instagram.com/" + c.instagram.replace(/^@/, "")]);
    if (c.hours) out.push(["Часы работы", c.hours, ""]);
    return out;
  }

  function demoBar() {
    if (!(data.demo && data.demo.banner)) return "";
    return '<div class="c-demo" data-demo><p>Демо от <b>shak.web</b><span>. Цены, тексты и фото владелец меняет сам</span></p>' +
      (PAGES ? '<button class="c-dsw" data-next-design>Дизайн ' + (PAGES.indexOf(PAGE) + 1) + '/' + PAGES.length + '</button>' : '') +
      '<a href="admin.html">Открыть админку</a><button data-hide-demo aria-label="Скрыть">×</button></div>';
  }

  function drawer() {
    return '<div class="c-shade" data-close-cart></div><aside class="c-drawer" aria-label="' + esc(sec.orderTitle || "Ваш заказ") + '">' +
      '<header><h3>' + esc(sec.orderTitle || "Ваш заказ") + '</h3><button data-close-cart aria-label="Закрыть">×</button></header>' +
      '<div class="c-list" data-list></div><div class="c-foot"><div class="c-total"><span>Итого</span><b data-total></b></div>' +
      '<input data-name placeholder="Ваше имя" autocomplete="name"><input data-phone placeholder="Телефон" inputmode="tel" autocomplete="tel">' +
      '<textarea data-comment rows="2" placeholder="' + esc(x.commentHint || "Комментарий: дата и время") + '"></textarea>' +
      '<button class="c-send" data-order>' + esc(x.sendLabel || "Отправить заказ в WhatsApp") + '</button></div></aside><div class="c-toast" data-toast role="status"></div>';
  }

  function update() {
    for (var k in cart) if (!item(k) || cart[k] <= 0) delete cart[k];
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    var total = 0, rows = [];
    for (var id in cart) {
      var i = item(id); total += i.price * cart[id];
      rows.push('<div class="c-line">' + pic(i, "c-thumb") + '<div><strong>' + esc(i.name) + '</strong><span>' + money(i.price * cart[id]) + '</span></div>' +
        '<div class="c-qty"><button data-dec="' + esc(id) + '" aria-label="Меньше">−</button><b>' + cart[id] + '</b><button data-inc="' + esc(id) + '" aria-label="Больше">+</button></div></div>');
    }
    var n = count();
    [].forEach.call(document.querySelectorAll("[data-count]"), function (el) { el.textContent = n; el.classList.toggle("has", n > 0); });
    var l = document.querySelector("[data-list]");
    if (l) l.innerHTML = rows.join("") || '<p class="c-empty">' + esc(x.emptyText || "Пока пусто. Выберите позицию в каталоге.") + '</p>';
    var t = document.querySelector("[data-total]");
    if (t) t.textContent = money(total);
  }

  function orderText() {
    var lines = [x.orderIntro || "Здравствуйте! Хочу заказать:"], total = 0;
    for (var id in cart) { var i = item(id); total += i.price * cart[id]; lines.push("• " + i.name + (cart[id] > 1 ? " × " + cart[id] : "") + " = " + money(i.price * cart[id])); }
    lines.push("Итого: " + money(total));
    var q = function (s) { var el = document.querySelector(s); return el ? el.value.trim() : ""; };
    if (q("[data-name]")) lines.push("Имя: " + q("[data-name]"));
    if (q("[data-phone]")) lines.push("Телефон: " + q("[data-phone]"));
    if (q("[data-comment]")) lines.push("Комментарий: " + q("[data-comment]"));
    return lines.join("\n");
  }

  function toast(t) {
    var el = document.querySelector("[data-toast]");
    el.textContent = t; el.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  function open(on) {
    document.body.classList.toggle("c-open", on);
    if (on) { var b = document.querySelector(".c-drawer [data-close-cart]"); if (b) b.focus(); }
  }

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") open(false); });
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-close-cart]");
    if (!t) return;
    var ds = t.dataset;
    if (ds.add) {
      cart[ds.add] = (cart[ds.add] || 0) + 1; update();
      if (!t.dataset.label) t.dataset.label = t.innerHTML;
      t.classList.add("done"); t.textContent = x.addedLabel || "Добавлено";
      clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("done"); t.innerHTML = t.dataset.label; }, 1300);
      document.dispatchEvent(new CustomEvent("core:add", { detail: { id: ds.add, el: t } }));
    } else if (ds.inc) { cart[ds.inc]++; update(); }
    else if (ds.dec) { cart[ds.dec]--; update(); }
    else if (t.hasAttribute("data-open-cart")) open(true);
    else if (t.hasAttribute("data-close-cart")) open(false);
    else if (t.hasAttribute("data-hide-demo")) document.querySelector("[data-demo]").remove();
    else if (t.hasAttribute("data-next-design")) { var nx = PAGES[(PAGES.indexOf(PAGE) + 1) % PAGES.length]; try { localStorage.setItem(S.KEY + ":page", nx); } catch (e) {} location.href = nx; }
    else if (t.hasAttribute("data-order")) {
      if (!count()) { toast(x.emptyToast || "Сначала выберите позицию"); return; }
      if (x.orderTo === "telegram" && data.contacts.telegram) {
        // В Telegram текст подставляется в чат по ссылке, а на всякий случай ещё и копируется
        var txt = orderText();
        try { navigator.clipboard.writeText(txt); } catch (e) {}
        window.open(tg(txt), "_blank");
      } else window.open(wa(orderText()), "_blank");
    }
  });

  // Заставка при первом входе: знак бренда рисуется линией, потом шторка уходит вверх
  function splash() {
    var seen = null; try { seen = localStorage.getItem(S.KEY + ":seen"); localStorage.setItem(S.KEY + ":seen", "1"); } catch (e) {}
    if (seen || x.splash === false || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    var name = data.brand.name, ch = esc(name.trim().charAt(0).toUpperCase());
    // Буквы собраны по словам: длинное название переносится между словами, а не рвётся и не вылезает за экран
    var k = 0;
    var letters = name.trim().split(/\s+/).map(function (w) {
      return '<i>' + w.split("").map(function (l) { return '<span style="animation-delay:' + (0.55 + (k++) * 0.035).toFixed(3) + 's">' + esc(l) + '</span>'; }).join("") + '</i>';
    }).join(" ");
    var el = document.createElement("div"); el.className = "c-splash"; el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<div class="c-sp-in"><svg viewBox="0 0 120 120"><circle class="c-sp-ring" cx="60" cy="60" r="52"/><circle class="c-sp-dot" cx="60" cy="8" r="4"/></svg><b>' + ch + '</b></div><div class="c-sp-name">' + letters + '</div>' +
      (data.brand.tagline ? '<div class="c-sp-tag">' + esc(data.brand.tagline) + '</div>' : '');
    document.body.appendChild(el);
    el.addEventListener("animationend", function (e) { if (e.target === el) el.remove(); });
    el.addEventListener("click", function () { el.remove(); });
    // Анимации первого экрана ждут, пока уходит заставка, иначе они отыграют под ней
    if (document.getAnimations) document.getAnimations().forEach(function (a) { var tg = a.effect && a.effect.target; if (tg && !el.contains(tg)) a.currentTime = (a.currentTime || 0) - 1800; });
  }
  var spCss = document.createElement("style");
  spCss.textContent =
    ".c-splash{position:fixed;inset:0;z-index:100;background:var(--sp-bg,var(--bg));color:var(--sp-fg,var(--text));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:var(--font-head);animation:c-sp-out .8s 1.75s cubic-bezier(.7,0,.2,1) forwards}" +
    ".c-sp-in{position:relative;width:112px;height:112px;display:grid;place-items:center}.c-sp-in svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}" +
    ".c-sp-ring{fill:none;stroke:var(--main);stroke-width:3;stroke-linecap:round;stroke-dasharray:327;stroke-dashoffset:327;animation:c-sp-draw 1.05s cubic-bezier(.6,.05,.25,1) forwards}" +
    ".c-sp-dot{fill:var(--main);transform-origin:60px 60px;animation:c-sp-orbit 1.05s cubic-bezier(.6,.05,.25,1) forwards}" +
    ".c-sp-in b{font:700 48px/1 var(--font-head);color:var(--main);opacity:0;transform:scale(.6);animation:c-sp-pop .5s .8s cubic-bezier(.3,1.6,.5,1) forwards}" +
    ".c-sp-name{font:600 26px/1.15 var(--font-head);letter-spacing:.01em;padding:2px 0;max-width:calc(100% - 48px);text-align:center;overflow-wrap:normal}.c-sp-name i{font-style:normal;display:inline-block;white-space:nowrap;overflow:hidden;vertical-align:top}.c-sp-name span{display:inline-block;transform:translateY(110%);animation:c-sp-up .6s cubic-bezier(.2,.8,.2,1) forwards}" +
    ".c-sp-tag{font:400 14px/1.3 var(--font-body);opacity:0;animation:c-sp-fade .5s 1.05s forwards}" +
    "@keyframes c-sp-draw{to{stroke-dashoffset:0}}@keyframes c-sp-orbit{to{transform:rotate(360deg)}}@keyframes c-sp-pop{to{opacity:1;transform:none}}@keyframes c-sp-up{to{transform:none}}@keyframes c-sp-fade{to{opacity:.6}}" +
    "@keyframes c-sp-out{from{clip-path:inset(0 0 0 0)}99%{visibility:visible}to{clip-path:inset(0 0 100% 0);visibility:hidden}}" +
    ".c-dsw{background:none;border:1px solid currentColor;border-radius:999px;color:inherit;font:600 12px var(--font-body);padding:4px 10px;cursor:pointer;white-space:nowrap}";
  document.head.appendChild(spCss);

  window.Core = {
    data: data, x: x, esc: esc, money: money, item: item, pic: pic, wa: wa, tg: tg, contacts: contacts, toast: toast,
    mount: function (html) {
      document.title = data.brand.name + (data.brand.tagline ? " | " + data.brand.tagline : "");
      document.getElementById("app").innerHTML = demoBar() + html + drawer();
      splash();
      update();
      document.documentElement.classList.add("ready");
      // Плавное появление: только для блоков с data-reveal
      var els = document.querySelectorAll("[data-reveal]");
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
        }, { rootMargin: "0px 0px -10% 0px" });
        [].forEach.call(els, function (el) { io.observe(el); });
      } else [].forEach.call(els, function (el) { el.classList.add("in"); });
    }
  };
})();
