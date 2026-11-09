// Бот @shakweb_bot (shak.web), Google Apps Script.
// Что умеет:
//  • /start: карточка с обложкой и кнопками (работы в мини-приложении, бриф, цены, написать, канал).
//    Метка из ссылки t.me/shakweb_bot?start=ИСТОЧНИК попадает в бриф и в таблицу.
//  • /price, /works, /brief, /faq, /contact и кнопки с ответами на частые вопросы.
//  • Всё, что человек пишет боту (текст, фото, голос, файлы), приходит Трофиму с именем и ссылкой.
//    Трофим отвечает реплаем на это сообщение, и бот пересылает ответ человеку.
//  • Таблица «shak.web бот: люди»: кто пришёл, откуда, когда писал, не заблокировал ли бота.
//  • Для Трофима: /stats, /last, /broadcast текст (рассылка всем с подтверждением).
//  • Защита от зависаний: Google отвечает Telegram переадресацией 302, Telegram считает это ошибкой
//    и начинает придерживать сообщения. После каждого ответа бот забирает очередь сам и ничего не теряет.
//    Раз в час проверка, что всё в порядке.
// Установка: вставить токен в TOKEN, «Выполнить» setup (разрешить доступ), развернуть как веб-приложение
// (запуск от имени: я, доступ: все), ссылку /exec прислать агенту или запустить setWebhook().

const TOKEN = PropertiesService.getScriptProperties().getProperty("TOKEN") || "ВСТАВЬТЕ_ТОКЕН";
const OWNER = 1971837615;            // Трофим
const OWNER_NICK = "SHAKIROVtrofim";
const VER = "20261109";              // меняйте, чтобы Telegram не показывал старое мини-приложение и обложку
const SITE = "https://trofimshakirov2081-lang.github.io/Shak.web/";
const APP = SITE + "app/?v=" + VER;
const RABOTY = SITE + "raboty/";
const COVER = SITE + "app/cover.jpg?v=" + VER;
const CHANNEL = "https://t.me/shak_web";
const HOOK_URL = "";                 // можно вставить ссылку /exec, тогда setWebhook() возьмёт её отсюда

const P = PropertiesService.getScriptProperties();

/* ---------- Telegram ---------- */
function api(method, body) {
  const r = UrlFetchApp.fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
    method: "post", contentType: "application/json", payload: JSON.stringify(body || {}), muteHttpExceptions: true
  });
  let j; try { j = JSON.parse(r.getContentText()); } catch (e) { j = { ok: false, description: r.getContentText() }; }
  if (!j.ok) console.warn(method, j.error_code, j.description);
  return j;
}
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function send(chat, text, kb, extra) {
  const b = Object.assign({ chat_id: chat, text: text, parse_mode: "HTML", disable_web_page_preview: true }, extra || {});
  if (kb) b.reply_markup = { inline_keyboard: kb };
  const j = api("sendMessage", b);
  if (!j.ok && j.error_code === 403) markBlocked(chat);
  return j;
}

/* ---------- Тексты ---------- */
function briefUrl(src) { return SITE + "brief/?from=" + encodeURIComponent("bot" + (src ? "-" + src : "")); }
function cardKb(src) {
  return [
    [{ text: "📱 Смотреть работы", web_app: { url: APP } }],
    [{ text: "📝 Собрать свой сайт · 10 мин", web_app: { url: briefUrl(src) } }],
    [{ text: "💰 Цены и сроки", callback_data: "q:price" }, { text: "⚙️ Что за админка", callback_data: "q:admin" }],
    [{ text: "💬 Написать Трофиму", url: "https://t.me/" + OWNER_NICK }, { text: "📣 Канал", url: CHANNEL }]
  ];
}
const CAPTION = function (name) {
  return (name ? esc(name) + ", здравствуйте!" : "Здравствуйте!") + " Это <b>shak.web</b>: делаю сайты под ключ для малого бизнеса.\n\n" +
    "В каждом сайте есть админка: цены, тексты и фото вы меняете сами, без программиста. " +
    "Заявки приходят в Telegram, WhatsApp или на почту.\n\n" +
    "👇 Посмотрите работы или соберите свой сайт за 10 минут";
};
const ANSWERS = {
  price: "<b>Цены</b>\n\n" +
    "• <b>Старт</b>, 10 000 ₽: наш готовый дизайн в ваших цветах, админка, заявки в одно место.\n" +
    "• <b>Под ключ</b>, 15 500 ₽: дизайн с нуля под вас, полная админка, заявки куда угодно, 2 недели поддержки.\n" +
    "• <b>Всё за вас</b>, 18 000 ₽: «Под ключ» плюс сам покупаю и настраиваю домен и хостинг, Метрику и Вебмастер, месяц поддержки.\n\n" +
    "Сэкономить до 3 000 ₽: 1 200 ₽ за пройденный бриф или 3 000 ₽ за готовое ТЗ и брендбук.\n\n" +
    "<b>Сроки:</b> 7-14 дней от материалов.\n<b>Оплата:</b> заранее ничего не платите. Половина, когда сайт готов и всё нравится, остальное после запуска.\n" +
    "Домен и хостинг оплачиваете сами, обычно около 3 000 ₽ в год.",
  admin: "<b>Админка</b> это ваш пульт управления сайтом. Без программиста вы сами:\n\n" +
    "• меняете цены, тексты и фото за минуту\n• добавляете и убираете товары, услуги, разделы и страницы\n" +
    "• правите контакты, адрес и график\n• меняете цвета, шрифты и оформление\n" +
    "• выбираете, куда приходят заявки: Telegram, WhatsApp, почта, можно сразу в несколько мест\n\n" +
    "Поменяли цифру, нажали «Сохранить», и сайт уже обновился.",
  terms: "<b>Как работаем</b>\n\n1. Бриф за 10 минут: отвечаете на вопросы, я получаю ТЗ.\n2. Первый вариант за 2-3 дня на вашем материале.\n" +
    "3. Правки, пока не понравится, в рамках ТЗ.\n4. Запуск и оплата: половина, когда всё нравится, остальное после запуска.\n\nВсё обсуждаем в переписке, созваниваться не нужно.",
  need: "<b>Что нужно от вас</b>\n\n• название, чем занимаетесь, город\n• услуги или товары с ценами\n• фото (можно из соцсетей)\n• куда присылать заявки\n\nЕсли чего-то нет, помогу: тексты и подбор фото тоже делаю.",
  domain: "<b>Домен и хостинг</b>\n\nЭто адрес сайта и место, где он лежит. Обычно около 3 000 ₽ в год, оплачиваете вы, сайт полностью ваш. " +
    "В пакете «Всё за вас» покупаю и настраиваю сам. Сайт открывается в России без VPN."
};
function faqKb() {
  return [
    [{ text: "💰 Цены", callback_data: "q:price" }, { text: "⚙️ Админка", callback_data: "q:admin" }],
    [{ text: "🗓 Сроки и оплата", callback_data: "q:terms" }, { text: "📎 Что нужно от меня", callback_data: "q:need" }],
    [{ text: "🌐 Домен и хостинг", callback_data: "q:domain" }],
    [{ text: "📝 Собрать сайт · 10 мин", web_app: { url: briefUrl("faq") } }]
  ];
}
function afterAnswerKb() {
  return [[{ text: "📝 Собрать сайт · 10 мин", web_app: { url: briefUrl("faq") } }], [{ text: "❓ Другие вопросы", callback_data: "q:menu" }, { text: "💬 Написать", url: "https://t.me/" + OWNER_NICK }]];
}

/* ---------- Вход ---------- */
function doPost(e) {
  let u;
  try { u = JSON.parse(e.postData.contents); } catch (err) { return ok(); }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return ok();          // Telegram пришлёт повторно, обработаем тогда
  try {
    handleOnce(u);
    drain();                                      // забираем очередь, чтобы Telegram не тормозил из-за 302
  } catch (err) { console.error(err && err.stack || err); }
  finally { lock.releaseLock(); }
  return ok();
}
function doGet() { return ContentService.createTextOutput("shak.web bot ok"); }
function ok() { return ContentService.createTextOutput("ok"); }

function handleOnce(u) {
  if (!u || u.update_id == null) return;
  const c = CacheService.getScriptCache(), k = "u" + u.update_id;
  if (c.get(k)) return;
  c.put(k, "1", 21600);
  try { route(u); } catch (err) { console.error("route", err && err.stack || err); }
}

// Снимаем webhook, забираем всё, что Telegram держит в очереди, подтверждаем и ставим webhook обратно
function drain() {
  const info = api("getWebhookInfo").result || {};
  const url = info.url || P.getProperty("HOOK") || HOOK_URL;
  if (!url) return;
  P.setProperty("HOOK", url);
  if (!info.pending_update_count) return;
  api("deleteWebhook", { drop_pending_updates: false });
  let offset = 0;
  for (let round = 0; round < 3; round++) {
    const r = api("getUpdates", { offset: offset, timeout: 0, limit: 100, allowed_updates: ["message", "callback_query", "my_chat_member"] });
    const list = (r.ok && r.result) || [];
    if (!list.length) break;
    list.forEach(function (x) { handleOnce(x); offset = Math.max(offset, x.update_id + 1); });
  }
  if (offset) api("getUpdates", { offset: offset, timeout: 0, limit: 1 });
  api("setWebhook", { url: url, allowed_updates: ["message", "callback_query", "my_chat_member"], max_connections: 5 });
}

function route(u) {
  if (u.message) return onMessage(u.message);
  if (u.callback_query) return onCallback(u.callback_query);
  if (u.my_chat_member) {
    const m = u.my_chat_member;
    if (m.chat.type === "private" && m.new_chat_member && m.new_chat_member.status === "kicked") markBlocked(m.chat.id);
    if (m.chat.type === "private" && m.new_chat_member && m.new_chat_member.status === "member") touchUser(m.from, null, "вернулся");
  }
}

/* ---------- Сообщения ---------- */
function onMessage(m) {
  if (!m.chat || m.chat.type !== "private") return;   // в группах молчим
  const text = (m.text || "").trim();
  const cmd = (text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/) || []);

  if (m.chat.id === OWNER) {
    if (m.reply_to_message && !cmd[1]) return ownerReply(m);
    if (cmd[1] === "stats") return send(OWNER, stats());
    if (cmd[1] === "last") return send(OWNER, lastUsers());
    if (cmd[1] === "broadcast") return broadcastAsk(cmd[2]);
    if (cmd[1] === "help_owner") return send(OWNER, OWNER_HELP);
    if (!cmd[1]) return send(OWNER, "Это вы 🙂 Чтобы ответить человеку, нажмите «Ответить» на его сообщении здесь.\n\n" + OWNER_HELP);
  }

  if (cmd[1] === "start") {
    const src = (cmd[2] || "").replace(/[^\w-]/g, "").slice(0, 40);
    const isNew = touchUser(m.from, src || "бот", "start");
    sendCard(m.chat.id, m.from, src);
    if (isNew && m.chat.id !== OWNER) {
      send(OWNER, "🆕 Новый человек в боте: " + who(m.from) + (src ? "\nОткуда: <b>" + esc(src) + "</b>" : ""));
    }
    return;
  }
  touchUser(m.from, null, text ? "сообщение" : "файл");
  if (cmd[1] === "price") return send(m.chat.id, ANSWERS.price, afterAnswerKb());
  if (cmd[1] === "faq" || cmd[1] === "help") return send(m.chat.id, "Частые вопросы. Нажмите на нужный:", faqKb());
  if (cmd[1] === "works") return send(m.chat.id, "Работы удобнее смотреть в мини-приложении, там же можно открыть любой сайт.", [[{ text: "📱 Смотреть работы", web_app: { url: APP } }], [{ text: "🌐 Открыть в браузере", url: RABOTY }]]);
  if (cmd[1] === "brief") return send(m.chat.id, "Бриф бесплатный, 10 минут. Выбираете стиль, разделы и функции, а я присылаю план сайта и точную цену. За пройденный до конца бриф скидка 1 200 ₽.", [[{ text: "📝 Пройти бриф", web_app: { url: briefUrl("cmd") } }]]);
  if (cmd[1] === "contact") return send(m.chat.id, "Пишите прямо сюда, сообщение сразу придёт Трофиму. Или в личку: @" + OWNER_NICK, [[{ text: "💬 Написать Трофиму", url: "https://t.me/" + OWNER_NICK }]]);
  if (cmd[1]) return sendCard(m.chat.id, m.from, "");

  // Человек написал сам: передаём Трофиму, ему коротко отвечаем
  relayToOwner(m);
  const c = CacheService.getScriptCache(), k = "ack" + m.chat.id;
  if (!c.get(k)) {
    c.put(k, "1", 1800);
    send(m.chat.id, "Спасибо! Передал Трофиму, он ответит прямо здесь, обычно в течение пары часов.\n\nПока можно посмотреть цены или собрать свой сайт:", [
      [{ text: "💰 Цены и сроки", callback_data: "q:price" }],
      [{ text: "📝 Собрать сайт · 10 мин", web_app: { url: briefUrl("chat") } }]
    ]);
  }
}

function sendCard(chat, from, src) {
  const j = api("sendPhoto", { chat_id: chat, photo: COVER, caption: CAPTION(from && from.first_name), parse_mode: "HTML", reply_markup: { inline_keyboard: cardKb(src) } });
  if (!j.ok) {
    if (j.error_code === 403) return markBlocked(chat);
    send(chat, CAPTION(from && from.first_name), cardKb(src));   // если картинка не загрузилась, хотя бы текст
  }
}

function who(f) {
  if (!f) return "кто-то";
  const name = esc([f.first_name, f.last_name].filter(Boolean).join(" ") || "без имени");
  return '<a href="tg://user?id=' + f.id + '">' + name + "</a>" + (f.username ? " @" + esc(f.username) : "") + " · id " + f.id;
}

function relayToOwner(m) {
  const head = send(OWNER, "💬 " + who(m.from) + " пишет:\n<i>Ответьте реплаем, и бот отправит ответ человеку</i>");
  remember(head, m.chat.id);
  const f = api("forwardMessage", { chat_id: OWNER, from_chat_id: m.chat.id, message_id: m.message_id });
  if (f.ok) remember(f, m.chat.id);
  else remember(api("copyMessage", { chat_id: OWNER, from_chat_id: m.chat.id, message_id: m.message_id }), m.chat.id);
}

// Связь «сообщение у Трофима → человек», храним последние 400
function remember(j, userId) {
  if (!j || !j.ok) return;
  const id = j.result && j.result.message_id;
  if (id == null) return;
  P.setProperty("m:" + id, String(userId));
  const q = (P.getProperty("mq") || "").split(",").filter(Boolean);
  q.push(String(id));
  while (q.length > 400) P.deleteProperty("m:" + q.shift());
  P.setProperty("mq", q.join(","));
}

function ownerReply(m) {
  const r = m.reply_to_message;
  let to = P.getProperty("m:" + r.message_id);
  if (!to && r.forward_origin && r.forward_origin.sender_user) to = r.forward_origin.sender_user.id;
  if (!to && r.forward_from) to = r.forward_from.id;
  if (!to) { const mt = (r.text || r.caption || "").match(/id (\d{5,})/); if (mt) to = mt[1]; }
  if (!to) return send(OWNER, "Не понял, кому ответить. Нажмите «Ответить» на сообщении с именем человека.");
  const j = api("copyMessage", { chat_id: Number(to), from_chat_id: OWNER, message_id: m.message_id });
  if (j.ok) { remember({ ok: true, result: { message_id: m.message_id } }, to); api("setMessageReaction", { chat_id: OWNER, message_id: m.message_id, reaction: [{ type: "emoji", emoji: "👌" }] }); }
  else if (j.error_code === 403) { markBlocked(to); send(OWNER, "Не доставлено: человек заблокировал бота."); }
  else send(OWNER, "Не отправилось: " + esc(j.description || "ошибка"));
}

/* ---------- Кнопки ---------- */
function onCallback(q) {
  const d = q.data || "";
  api("answerCallbackQuery", { callback_query_id: q.id });
  const chat = q.message && q.message.chat.id;
  if (!chat) return;
  if (d === "q:menu") return send(chat, "Частые вопросы. Нажмите на нужный:", faqKb());
  if (d.indexOf("q:") === 0 && ANSWERS[d.slice(2)]) { touchUser(q.from, null, "вопрос " + d.slice(2)); return send(chat, ANSWERS[d.slice(2)], afterAnswerKb()); }
  if (q.from.id !== OWNER) return;
  if (d === "bc:yes") return broadcastRun(chat, q.message.message_id);
  if (d === "bc:no") { P.deleteProperty("bc"); return api("editMessageText", { chat_id: chat, message_id: q.message.message_id, text: "Рассылка отменена." }); }
}

/* ---------- Таблица людей ---------- */
function sheet() {
  let id = P.getProperty("SHEET"), ss;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create("shak.web бот: люди");
    const s = ss.getSheets()[0];
    s.setName("люди");
    s.appendRow(["id", "имя", "ник", "откуда пришёл", "первый вход", "последний раз", "сообщений", "последнее действие", "статус"]);
    s.setFrozenRows(1);
    P.setProperty("SHEET", ss.getId());
  }
  return ss.getSheetByName("люди") || ss.getSheets()[0];
}
// Возвращает true, если человек новый
function touchUser(f, src, action) {
  if (!f || f.is_bot) return false;
  const s = sheet(), now = new Date(), key = "r:" + f.id;
  const name = [f.first_name, f.last_name].filter(Boolean).join(" ");
  let row = Number(P.getProperty(key) || 0);
  if (row && String(s.getRange(row, 1).getValue()) !== String(f.id)) row = 0;   // строку удалили или сдвинули
  if (!row) {
    const ids = s.getRange(1, 1, Math.max(1, s.getLastRow()), 1).getValues().map(function (r) { return String(r[0]); });
    const i = ids.indexOf(String(f.id));
    if (i >= 0) row = i + 1;
  }
  if (!row) {
    s.appendRow([f.id, name, f.username ? "@" + f.username : "", src || "", now, now, action === "start" ? 0 : 1, action || "", "активен"]);
    P.setProperty(key, String(s.getLastRow()));
    return true;
  }
  P.setProperty(key, String(row));
  const n = Number(s.getRange(row, 7).getValue() || 0) + (action === "start" || /^вопрос/.test(action || "") ? 0 : 1);
  s.getRange(row, 2, 1, 2).setValues([[name, f.username ? "@" + f.username : ""]]);
  s.getRange(row, 6, 1, 4).setValues([[now, n, action || "", "активен"]]);
  if (src && !s.getRange(row, 4).getValue()) s.getRange(row, 4).setValue(src);
  return false;
}
function markBlocked(id) {
  try {
    const row = Number(P.getProperty("r:" + id) || 0);
    if (row) sheet().getRange(row, 9).setValue("заблокировал бота");
  } catch (e) {}
}
function users() {
  const s = sheet(), n = s.getLastRow();
  if (n < 2) return [];
  return s.getRange(2, 1, n - 1, 9).getValues().filter(function (r) { return r[0]; });
}

/* ---------- Для Трофима ---------- */
const OWNER_HELP = "Команды для вас:\n/stats сколько людей в боте\n/last последние 10\n/broadcast текст: рассылка всем (сначала покажу, сколько получат)\nОтвет человеку: «Ответить» на его сообщении.";
function stats() {
  const u = users(), day = 864e5, now = Date.now();
  const act = u.filter(function (r) { return r[8] !== "заблокировал бота"; }).length;
  const d1 = u.filter(function (r) { return now - new Date(r[4]).getTime() < day; }).length;
  const d7 = u.filter(function (r) { return now - new Date(r[4]).getTime() < 7 * day; }).length;
  const src = {};
  u.forEach(function (r) { const k = r[3] || "без метки"; src[k] = (src[k] || 0) + 1; });
  const top = Object.keys(src).sort(function (a, b) { return src[b] - src[a]; }).slice(0, 6).map(function (k) { return "• " + esc(k) + ": " + src[k]; }).join("\n");
  return "<b>Бот</b>\nВсего людей: " + u.length + " (доступны для рассылки: " + act + ")\nНовых за сутки: " + d1 + ", за неделю: " + d7 + "\n\n<b>Откуда</b>\n" + (top || "пока нет") +
    "\n\nТаблица: https://docs.google.com/spreadsheets/d/" + P.getProperty("SHEET");
}
function lastUsers() {
  const u = users().slice(-10).reverse();
  if (!u.length) return "Пока никого.";
  return "<b>Последние</b>\n" + u.map(function (r) {
    return '• <a href="tg://user?id=' + r[0] + '">' + esc(r[1] || "без имени") + "</a> " + esc(r[2]) + " · " + esc(r[3] || "") + " · " + Utilities.formatDate(new Date(r[5]), "Europe/Moscow", "dd.MM HH:mm") + (r[8] === "заблокировал бота" ? " · 🚫" : "");
  }).join("\n");
}
function broadcastAsk(text) {
  text = (text || "").trim();
  if (!text) return send(OWNER, "Напишите так: /broadcast Текст рассылки");
  const n = users().filter(function (r) { return r[8] !== "заблокировал бота" && Number(r[0]) !== OWNER; }).length;
  P.setProperty("bc", text);
  send(OWNER, "<b>Рассылка</b> получат " + n + " чел.:\n\n" + esc(text), [[{ text: "✅ Отправить " + n, callback_data: "bc:yes" }, { text: "Отмена", callback_data: "bc:no" }]]);
}
function broadcastRun(chat, msgId) {
  const text = P.getProperty("bc");
  if (!text) return;
  P.deleteProperty("bc");
  api("editMessageText", { chat_id: chat, message_id: msgId, text: "Отправляю…" });
  let okN = 0, bad = 0;
  users().forEach(function (r) {
    if (r[8] === "заблокировал бота" || Number(r[0]) === OWNER) return;
    const j = api("sendMessage", { chat_id: Number(r[0]), text: text, disable_web_page_preview: false, reply_markup: { inline_keyboard: [[{ text: "📱 Работы", web_app: { url: APP } }, { text: "📝 Бриф", web_app: { url: briefUrl("rassylka") } }]] } });
    if (j.ok) okN++; else { bad++; if (j.error_code === 403) markBlocked(r[0]); }
    Utilities.sleep(60);
  });
  send(OWNER, "Рассылка готова: доставлено " + okN + (bad ? ", не доставлено " + bad : "") + ".");
}

/* ---------- Установка и проверка ---------- */
// Запустить один раз из редактора: создаст таблицу, команды, описание и проверку раз в час
function setup() {
  if (TOKEN === "ВСТАВЬТЕ_ТОКЕН") throw new Error("Вставьте токен бота в строку TOKEN");
  sheet();
  api("setMyCommands", { commands: [
    { command: "start", description: "Главное меню" },
    { command: "works", description: "Посмотреть работы" },
    { command: "brief", description: "Собрать свой сайт за 10 минут" },
    { command: "price", description: "Цены и сроки" },
    { command: "faq", description: "Частые вопросы" },
    { command: "contact", description: "Написать Трофиму" }
  ] });
  api("setMyCommands", { scope: { type: "chat", chat_id: OWNER }, commands: [
    { command: "stats", description: "Статистика бота" },
    { command: "last", description: "Последние 10 человек" },
    { command: "broadcast", description: "Рассылка всем: /broadcast текст" },
    { command: "start", description: "Карточка, как её видят люди" }
  ] });
  api("setChatMenuButton", { menu_button: { type: "web_app", text: "Работы", web_app: { url: APP } } });
  api("setMyShortDescription", { short_description: "Сайты под ключ с админкой: цены, тексты и фото меняете сами. Работы и бриф за 10 минут." });
  api("setMyDescription", { description: "Здравствуйте! Это shak.web. Делаю сайты под ключ для малого бизнеса, в каждом есть админка: цены, тексты и фото вы меняете сами.\n\nНажмите «Старт»: покажу работы, цены и помогу собрать свой сайт за 10 минут." });
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "health") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("health").timeBased().everyHours(1).create();
  Logger.log("Готово. Таблица: https://docs.google.com/spreadsheets/d/" + P.getProperty("SHEET"));
}
// Раз в час: если Telegram что-то держит в очереди, забираем
function health() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try { drain(); } finally { lock.releaseLock(); }
}
// Подключить бота к этому скрипту (ссылку /exec вставьте в HOOK_URL)
function setWebhook() {
  const url = HOOK_URL || P.getProperty("HOOK");
  if (!url) throw new Error("Вставьте ссылку /exec в HOOK_URL");
  P.setProperty("HOOK", url);
  Logger.log(JSON.stringify(api("setWebhook", { url: url, allowed_updates: ["message", "callback_query", "my_chat_member"], drop_pending_updates: true, max_connections: 5 })));
}
