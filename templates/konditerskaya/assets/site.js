(function () {
  var S = window.Store, esc = S.esc;
  var data = S.load();
  var cart = {};
  var CART_KEY = S.KEY + ":cart";
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "{}"); } catch (e) {}

  S.applyTheme(data);
  document.title = data.brand.name + (data.brand.tagline ? " | " + data.brand.tagline : "");

  function money(n) { return S.money(n, data.currency); }
  function item(id) { return data.items.filter(function (i) { return i.id === id; })[0]; }

  function pic(i) {
    return i.photo ? '<img src="' + esc(i.photo) + '" alt="' + esc(i.name) + '" loading="lazy">' : esc(i.emoji || "🍰");
  }

  function logo() {
    var b = data.brand;
    var mark = b.logo
      ? '<img src="' + esc(b.logo) + '" alt="Логотип ' + esc(b.name) + '">'
      : '<i class="mark">' + esc((b.name || "?").trim().charAt(0)) + "</i>";
    return '<a class="logo" href="#top">' + mark + "<span>" + esc(b.name) + "</span></a>";
  }

  function contactsHtml() {
    var c = data.contacts, out = [];
    if (c.phone) out.push(['Телефон', c.phone, 'tel:' + c.phone.replace(/[^\d+]/g, '')]);
    if (c.whatsapp) out.push(['WhatsApp', 'Написать', 'https://wa.me/' + c.whatsapp.replace(/\D/g, '')]);
    if (c.telegram) out.push(['Telegram', '@' + c.telegram.replace(/^@/, ''), 'https://t.me/' + c.telegram.replace(/^@/, '')]);
    if (c.instagram) out.push(['Instagram', '@' + c.instagram.replace(/^@/, ''), 'https://instagram.com/' + c.instagram.replace(/^@/, '')]);
    if (c.address) out.push(['Адрес', (data.brand.city ? data.brand.city + ', ' : '') + c.address, '']);
    if (c.hours) out.push(['Часы работы', c.hours, '']);
    return out.map(function (r) {
      var inner = '<small>' + esc(r[0]) + '</small><strong>' + esc(r[1]) + '</strong>';
      return r[2] ? '<a class="contact" href="' + esc(r[2]) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="contact">' + inner + '</div>';
    }).join("");
  }

  function render() {
    var d = data;
    document.getElementById("app").innerHTML =
      (d.demo && d.demo.banner ? '<div class="demo-bar" data-demo><p>Демо от <b>shak.web</b><span class="long">. Цены, тексты и фото владелец меняет сам</span></p><a href="admin.html">Открыть админку</a><button data-hide-demo aria-label="Скрыть">×</button></div>' : '') +
      '<header class="top" id="top"><div class="wrap">' + logo() +
        '<nav class="nav"><a href="#menu">' + esc(d.sections.catalogTitle) + '</a><a href="#about">' + esc(d.sections.aboutTitle) + '</a><a href="#contacts">Контакты</a></nav>' +
        '<button class="cart-btn" data-open-cart>Корзина<b data-count>0</b></button>' +
      '</div></header>' +
      '<section class="hero"><div class="wrap"><div>' +
        (d.brand.tagline ? '<span class="kicker">' + esc(d.brand.tagline) + (d.brand.city ? ' · ' + esc(d.brand.city) : '') + '</span>' : '') +
        '<h1>' + esc(d.hero.title) + '</h1><p>' + esc(d.hero.text) + '</p>' +
        '<div class="actions"><a class="btn" href="#menu">' + esc(d.hero.cta) + ' →</a><a class="btn ghost" href="#contacts">Контакты</a></div>' +
      '</div>' + heroArt() + '</div></section>' +
      '<section class="features"><div class="wrap">' + d.features.map(function (f) {
        return '<div class="feature"><div class="ic">' + esc(f.icon) + '</div><h3>' + esc(f.title) + '</h3><p>' + esc(f.text) + '</p></div>';
      }).join("") + '</div></section>' +
      '<section class="catalog" id="menu"><div class="wrap"><h2>' + esc(d.sections.catalogTitle) + '</h2><p class="lead">' + esc(d.sections.catalogText) + '</p><div class="grid">' +
        d.items.map(function (i) {
          return '<article class="card"><div class="pic">' + pic(i) + (i.tag ? '<span class="tag">' + esc(i.tag) + '</span>' : '') + '</div>' +
            '<div class="body"><h3>' + esc(i.name) + '</h3><p>' + esc(i.desc) + '</p>' +
            '<div class="row"><span class="price">' + money(i.price) + '</span><button class="add" data-add="' + esc(i.id) + '">В корзину</button></div></div></article>';
        }).join("") +
      '</div></div></section>' +
      '<section class="about" id="about"><div class="wrap"><div class="box"><h2>' + esc(d.sections.aboutTitle) + '</h2><p>' + esc(d.sections.aboutText) + '</p></div></div></section>' +
      '<section class="contacts" id="contacts"><div class="wrap"><h2>Контакты</h2><div class="grid2">' + contactsHtml() + '</div></div></section>' +
      '<footer><div class="wrap"><span>© ' + new Date().getFullYear() + ' ' + esc(d.brand.name) + '</span><span><a href="admin.html">Вход для владельца</a> · Сайт сделан в <a href="https://instagram.com/shak.web" target="_blank" rel="noopener">shak.web</a></span></div></footer>' +
      '<div class="drawer-bg" data-close-cart></div><aside class="drawer" aria-label="Корзина"><header><h3 style="margin:0">Ваш заказ</h3><button data-close-cart aria-label="Закрыть">×</button></header><div class="list" data-list></div>' +
        '<div class="foot"><div class="total"><span>Итого</span><span data-total></span></div>' +
        '<input data-name placeholder="Ваше имя" autocomplete="name"><input data-phone placeholder="Телефон" inputmode="tel" autocomplete="tel"><textarea data-comment rows="2" placeholder="Комментарий: дата, время, надпись на торте"></textarea>' +
        orderButtons() + '</div></aside>' +
      '<div class="toast" data-toast></div>';
    updateCart();
  }

  function heroArt() {
    var first = data.items[0] || {};
    if (first.photo) return '<div class="hero-art">' + pic(first) + '</div>';
    var orbs = data.items.slice(1, 3).map(function (i, n) { return '<span class="orb o' + (n + 1) + '">' + esc(i.emoji || "") + '</span>'; }).join("");
    return '<div class="hero-art" aria-hidden="true"><span class="main">' + esc(first.emoji || "🍰") + '</span>' + orbs + '</div>';
  }

  function orderButtons() {
    var c = data.contacts, b = [];
    if (c.whatsapp) b.push('<button class="btn wide" data-order="wa">Отправить заказ в WhatsApp</button>');
    if (c.telegram) b.push('<button class="btn wide' + (b.length ? ' ghost' : '') + '" data-order="tg">Отправить заказ в Telegram</button>');
    if (!b.length && c.phone) b.push('<a class="btn wide" href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">Позвонить и заказать</a>');
    return b.join("");
  }

  function count() { var n = 0; for (var k in cart) n += cart[k]; return n; }

  function updateCart() {
    for (var k in cart) if (!item(k) || cart[k] <= 0) delete cart[k];
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    var total = 0, rows = [];
    for (var id in cart) {
      var i = item(id);
      total += i.price * cart[id];
      rows.push('<div class="line"><strong>' + esc(i.name) + '</strong><span>' + money(i.price * cart[id]) + '</span>' +
        '<div class="qty"><button data-dec="' + esc(id) + '" aria-label="Меньше">−</button>' + cart[id] + '<button data-inc="' + esc(id) + '" aria-label="Больше">+</button></div></div>');
    }
    document.querySelector("[data-count]").textContent = count();
    document.querySelector("[data-list]").innerHTML = rows.join("") || '<p class="empty">Пока пусто. Выберите что-нибудь вкусное 🙂</p>';
    document.querySelector("[data-total]").textContent = money(total);
  }

  function orderText() {
    var lines = ["Здравствуйте! Хочу заказать:"];
    for (var id in cart) { var i = item(id); lines.push("• " + i.name + " × " + cart[id] + " = " + money(i.price * cart[id])); }
    var total = 0; for (var k in cart) total += item(k).price * cart[k];
    lines.push("Итого: " + money(total));
    var q = function (s) { return document.querySelector(s).value.trim(); };
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

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-close-cart]");
    if (!t) return;
    var ds = t.dataset;
    if (ds.add) {
      cart[ds.add] = (cart[ds.add] || 0) + 1; updateCart();
      t.classList.add("done"); t.textContent = "Добавлено ✓";
      setTimeout(function () { t.classList.remove("done"); t.textContent = "В корзину"; }, 1200);
    } else if (ds.inc) { cart[ds.inc]++; updateCart(); }
    else if (ds.dec) { cart[ds.dec]--; updateCart(); }
    else if (t.hasAttribute("data-open-cart")) document.body.classList.add("open");
    else if (t.hasAttribute("data-close-cart")) document.body.classList.remove("open");
    else if (t.hasAttribute("data-hide-demo")) document.querySelector("[data-demo]").remove();
    else if (ds.order) {
      if (!count()) { toast("Добавьте что-нибудь в корзину"); return; }
      var text = orderText();
      if (ds.order === "wa") {
        window.open("https://wa.me/" + data.contacts.whatsapp.replace(/\D/g, "") + "?text=" + encodeURIComponent(text), "_blank");
      } else {
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        toast("Заказ скопирован, вставьте его в чат");
        window.open("https://t.me/" + data.contacts.telegram.replace(/^@/, ""), "_blank");
      }
    }
  });

  render();
})();
