// Бриф «Соберите свой сайт за 10 минут».
// Все варианты, цены и бюджеты лежат в config.js.
(function () {
  var C = window.BRIEF;
  var KEY = "shakweb:brief:v2";
  var STEPS = ["intro", "niche", "style", "colors", "fonts", "features", "budget", "contact", "result"];
  var SHORT_LIST = { colors: 9, fonts: 8 };


  var st = {
    step: 0, niche: "", name: "", city: "",
    likes: {}, swipe: 0,
    palette: -1, allPal: false,
    font: -1, allFonts: false,
    features: null,
    budget: "", cur: "rub",
    person: "", contact: "", comment: "",
    sent: false
  };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  // Откуда пришёл клиент: ссылка вида brief/?from=ikea (метка ролика) попадает в ТЗ
  var from = (location.search.match(/[?&]from=([\w\-]{1,40})/) || [])[1];
  if (from) st.from = from;

  var app = document.getElementById("app");

  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function niche() { return C.niches.filter(function (n) { return n.id === st.niche; })[0] || C.niches[C.niches.length - 1]; }
  function bizName() { return st.name.trim() || "Ваш бизнес"; }

  // Сначала варианты для выбранной сферы, потом остальные
  function sorted(list) {
    var mine = [], rest = [];
    list.forEach(function (x, i) { (x.t && x.t.indexOf(st.niche) >= 0 ? mine : rest).push(i); });
    return mine.concat(rest);
  }

  var loadedFonts = {};
  function loadFonts(pairs) {
    var fams = [];
    pairs.forEach(function (p) {
      [p.h, p.b].forEach(function (f) {
        if (loadedFonts[f]) return;
        loadedFonts[f] = 1;
        fams.push("family=" + f.replace(/ /g, "+") + (p.one && p.one.indexOf(f) >= 0 ? "" : ":wght@400;700"));
      });
    });
    if (!fams.length) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?" + fams.join("&") + "&display=swap";
    document.head.appendChild(l);
  }

  function likedStyles() { return C.styles.filter(function (s) { return st.likes[s.id] === true; }); }
  function mainStyle() { return likedStyles()[0] || C.styles[0]; }
  function pal() { return C.palettes[st.palette] || C.palettes[sorted(C.palettes)[0]]; }
  function fontPair() { return C.fonts[st.font] || C.fonts[sorted(C.fonts)[0]]; }

  // Мини-макет сайта в выбранном стиле
  function mock(style, p, f, extra) {
    var n = niche(), c = p.c;
    var vars = "--m:" + c[0] + ";--a:" + c[1] + ";--b:" + c[2] + ";--t:" + c[3] + ";--fh:'" + f.h + "';--fb:'" + f.b + "'";
    var cards = n.items.map(function (e, i) {
      return '<div class="m-card"><div class="m-pic">' + e + '</div><div class="m-line"></div><b>' + (i + 1) * 9 + '00</b></div>';
    }).join("");
    return '<div class="mock s-' + style.id + (extra ? " " + extra : "") + '" style="' + vars + '" aria-hidden="true">' +
      '<div class="m-nav"><span class="m-logo">' + esc(bizName()) + '</span><span class="m-dots"><i></i><i></i><i></i></span></div>' +
      '<div class="m-hero"><div class="m-title">' + esc(bizName()) + '</div><div class="m-sub">' + esc(n.name) + (st.city ? " · " + esc(st.city) : "") + '</div><span class="m-btn">Заказать</span>' +
      '<div class="m-art">' + n.items[0] + '</div><span class="m-sticker">Хит!</span></div>' +
      '<div class="m-grid">' + cards + '</div></div>';
  }

  // Контакт: телефон, @ник или ссылка
  function checkContact(v) {
    var s = v.trim();
    if (!s) return { ok: false, msg: "Напишите, как с вами связаться" };
    var digits = s.replace(/[\s()\-]/g, "");
    if (/^\+?\d{10,15}$/.test(digits)) {
      if (/^(\+7|8|7)\d{10}$/.test(digits) || /^\+\d{10,15}$/.test(digits)) return { ok: true, type: "Телефон" };
      return { ok: false, msg: "Похоже на телефон, но цифр не хватает. Пример: +7 700 123 45 67" };
    }
    if (/^@[A-Za-z0-9_.]{3,32}$/.test(s)) return { ok: true, type: "Ник" };
    if (/^@/.test(s)) return { ok: false, msg: "Ник пишется латиницей, от 3 символов: @shak.web" };
    if (/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me|instagram\.com|wa\.me|vk\.com)\/[A-Za-z0-9_.+]{2,}\/?(\?.*)?$/i.test(s)) return { ok: true, type: "Ссылка" };
    if (/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(s)) return { ok: true, type: "Ссылка" };
    return { ok: false, msg: "Напишите телефон (+7 700 123 45 67), ник (@shak.web) или ссылку (t.me/ваш_ник)" };
  }

  function money(rub) {
    var cur = C.currency[st.cur];
    var v = Math.round(rub * cur.rate / 100) * 100;
    return v.toLocaleString("ru-RU") + " " + cur.sign;
  }

  function estimate() {
    var picked = st.features || [];
    var chosen = C.features.filter(function (f) { return picked.indexOf(f.id) >= 0; });
    var dev = C.base.price, days = C.base.days;
    chosen.forEach(function (f) { dev += f.price || 0; days += f.days; });
    var full = dev + C.base.setup, price = full - C.discount.price;
    var pkg = C.packages.filter(function (p) { return full <= p.upTo; })[0];
    var extras = chosen.filter(function (f) { return f.price !== 0; });
    return { chosen: chosen, extras: extras, dev: dev, full: full, min: price, days: days, daysMax: days + Math.ceil(days * 0.3), pkg: pkg };
  }

  function budgetNote(e) {
    var b = C.budgets.filter(function (x) { return x.id === st.budget; })[0];
    if (!b || b.max === null) return "Посоветую: начните с пакета «" + e.pkg.name + "», а доплатные функции добавим, когда пойдут заказы.";
    if (e.min <= b.max) return "Укладываемся в ваш бюджет 👍";
    return "Выбранные функции выше бюджета. Предложим, с чего начать сейчас, а остальное добавим позже: сайт с админкой можно наращивать постепенно.";
  }

  // ---------- Шаги ----------
  var V = {};

  V.intro = function () {
    loadFonts([C.fonts[0], C.fonts[9]]);
    return '<section class="hero-step">' +
      '<span class="pill">Бесплатно · 10 минут · ни к чему не обязывает</span>' +
      '<h1>Соберите свой сайт сами</h1>' +
      '<p class="lead">Листайте стили, выбирайте цвета и шрифты. В конце получите черновик сайта, мини-брендбук, готовое ТЗ и примерную стоимость.</p>' +
      '<div class="intro-art">' + mock(C.styles[0], C.palettes[1], C.fonts[0]) + mock(C.styles[3], C.palettes[10], C.fonts[9], "tilt") + '</div>' +
      '<button class="btn big" data-next>Начать →</button>' +
      '<p class="muted small">Можно просто поиграть. Ответы сохраняются в браузере.</p></section>';
  };

  V.niche = function () {
    return '<h2>Чем вы занимаетесь?</h2><p class="lead">От этого зависят подсказки по цветам, шрифтам и функциям.</p>' +
      '<div class="chips">' + C.niches.map(function (n) {
        return '<button class="chip' + (st.niche === n.id ? " on" : "") + '" data-niche="' + n.id + '"><span>' + n.emoji + '</span>' + esc(n.name) + '</button>';
      }).join("") + '</div>' +
      '<label class="field">Как называется ваш бизнес?<input id="name" value="' + esc(st.name) + '" placeholder="Например, Булочная Тани" maxlength="40" autocomplete="organization"></label>' +
      '<label class="field">Город <span class="muted">(необязательно)</span><input id="city" value="' + esc(st.city) + '" placeholder="Москва" maxlength="30"></label>' +
      '<p class="err" id="err" hidden></p>';
  };

  V.style = function () {
    if (st.swipe >= C.styles.length) {
      var liked = likedStyles();
      return '<h2>' + (liked.length ? "Вам понравилось" : "Ничего не зацепило?") + '</h2>' +
        (liked.length ? '<div class="chips">' + liked.map(function (s) { return '<span class="chip on">' + esc(s.name) + '</span>'; }).join("") + '</div><p class="lead">Возьмём за основу «' + esc(liked[0].name) + '». Дальше подберём цвета.</p>'
          : '<p class="lead">Не страшно: начнём с современного стиля, а на созвоне покажем больше вариантов.</p>') +
        '<button class="btn ghost" data-reswipe>Пролистать ещё раз</button>';
    }
    var s = C.styles[st.swipe];
    var p = C.palettes[[1, 5, 14, 28, 0, 25][st.swipe % 6]];
    var f = C.fonts[[9, 0, 1, 10, 2, 13][st.swipe % 6]];
    loadFonts([f]);
    return '<h2>Какой стиль вам ближе?</h2><p class="lead">Листайте как в Tinder: вправо нравится, влево нет. ' + (st.swipe + 1) + ' из ' + C.styles.length + '.</p>' +
      '<div class="deck"><div class="swipe" id="swipe">' + mock(s, p, f) + '<div class="swipe-cap"><b>' + esc(s.name) + '</b><span>' + esc(s.text) + '</span></div>' +
      '<span class="stamp yes">Нравится</span><span class="stamp no">Не моё</span></div></div>' +
      '<div class="vote"><button class="round no" data-vote="no" aria-label="Не нравится">👎</button><button class="round yes" data-vote="yes" aria-label="Нравится">👍</button></div>';
  };

  V.colors = function () {
    var order = sorted(C.palettes);
    var shown = st.allPal ? order : order.slice(0, SHORT_LIST.colors);
    if (st.palette >= 0 && shown.indexOf(st.palette) < 0) shown.push(st.palette);
    return '<h2>Выберите цвета</h2><p class="lead">Первыми идут палитры, которые чаще выбирают для сферы «' + esc(niche().name) + '».</p>' +
      '<div class="pals">' + shown.map(function (i) {
        var p = C.palettes[i];
        return '<button class="pal' + (st.palette === i ? " on" : "") + '" data-pal="' + i + '" style="--m:' + p.c[0] + ';--a:' + p.c[1] + ';--b:' + p.c[2] + ';--t:' + p.c[3] + '">' +
          '<span class="pal-prev"><b>' + esc(bizName()) + '</b><i>Заказать</i></span>' +
          '<span class="sw">' + p.c.map(function (x) { return '<i style="background:' + x + '"></i>'; }).join("") + '</span><span class="pal-n">' + esc(p.n) + '</span></button>';
      }).join("") + '</div>' +
      (st.allPal ? '' : '<button class="btn ghost more" data-allpal>Показать ещё ' + (order.length - SHORT_LIST.colors) + '</button>');
  };

  V.fonts = function () {
    var order = sorted(C.fonts);
    var shown = st.allFonts ? order : order.slice(0, SHORT_LIST.fonts);
    if (st.font >= 0 && shown.indexOf(st.font) < 0) shown.push(st.font);
    loadFonts(shown.map(function (i) { return C.fonts[i]; }));
    var p = pal().c;
    return '<h2>Выберите шрифт</h2><p class="lead">Смотрите на своём названии. Первыми идут шрифты для вашей сферы.</p>' +
      '<div class="fonts">' + shown.map(function (i) {
        var f = C.fonts[i];
        return '<button class="font' + (st.font === i ? " on" : "") + '" data-font="' + i + '" style="--m:' + p[0] + ';--b:' + p[2] + ';--t:' + p[3] + '">' +
          '<span class="f-h" style="font-family:\'' + f.h + '\'">' + esc(bizName()) + '</span>' +
          '<span class="f-b" style="font-family:\'' + f.b + '\'">Свежие новинки каждую неделю. Закажите онлайн.</span>' +
          '<span class="f-n">' + esc(f.n) + ' · ' + esc(f.h) + (f.h !== f.b ? ' + ' + esc(f.b) : '') + '</span></button>';
      }).join("") + '</div>' +
      (st.allFonts ? '' : '<button class="btn ghost more" data-allfonts>Показать ещё ' + (order.length - SHORT_LIST.fonts) + '</button>');
  };

  V.features = function () {
    if (!st.features) {
      st.features = C.features.filter(function (f) { return f.t && f.t.indexOf(st.niche) >= 0; }).map(function (f) { return f.id; });
    }
    return '<h2>Что должен уметь сайт?</h2><p class="lead">Отметили популярное для вашей сферы. «В пакете» уже входит в цену, остальное обсудим отдельно.</p>' +
      '<div class="feat always"><span class="ic">⚙️</span><span><b>Админка</b><small>Входит всегда: цены, тексты и фото вы меняете сами, без программиста</small></span><span class="tick">✓</span></div>' +
      '<div class="feats">' + C.features.map(function (f) {
        var on = st.features.indexOf(f.id) >= 0;
        return '<button class="feat' + (on ? " on" : "") + '" data-feat="' + f.id + '" aria-pressed="' + on + '"><span class="ic">' + f.icon + '</span><span><b>' + esc(f.title) + '</b><small>' + (f.price === 0 ? "В пакете" : f.price ? "+ " + money(f.price) : "По договорённости") + '</small></span><span class="tick">' + (on ? "✓" : "+") + '</span></button>';
      }).join("") + '</div>';
  };

  V.budget = function () {
    var sign = C.currency[st.cur].sign, curs = Object.keys(C.currency);
    return '<h2>Какой бюджет комфортен?</h2><p class="lead">Это поможет предложить реальный вариант, а не самый дорогой.</p>' +
      (curs.length > 1 ? '<div class="seg" role="group" aria-label="Валюта">' + curs.map(function (k) {
        return '<button class="' + (st.cur === k ? "on" : "") + '" data-cur="' + k + '">' + C.currency[k].sign + '</button>';
      }).join("") + '</div>' : '') +
      '<div class="budgets">' + C.budgets.map(function (b) {
        var label = b.max === null ? b.label : budgetLabel(b) + " " + sign;
        return '<button class="budget' + (st.budget === b.id ? " on" : "") + '" data-budget="' + b.id + '">' + (b.max === null ? "🤔 " : "") + esc(label) + '</button>';
      }).join("") + '</div><p class="err" id="err" hidden></p>';
  };

  function budgetLabel(b) {
    var r = C.currency[st.cur].rate;
    return b.label.replace(/\d[\d ]*/g, function (m) { return (Number(m.replace(/\s/g, "")) * r).toLocaleString("ru-RU") + " "; }).replace(/ +/g, " ").trim();
  }

  V.contact = function () {
    var c = st.contact ? checkContact(st.contact) : null;
    return '<h2>Куда прислать результат?</h2><p class="lead">Черновик, брендбук и ТЗ вы увидите сразу на следующем экране. Контакт нужен, чтобы ответить на вопросы и прислать идеи.</p>' +
      '<label class="field">Как к вам обращаться?<input id="person" value="' + esc(st.person) + '" placeholder="Имя" autocomplete="given-name" maxlength="40"></label>' +
      '<label class="field">Телефон, @ник или ссылка<input id="contact" value="' + esc(st.contact) + '" placeholder="+7 700 123 45 67 или @ваш_ник" autocomplete="tel" maxlength="80"></label>' +
      '<p class="hint" id="hint">' + (c ? (c.ok ? "✓ " + c.type : "") : "") + '</p><p class="err" id="err" hidden></p>' +
      '<label class="field">Пожелания <span class="muted">(необязательно)</span><textarea id="comment" rows="3" maxlength="500" placeholder="Например: нужен к открытию 1 декабря">' + esc(st.comment) + '</textarea></label>';
  };

  function tzText(e) {
    var p = pal(), f = fontPair(), liked = likedStyles(), disliked = C.styles.filter(function (s) { return st.likes[s.id] === false; });
    var b = C.budgets.filter(function (x) { return x.id === st.budget; })[0];
    return [
      "ТЗ на сайт: " + bizName(),
      "Сфера: " + niche().name,
      st.city ? "Город: " + st.city : "",
      "Стиль: " + mainStyle().name + (liked.length > 1 ? " (ещё понравились: " + liked.slice(1).map(function (s) { return s.name; }).join(", ") + ")" : ""),
      disliked.length ? "Не нравится: " + disliked.map(function (s) { return s.name; }).join(", ") : "",
      "Цвета «" + p.n + "»: основной " + p.c[0] + ", акцент " + p.c[1] + ", фон " + p.c[2] + ", текст " + p.c[3],
      "Шрифты: заголовки " + f.h + ", текст " + f.b,
      "Функции: админка" + (e.chosen.length ? ", " + e.chosen.map(function (x) { return x.title.charAt(0).toLowerCase() + x.title.slice(1); }).join(", ") : ""),
      "Пакет: " + e.pkg.name + (e.extras.length ? " + обсудить отдельно: " + e.extras.map(function (x) { return x.title.charAt(0).toLowerCase() + x.title.slice(1) + (x.price ? " " + money(x.price) : " (по договорённости)"); }).join(", ") : ""),
      "Бюджет: " + (b ? (b.max === null ? b.label : budgetLabel(b) + " " + C.currency[st.cur].sign) : "не указан"),
      "Ориентир: " + money(e.min) + " (разработка " + money(e.dev) + " + настройка " + money(C.base.setup) + " - " + C.discount.title + " " + money(C.discount.price) + "), " + e.days + "-" + e.daysMax + " рабочих дней",
      "Контакт: " + (st.person ? st.person + ", " : "") + st.contact,
      st.from ? "Откуда: " + st.from : "",
      st.comment ? "Пожелания: " + st.comment : ""
    ].filter(Boolean).join("\n");
  }

  V.result = function () {
    var e = estimate(), p = pal(), f = fontPair(), s = mainStyle();
    loadFonts([f]);
    var roles = ["Основной", "Акцент", "Фон", "Текст"];
    return '<section class="result">' +
      '<span class="pill">Готово' + (st.person ? ", " + esc(st.person) : "") + ' 🎉</span>' +
      '<h2>Черновик сайта «' + esc(bizName()) + '»</h2>' +
      '<div class="draft">' + mock(s, p, f, "big") + '</div>' +
      '<div class="estimate"><div><small>Пакет</small><b>' + esc(e.pkg.name) + '</b></div><div><small>Примерная стоимость</small><b>' + money(e.min) + '</b> <s class="old">' + money(e.full) + '</s></div><div><small>Срок</small><b>' + e.days + '-' + e.daysMax + ' рабочих дней</b></div>' +
        '<p>' + esc(budgetNote(e)) + '</p><p class="muted small">Разработка ' + money(e.dev) + ' + запуск и настройка ' + money(C.base.setup) + ', минус ' + money(C.discount.price) + ': ' + esc(C.discount.title) + '. Это ориентир, точную цену назову после короткого разговора.</p>' +
        '<p class="small">Есть свой полный брендбук и ТЗ с дизайном? Тогда скидка ' + money(C.discountFull.price) + ' вместо ' + money(C.discount.price) + '. <button class="link light" data-info>Что значит «полный»</button></p></div>' +
      '<h3>Мини-брендбук</h3>' +
      '<div class="book"><div class="book-colors">' + p.c.map(function (x, i) {
        return '<button class="swatch" data-copy="' + x + '" style="--c:' + x + '"><i></i><b>' + roles[i] + '</b><span>' + x + '</span></button>';
      }).join("") + '</div>' +
      '<div class="book-fonts" style="--t:' + p.c[3] + '"><div><small>Заголовки</small><span style="font-family:\'' + f.h + '\';font-size:30px">' + esc(f.h) + '</span><span style="font-family:\'' + f.h + '\'">Аа Бб Вв 123</span></div>' +
        '<div><small>Текст</small><span style="font-family:\'' + f.b + '\';font-size:22px">' + esc(f.b) + '</span><span style="font-family:\'' + f.b + '\'">Аа Бб Вв 123</span></div></div>' +
      '<div class="book-style"><small>Стиль</small><b>' + esc(s.name) + '</b><span>' + esc(s.words) + '</span></div></div>' +
      '<h3>Техническое задание</h3><pre class="tz" id="tz">' + esc(tzText(e)) + '</pre>' +
      '<div class="send">' +
        '<button class="btn big" data-send="tg">Отправить в Telegram</button>' +
        '<button class="btn ghost" data-send="ig">Отправить в Instagram</button>' +
        '<button class="btn ghost" data-pdf>Скачать PDF</button>' +
      '</div><p class="hint center" id="sendHint">' + (st.sent ? "✓ Отправлено. Ответ придёт в течение дня." : "") + '</p>' +
      '<div class="after"><a href="../demos/">Посмотреть живые демо-сайты</a><button class="link" data-edit>Изменить ответы</button><button class="link" data-restart>Начать заново</button></div>' +
      infoBlock() +
      '</section>';
  };

  // Скрытый раздел в конце итога: цены, скидки, что значит полный брендбук и ТЗ
  function infoBlock() {
    var full = C.base.price + C.base.setup;
    var nego = C.features.filter(function (f) { return f.price === null; }).map(function (f) { return "<li>" + esc(f.title) + "</li>"; }).join("");
    return '<details class="info" id="info"><summary>Цены, скидки и что значит «полное ТЗ и брендбук»</summary>' +
      '<h4>Цена</h4><ul>' +
        '<li>Сайт под ключ: <b>' + money(full) + '</b> (разработка ' + money(C.base.price) + ' + запуск и настройка ' + money(C.base.setup) + ')</li>' +
        '<li>Прошли этот бриф до конца: <b>' + money(full - C.discount.price) + '</b> (скидка ' + money(C.discount.price) + ')</li>' +
        '<li>Есть полный брендбук и ТЗ с дизайном: <b>' + money(full - C.discountFull.price) + '</b> (скидка ' + money(C.discountFull.price) + ')</li>' +
      '</ul><p class="muted small">Скидки не складываются. Срок 7-10 рабочих дней с момента, когда есть материалы, доступы и предоплата 50%.</p>' +
      '<h4>Что входит</h4><ul>' +
        '<li>Дизайн под ваш бренд, тексты, версия для телефона</li>' +
        '<li>Каталог или прайс, заказ или запись, заявки в Telegram, отзывы, галерея, вопросы, контакты с картой</li>' +
        '<li>Админка: цены, тексты и фото меняете сами</li>' +
        '<li>Запуск на вашем хостинге: база данных, домен, https, Telegram-бот</li>' +
        '<li>Яндекс Метрика, Вебмастер, Google, карточки на картах</li>' +
        '<li>2 круга правок, обучение админке, 14 дней поддержки</li>' +
      '</ul>' +
      '<h4>Полный брендбук</h4><ul>' +
        '<li>Логотип в векторе (SVG, PDF или AI) для светлого и тёмного фона</li>' +
        '<li>Минимум 3 цвета с кодами HEX или RGB, понятно, какой основной</li>' +
        '<li>Шрифты с кириллицей для заголовков и текста</li>' +
        '<li>Готовые фото от 1500 px или 3-5 примеров стиля</li>' +
      '</ul><h4>Полное ТЗ</h4><ul>' +
        '<li>Список блоков сайта по порядку</li>' +
        '<li>Все тексты готовы, без «потом допишем»</li>' +
        '<li>Товары или услуги таблицей: название, цена, описание, фото</li>' +
        '<li>Контакты, адрес, часы работы, соцсети</li>' +
        '<li>Какие функции нужны и куда приходят заявки</li>' +
      '</ul><h4>Дизайн</h4><ul>' +
        '<li>Макет в Figma или схема главной страницы для телефона</li>' +
        '<li>2-3 сайта-примера с пояснением, что нравится</li>' +
      '</ul><p class="muted small">Если чего-то не хватает, действует скидка за бриф.</p>' +
      '<h4>По договорённости</h4><ul>' + nego + '<li>Правки сверх двух кругов и поддержка после 14 дней</li></ul>' +
      '<h4>Оплачиваете напрямую</h4><ul><li>Хостинг с базой данных (обычно несколько сотен рублей в месяц)</li><li>Домен (обычно до 1 000 ₽ в год)</li></ul>' +
      '</details>';
  }

  // ---------- Отрисовка и навигация ----------
  function render() {
    var name = STEPS[st.step];
    var body = V[name]();
    var nav = "";
    if (name !== "intro" && name !== "result") {
      var canNext = name !== "style" || st.swipe >= C.styles.length;
      nav = '<nav class="nav"><button class="btn ghost" data-back>← Назад</button>' +
        (canNext ? '<button class="btn" data-next>' + (name === "contact" ? "Получить результат" : "Дальше →") + '</button>' : '<button class="btn ghost" data-skip>Пропустить</button>') + '</nav>';
    }
    app.className = "app step-" + name;
    app.innerHTML = '<div class="screen">' + body + '</div>' + nav;
    var total = STEPS.length - 2;
    document.getElementById("bar").style.width = Math.min(100, Math.max(0, st.step - 0) / (total + 1) * 100) + "%";
    document.getElementById("stepN").textContent = st.step > 0 && st.step <= total ? st.step + "/" + total : "";
    if (name === "style") bindSwipe();
    save();
  }

  function go(d) {
    st.step = Math.max(0, Math.min(STEPS.length - 1, st.step + d));
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showErr(t) { var e = document.getElementById("err"); if (e) { e.textContent = t; e.hidden = false; } }

  function validate() {
    var name = STEPS[st.step];
    if (name === "niche") {
      st.name = document.getElementById("name").value.trim();
      st.city = document.getElementById("city").value.trim();
      if (!st.niche) return showErr("Выберите сферу, это займёт секунду"), false;
      if (!st.name) return showErr("Напишите название, на нём покажем шрифты и макет"), false;
    }
    if (name === "colors" && st.palette < 0) st.palette = sorted(C.palettes)[0];
    if (name === "fonts" && st.font < 0) st.font = sorted(C.fonts)[0];
    if (name === "budget" && !st.budget) return showErr("Выберите вариант или «Не знаю, посоветуйте»"), false;
    if (name === "contact") {
      st.person = document.getElementById("person").value.trim();
      st.contact = document.getElementById("contact").value.trim();
      st.comment = document.getElementById("comment").value.trim();
      var c = checkContact(st.contact);
      if (!c.ok) { showErr(c.msg); document.getElementById("contact").focus(); return false; }
    }
    return true;
  }

  function vote(yes) {
    st.likes[C.styles[st.swipe].id] = yes;
    var card = document.getElementById("swipe");
    if (card) {
      card.classList.add(yes ? "out-yes" : "out-no");
      setTimeout(function () { st.swipe++; render(); }, 260);
    } else { st.swipe++; render(); }
  }

  function bindSwipe() {
    var card = document.getElementById("swipe");
    if (!card) return;
    var x0 = null, dx = 0;
    card.addEventListener("pointerdown", function (e) { x0 = e.clientX; card.setPointerCapture(e.pointerId); card.style.transition = "none"; });
    card.addEventListener("pointermove", function (e) {
      if (x0 === null) return;
      dx = e.clientX - x0;
      card.style.transform = "translateX(" + dx + "px) rotate(" + dx / 18 + "deg)";
      card.classList.toggle("hint-yes", dx > 40);
      card.classList.toggle("hint-no", dx < -40);
    });
    function end() {
      if (x0 === null) return;
      x0 = null; card.style.transition = ""; card.style.transform = "";
      if (Math.abs(dx) > 90) vote(dx > 0);
      card.classList.remove("hint-yes", "hint-no");
      dx = 0;
    }
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var t = document.createElement("textarea");
    t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch (e) {}
    t.remove();
    return Promise.resolve();
  }

  function send(where) {
    var text = "Здравствуйте! Собрал(а) сайт в брифе shak.web.\n\n" + tzText(estimate());
    var hint = document.getElementById("sendHint");
    if (where === "tg" && C.bot.token && C.bot.chatId) {
      hint.textContent = "Отправляем…";
      fetch("https://api.telegram.org/bot" + C.bot.token + "/sendMessage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: C.bot.chatId, text: text })
      }).then(function (r) {
        if (!r.ok) throw new Error();
        st.sent = true; save();
        hint.textContent = "✓ Отправлено. Ответ придёт в течение дня.";
      }).catch(function () { manual(where, text, hint); });
      return;
    }
    manual(where, text, hint);
  }

  function manual(where, text, hint) {
    copy(text).then(function () {
      hint.textContent = "ТЗ скопировано. Вставьте его в чат, который сейчас откроется.";
    });
    var url = where === "tg" ? "https://t.me/" + C.contacts.telegram : "https://ig.me/m/" + C.contacts.instagram;
    setTimeout(function () { window.open(url, "_blank", "noopener"); }, 400);
  }

  app.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    var d = t.dataset;
    if (t.hasAttribute("data-next")) { if (validate()) go(1); }
    else if (t.hasAttribute("data-back")) { if (STEPS[st.step] === "niche") { st.name = document.getElementById("name").value; st.city = document.getElementById("city").value; } go(-1); }
    else if (t.hasAttribute("data-skip")) { st.swipe = C.styles.length; render(); }
    else if (d.niche) {
      if (st.niche !== d.niche) { st.features = null; }
      st.niche = d.niche; st.name = document.getElementById("name").value; st.city = document.getElementById("city").value;
      render();
    }
    else if (d.vote) vote(d.vote === "yes");
    else if (t.hasAttribute("data-reswipe")) { st.swipe = 0; st.likes = {}; render(); }
    else if (d.pal) { st.palette = +d.pal; render(); }
    else if (t.hasAttribute("data-allpal")) { st.allPal = true; render(); }
    else if (d.font) { st.font = +d.font; render(); }
    else if (t.hasAttribute("data-allfonts")) { st.allFonts = true; render(); }
    else if (d.feat) {
      var i = st.features.indexOf(d.feat);
      if (i >= 0) st.features.splice(i, 1); else st.features.push(d.feat);
      render();
    }
    else if (d.cur) { st.cur = d.cur; render(); }
    else if (d.budget) { st.budget = d.budget; render(); }
    else if (d.copy) { copy(d.copy); t.querySelector("span").textContent = "Скопировано"; setTimeout(function () { t.querySelector("span").textContent = d.copy; }, 1200); }
    else if (d.send) send(d.send);
    else if (t.hasAttribute("data-pdf")) window.print();
    else if (t.hasAttribute("data-info")) { var inf = document.getElementById("info"); inf.open = true; inf.scrollIntoView({ behavior: "smooth" }); }
    else if (t.hasAttribute("data-edit")) { st.step = 1; render(); }
    else if (t.hasAttribute("data-restart")) {
      if (confirm("Начать бриф заново? Ответы сотрутся.")) { try { localStorage.removeItem(KEY); } catch (err) {} location.reload(); }
    }
  });

  app.addEventListener("input", function (e) {
    if (e.target.id === "contact") {
      var c = checkContact(e.target.value), h = document.getElementById("hint"), er = document.getElementById("err");
      h.textContent = c.ok ? "✓ " + c.type : "";
      if (c.ok) er.hidden = true;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (STEPS[st.step] === "style" && st.swipe < C.styles.length) {
      if (e.key === "ArrowRight") vote(true);
      if (e.key === "ArrowLeft") vote(false);
    }
  });

  if (st.step >= STEPS.length) st.step = 0;
  if (!C.currency[st.cur]) st.cur = Object.keys(C.currency)[0];
  render();
})();
