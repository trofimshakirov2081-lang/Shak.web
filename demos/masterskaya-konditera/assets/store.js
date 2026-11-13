// Общее хранилище для сайта и админки.
// Базовые данные лежат в data.js, правки владельца сохраняются в браузере (localStorage).
// Если data.js обновили (поменялся rev), старые правки из браузера не подмешиваются.
(function () {
  var base = window.SITE;
  var KEY = "shakweb:" + base.id;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved && saved.rev === base.rev) return saved;
    } catch (e) { /* приватный режим или битые данные: работаем с базой */ }
    return clone(base);
  }

  function save(data) {
    data.rev = base.rev;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    return clone(base);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function money(n, cur) {
    return Number(n || 0).toLocaleString("ru-RU") + " " + (cur || "");
  }

  function applyTheme(data, root) {
    var c = data.colors, s = (root || document.documentElement).style;
    s.setProperty("--main", c.main);
    s.setProperty("--accent", c.accent);
    s.setProperty("--bg", c.bg);
    s.setProperty("--text", c.text);
    s.setProperty("--font-head", "'" + data.fonts.head + "', Georgia, serif");
    s.setProperty("--font-body", "'" + data.fonts.body + "', system-ui, sans-serif");
    var id = "gfonts";
    var link = document.getElementById(id);
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    var fams = [data.fonts.head, data.fonts.body].filter(function (f, i, a) { return a.indexOf(f) === i; });
    link.href = "https://fonts.googleapis.com/css2?" +
      fams.map(function (f) { return "family=" + encodeURIComponent(f) + ":wght@400;700"; }).join("&") +
      "&display=swap";
  }

  window.Store = { KEY: KEY, load: load, save: save, reset: reset, esc: esc, money: money, applyTheme: applyTheme, clone: clone };
})();
