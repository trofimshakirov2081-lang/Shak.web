// Бот @shakweb_bot: отвечает на /start и любые сообщения карточкой с кнопками
// (мини-приложение с работами, бриф, написать Трофиму) и пересылает сообщения людей Трофиму.
// Токен бота хранится в свойствах скрипта (TOKEN), в коде его нет.
// Установка: script.google.com → Новый проект → вставить код → Настройки проекта → Свойства скрипта:
// TOKEN = токен от BotFather. Затем «Развернуть → Новое развертывание → Веб-приложение», доступ: все.
// Ссылку развертывания вставить в setWebhook() ниже (или прислать агенту, он подключит сам).

const P = PropertiesService.getScriptProperties();
const OWNER = 1971837615; // Трофим: сюда приходят сообщения, которые люди пишут боту
const APP = "https://trofimshakirov2081-lang.github.io/Shak.web/app/?v=20261109"; // меняйте v, чтобы Telegram не показывал старую версию
const BRIEF = "https://trofimshakirov2081-lang.github.io/Shak.web/brief/?from=bot";
const COVER = "https://trofimshakirov2081-lang.github.io/Shak.web/app/cover.jpg";

function api(method, body) {
  const r = UrlFetchApp.fetch("https://api.telegram.org/bot" + P.getProperty("TOKEN") + "/" + method, {
    method: "post", contentType: "application/json", payload: JSON.stringify(body), muteHttpExceptions: true
  });
  return JSON.parse(r.getContentText());
}

function card(chat, name) {
  const hi = name ? name + ", здравствуйте!" : "Здравствуйте!";
  api("sendPhoto", {
    chat_id: chat, parse_mode: "HTML", photo: COVER,
    caption: hi + " Это <b>shak.web</b>: делаю сайты под ключ для малого бизнеса.\n\n" +
      "В каждом сайте есть админка: цены, тексты и фото вы меняете сами, без программиста. " +
      "Заявки приходят в Telegram, WhatsApp или на почту.\n\n" +
      "👇 Посмотрите работы или соберите свой сайт за 10 минут",
    reply_markup: { inline_keyboard: [
      [{ text: "📱 Смотреть работы", web_app: { url: APP } }],
      [{ text: "📝 Собрать свой сайт · 10 мин", web_app: { url: BRIEF } }],
      [{ text: "💬 Написать Трофиму", url: "https://t.me/SHAKIROVtrofim" }]
    ] }
  });
}

function doPost(e) {
  try {
    const u = JSON.parse(e.postData.contents), m = u.message;
    // Google отвечает Telegram переадресацией, и Telegram повторяет сообщения: отвечаем на каждое только раз
    const cache = CacheService.getScriptCache(), key = "u" + u.update_id;
    if (cache.get(key)) return ok();
    cache.put(key, "1", 21600);
    if (!m || !m.chat || m.chat.type !== "private") return ok();
    const text = m.text || "";
    card(m.chat.id, m.from && m.from.first_name);
    if (!/^\/start/.test(text) && m.chat.id !== OWNER) {
      // Человек написал что-то сам: пересылаем Трофиму, чтобы не потерять
      api("forwardMessage", { chat_id: OWNER, from_chat_id: m.chat.id, message_id: m.message_id });
    }
    // Google отвечает Telegram переадресацией 302, Telegram считает это ошибкой и начинает
    // тормозить следующие сообщения. Сбрасываем очередь: это сообщение уже обработано.
    api("setWebhook", { url: ScriptApp.getService().getUrl(), allowed_updates: ["message"], drop_pending_updates: true });
  } catch (err) { console.error(err); }
  return ok();
}
function ok() { return ContentService.createTextOutput("ok"); }

// Запустить один раз после развертывания, вставив ссылку веб-приложения
function setWebhook() {
  const url = "ВСТАВЬТЕ_ССЫЛКУ_РАЗВЕРТЫВАНИЯ";
  Logger.log(JSON.stringify(api("setWebhook", { url: url, allowed_updates: ["message"], drop_pending_updates: true })));
}
