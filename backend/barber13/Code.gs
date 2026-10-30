// BARBER 13: записи, настройки сайта и Telegram-бот на Google-таблице.
// Токен бота и пароль админки хранятся в закрытых свойствах скрипта, в коде их нет.
// Установка: вставить этот код в «Расширения → Apps Script», запустить setup(), развернуть как веб-приложение.

const SS = SpreadsheetApp.getActive();
const P = PropertiesService.getScriptProperties();
const TZ = "Asia/Yekaterinburg", TZ_MIN = 300; // Верхняя Пышма, UTC+5
const HEAD = ["id", "Создана", "Статус", "Дата", "Время", "Мастер", "Услуги", "Минут", "Цена", "Имя", "Телефон", "Комментарий", "start", "masterId", "svcIds", "tgChat", "напомнил за день", "напомнил за 2 ч"];
const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"], DOW = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

// ---------- первый запуск ----------
function setup() {
  sheet();
  if (!P.getProperty("pass")) P.setProperty("pass", "barber13");
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("tick").timeBased().everyMinutes(1).create();
  cfgFile();
  Logger.log("Готово. Теперь «Развернуть → Новое развертывание → Веб-приложение», доступ: все.");
}

// ---------- хранение ----------
function sheet() {
  let sh = SS.getSheetByName("Записи");
  if (!sh) { sh = SS.insertSheet("Записи"); sh.appendRow(HEAD); sh.setFrozenRows(1); sh.getRange("A:A").setNumberFormat("@"); sh.getRange("D:E").setNumberFormat("@"); sh.getRange("K:K").setNumberFormat("@"); }
  return sh;
}
function rows() {
  const v = sheet().getDataRange().getValues(); v.shift();
  return v.map((r, i) => ({ row: i + 2, id: String(r[0]), status: String(r[2]), date: String(r[3]), start: +r[12], len: +r[7], masterName: String(r[5]),
    master: String(r[13]), svc: String(r[6]).split(", "), svcIds: JSON.parse(r[14] || "[]"), price: +r[8], name: String(r[9]), phone: String(r[10]),
    comment: String(r[11]), chat: String(r[15] || ""), r24: r[16], r2: r[17] })).filter(b => b.id);
}
const pub = b => ({ id: b.id, status: b.status, date: b.date, start: b.start, len: b.len, master: b.master, svc: b.svc, svcIds: b.svcIds, price: b.price, name: b.name, phone: b.phone, comment: b.comment });
const last10 = p => String(p || "").replace(/\D/g, "").slice(-10);
const today = () => Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
const hm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
function nice(d) { const x = new Date(d + "T12:00:00Z"); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}, ${DOW[x.getUTCDay()]}`; }
function at(b) { const [y, m, d] = b.date.split("-").map(Number); return Date.UTC(y, m - 1, d) + (b.start - TZ_MIN) * 60000; }

// Настройки сайта лежат в JSON-файле на Диске рядом с таблицей (туда помещаются и фото)
function cfgFile() {
  const id = P.getProperty("cfgFile");
  if (id) try { return DriveApp.getFileById(id); } catch (e) {}
  const f = DriveApp.createFile("barber13-настройки-сайта.json", "{}", "application/json");
  P.setProperty("cfgFile", f.getId()); return f;
}
function getCfg() { try { return JSON.parse(cfgFile().getBlob().getDataAsString() || "{}"); } catch (e) { return {}; } }
function setCfg(c) { delete c.adminPass; cfgFile().setContent(JSON.stringify(c)); }

// ---------- сайт ----------
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  const a = e.parameter.a, t = today();
  if (a === "init") {
    const busy = rows().filter(b => b.status !== "cancelled" && b.date >= t).map(b => [b.master, b.date, b.start, b.len, b.id]);
    return out({ ok: true, cfg: getCfg(), busy, bot: P.getProperty("botName") || "" });
  }
  if (a === "find") {
    const p = last10(e.parameter.phone);
    if (p.length < 10) return out({ ok: false, error: "Номер полностью" });
    return out({ ok: true, list: rows().filter(b => b.status !== "cancelled" && b.date >= t && last10(b.phone) === p).map(pub) });
  }
  return out({ ok: true, hello: "BARBER 13" });
}

function doPost(e) {
  let q; try { q = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, error: "Плохой запрос" }); }
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { return out(handle(q)); } catch (x) { return out({ ok: false, error: String(x.message || x) }); } finally { lock.releaseLock(); }
}

function overlaps(r, list) {
  return list.some(b => b.status !== "cancelled" && b.master === r.master && b.date === r.date && b.id !== r.id && r.start < b.start + b.len && r.start + r.len > b.start);
}

function handle(q) {
  const list = rows();
  if (q.action === "book") {
    const r = q.rec, old = q.editId ? list.find(b => b.id === q.editId && last10(b.phone) === last10(r.phone)) : null;
    if (q.editId && !old) return { ok: false, error: "Запись для переноса не найдена" };
    r.id = old ? old.id : Utilities.getUuid().slice(0, 8);
    if (overlaps(r, list)) return { ok: false, error: "busy" };
    const m = (getCfg().masters || []).find(x => x.id === r.master);
    const vals = [r.id, Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm"), old ? "moved" : "new", r.date, hm(r.start), m ? m.name : r.master, r.svc.join(", "), r.len, r.price,
      r.name, "'" + r.phone, r.comment || "", r.start, r.master, JSON.stringify(r.svcIds || []), old ? old.chat : "", "", ""];
    if (old) sheet().getRange(old.row, 1, 1, vals.length).setValues([vals]); else sheet().appendRow(vals);
    r.status = old ? "moved" : "new";
    notifyAdmins(`${old ? "🔁 Перенос" : "✂️ Новая запись"}: ${nice(r.date)}, ${hm(r.start)}\n${m ? m.name : ""}: ${r.svc.join(", ")}\n${r.name}, ${r.phone}${r.comment ? "\n" + r.comment : ""}${old ? `\nБыло: ${nice(old.date)}, ${hm(old.start)}` : ""}`);
    if (old && old.chat) tg("sendMessage", { chat_id: old.chat, text: `Запись перенесена: ${nice(r.date)}, ${hm(r.start)}. Ждём вас!` });
    return { ok: true, rec: r, bot: P.getProperty("botName") || "" };
  }
  if (q.action === "cancel") {
    const b = list.find(x => x.id === q.id && last10(x.phone) === last10(q.phone));
    if (!b) return { ok: false, error: "Запись не найдена" };
    sheet().getRange(b.row, 3).setValue("cancelled");
    notifyAdmins(`❌ Отмена: ${nice(b.date)}, ${hm(b.start)}\n${b.masterName}: ${b.svc.join(", ")}\n${b.name}, ${b.phone}`);
    return { ok: true };
  }
  // всё ниже только для мастера: нужен пароль
  if (q.pass !== (P.getProperty("pass") || "barber13")) return { ok: false, error: "Неверный пароль" };
  if (q.action === "login") return { ok: true };
  if (q.action === "list") return { ok: true, list: list.filter(b => b.date >= today()).map(pub) };
  if (q.action === "adminCancel") { const b = list.find(x => x.id === q.id); if (b) sheet().getRange(b.row, 3).setValue("cancelled"); return { ok: !!b }; }
  if (q.action === "saveCfg") { setCfg(q.cfg); return { ok: true }; }
  if (q.action === "setPass") { if (String(q.newPass || "").length < 6) return { ok: false, error: "Короткий пароль" }; P.setProperty("pass", q.newPass); return { ok: true }; }
  if (q.action === "setToken") {
    const r = JSON.parse(UrlFetchApp.fetch(`https://api.telegram.org/bot${q.token}/getMe`, { muteHttpExceptions: true }).getContentText());
    if (!r.ok) return { ok: false, error: "Telegram не принял токен" };
    P.setProperty("token", q.token); P.setProperty("botName", r.result.username); P.deleteProperty("offset");
    tg("deleteWebhook", {});
    return { ok: true, bot: r.result.username };
  }
  return { ok: false, error: "Неизвестное действие" };
}

// ---------- Telegram ----------
function tg(method, body) {
  const t = P.getProperty("token"); if (!t) return null;
  try { return JSON.parse(UrlFetchApp.fetch(`https://api.telegram.org/bot${t}/${method}`, { method: "post", contentType: "application/json", payload: JSON.stringify(body), muteHttpExceptions: true }).getContentText()); }
  catch (e) { return null; }
}
const admins = () => JSON.parse(P.getProperty("admins") || "[]");
function notifyAdmins(text) { admins().forEach(id => tg("sendMessage", { chat_id: id, text })); }

// Раз в минуту: новые сообщения боту и напоминания клиентам
function tick() {
  if (!P.getProperty("token")) return;
  const lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return;
  try { poll(); remind(); } finally { lock.releaseLock(); }
}
function poll() {
  const r = tg("getUpdates", { offset: +(P.getProperty("offset") || 0), timeout: 0, allowed_updates: ["message", "callback_query"] });
  if (!r || !r.ok) return;
  r.result.forEach(u => { P.setProperty("offset", String(u.update_id + 1)); try { u.callback_query ? onButton(u.callback_query) : u.message && onText(u.message); } catch (e) {} });
}
function onText(m) {
  const chat = String(m.chat.id), text = String(m.text || "").trim(), isAdmin = admins().includes(chat);
  const say = (t, kb) => tg("sendMessage", Object.assign({ chat_id: chat, text: t }, kb ? { reply_markup: { inline_keyboard: kb } } : {}));
  let mt;
  if ((mt = text.match(/^\/start\s+(\w+)/))) {
    const b = rows().find(x => x.id === mt[1]);
    if (!b) return say("Запись не нашлась. Если вы записывались на сайте, напишите мастеру.");
    sheet().getRange(b.row, 16).setValue(chat);
    return say(`Готово! Запись: ${nice(b.date)}, ${hm(b.start)}, ${b.masterName}. Напомню за день и за 2 часа.`);
  }
  if ((mt = text.match(/^\/admin\s+(.+)/))) {
    if (mt[1].trim() !== (P.getProperty("pass") || "barber13")) return say("Пароль не подошёл.");
    const a = admins(); if (!a.includes(chat)) { a.push(chat); P.setProperty("admins", JSON.stringify(a)); }
    return say("Готово, сюда будут приходить записи, переносы и отмены.\n\n/записи: записи на сегодня и завтра\n/расписание: выходной или другие часы на любой день");
  }
  if (isAdmin && /^\/(записи|zapisi)/i.test(text)) {
    const t = today(), tm = Utilities.formatDate(new Date(Date.now() + 864e5), TZ, "yyyy-MM-dd");
    const l = rows().filter(b => b.status !== "cancelled" && (b.date === t || b.date === tm)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    return say(l.length ? l.map(b => `${nice(b.date)}, ${hm(b.start)}, ${b.masterName}: ${b.svc.join(", ")}. ${b.name}, ${b.phone}`).join("\n") : "На сегодня и завтра записей нет.");
  }
  if (isAdmin && /^\/(расписание|raspisanie|schedule)/i.test(text)) return say("На какой день поменять расписание?", dayButtons());
  if (/^\/start/.test(text)) return say("Здравствуйте! Это бот барбершопа BARBER 13. Записаться можно на сайте, а здесь я напомню о визите.");
  if (!isAdmin) return say("Я умею только напоминать о записи. Записаться, перенести или отменить можно на сайте.");
  return say("Команды: /записи, /расписание");
}
function dayButtons() {
  const kb = [];
  for (let i = 0; i < 14; i += 2) kb.push([0, 1].map(k => { const d = Utilities.formatDate(new Date(Date.now() + (i + k) * 864e5), TZ, "yyyy-MM-dd"); return { text: (i + k === 0 ? "Сегодня, " : i + k === 1 ? "Завтра, " : "") + nice(d), callback_data: "d|" + d }; }));
  return kb;
}
function onButton(c) {
  const chat = String(c.message.chat.id), [kind, d, mid, val] = c.data.split("|");
  tg("answerCallbackQuery", { callback_query_id: c.id });
  if (!admins().includes(chat)) return;
  const edit = (text, kb) => tg("editMessageText", Object.assign({ chat_id: chat, message_id: c.message.message_id, text }, kb ? { reply_markup: { inline_keyboard: kb } } : {}));
  const cfg = getCfg(), masters = cfg.masters || [];
  if (kind === "d") return edit(`${nice(d)}. Для кого?`, [[{ text: "Все мастера", callback_data: `m|${d}|all` }], ...masters.map(m => [{ text: m.name, callback_data: `m|${d}|${m.id}` }])]);
  if (kind === "m") return edit(`${nice(d)}, ${mid === "all" ? "все мастера" : (masters.find(m => m.id === mid) || {}).name}. Как работаем?`, [
    [{ text: "Выходной", callback_data: `s|${d}|${mid}|off` }, { text: "Как обычно", callback_data: `s|${d}|${mid}|reset` }],
    [{ text: "10:00-15:00", callback_data: `s|${d}|${mid}|600-900` }, { text: "15:00-21:00", callback_data: `s|${d}|${mid}|900-1260` }],
    [{ text: "12:00-21:00", callback_data: `s|${d}|${mid}|720-1260` }, { text: "10:00-18:00", callback_data: `s|${d}|${mid}|600-1080` }]]);
  if (kind === "s") {
    cfg.exceptions = (cfg.exceptions || []).filter(x => !(x.date === d && x.master === mid));
    if (val === "off") cfg.exceptions.push({ date: d, master: mid, off: true });
    else if (val !== "reset") { const [a, b] = val.split("-").map(Number); cfg.exceptions.push({ date: d, master: mid, from: a, to: b }); }
    setCfg(cfg);
    const who = mid === "all" ? "все мастера" : (masters.find(m => m.id === mid) || {}).name;
    return edit(`Готово: ${nice(d)}, ${who}: ${val === "off" ? "выходной" : val === "reset" ? "как обычно" : val.split("-").map(Number).map(hm).join("-")}. На сайте уже обновилось.\n\nЕщё день: /расписание`);
  }
}
function remind() {
  const now = Date.now();
  rows().forEach(b => {
    if (!b.chat || b.status === "cancelled") return;
    const left = at(b) - now;
    if (left <= 0) return;
    if (!b.r24 && left <= 24 * 36e5 && left > 3 * 36e5) { tg("sendMessage", { chat_id: b.chat, text: `Напоминаем: завтра ${hm(b.start)} вы записаны в BARBER 13, ${b.masterName}. Юбилейная, 13. Если планы поменялись, перенести или отменить можно на сайте.` }); sheet().getRange(b.row, 17).setValue("да"); }
    if (!b.r2 && left <= 2 * 36e5) { tg("sendMessage", { chat_id: b.chat, text: `Через 2 часа, в ${hm(b.start)}, ждём вас в BARBER 13, Юбилейная, 13.` }); sheet().getRange(b.row, 18).setValue("да"); }
  });
}
