/* Хранение сайта АлтынНур в GitHub: без своего сервера и базы.
   Тексты лежат в assets/data.js, фото в ph/, публикация = одна правка (коммит) в репозитории,
   GitHub Pages сам обновляет сайт примерно за минуту.
   Ключ доступа к GitHub хранится в admin/config.js зашифрованным, открывается паролем владельца. */
(function () {
  "use strict";
  const C = window.GH_CFG;
  if (!C) return;
  const API = (C.api || "https://api.github.com").replace(/\/$/, "");
  let ITER = C.iter || 250000;
  const NEW_ITER = 600000; // новые пароли шифруются сильнее (рекомендация OWASP для PBKDF2-SHA256)
  const TKEY = "altyn-gh-token", EKEY = "altyn-gh-token-e", DAYS = 30;
  let TOKEN = null;

  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (buf) => { let s = ""; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const utf8b64 = (str) => b64(enc.encode(str));

  async function keyFrom(password, salt, iter) {
    const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter || ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function encryptToken(token, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFrom(password, salt, NEW_ITER), enc.encode(token));
    return { salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }
  async function decryptToken(password) {
    try {
      const k = await keyFrom(password, unb64(C.enc.salt));
      return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(C.enc.iv) }, k, unb64(C.enc.ct)));
    } catch (e) { throw new Error("Неверный пароль"); }
  }

  async function gh(path, opt = {}) {
    const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (TOKEN) headers.Authorization = "Bearer " + TOKEN;
    if (opt.body) headers["Content-Type"] = "application/json";
    let res;
    try { res = await fetch(API + path, { method: opt.method || "GET", headers, body: opt.body ? JSON.stringify(opt.body) : undefined, cache: "no-store" }); }
    catch (e) { throw new Error("Нет связи. Проверьте интернет"); }
    if (res.status === 401) { forget(); throw new Error("Ключ доступа не действует. Напишите Трофиму"); }
    if (!res.ok) { let m = ""; try { m = (await res.json()).message; } catch (e) {} const er = new Error("GitHub: " + (m || res.status)); er.status = res.status; throw er; }
    return res.status === 204 ? null : res.json();
  }
  const repo = () => `/repos/${C.owner}/${C.repo}`;
  const branch = () => C.branch || "main";

  /* «Запомнить»: ключ GitHub не лежит в браузере открытым текстом. Он шифруется ключом устройства,
     который создаётся в IndexedDB как неизвлекаемый (его нельзя прочитать, только использовать), и живёт 30 дней.
     Это защищает от простого чтения localStorage. От активного вредного скрипта на том же адресе защищает только свой домен. */
  function idbKey() {
    return new Promise((ok, bad) => { const rq = indexedDB.open("altyn-admin", 1); rq.onupgradeneeded = () => rq.result.createObjectStore("k");
      rq.onerror = () => bad(rq.error); rq.onsuccess = () => { const db = rq.result, g = db.transaction("k").objectStore("k").get("dev");
        g.onerror = () => bad(g.error); g.onsuccess = async () => { if (g.result) return ok(g.result);
          try { const k = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); const t = db.transaction("k", "readwrite"); t.objectStore("k").put(k, "dev"); t.oncomplete = () => ok(k); t.onerror = () => bad(t.error); } catch (e) { bad(e); } }; }; });
  }
  async function seal(token) { const k = await idbKey(), iv = crypto.getRandomValues(new Uint8Array(12)); return JSON.stringify({ iv: b64(iv), ct: b64(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, enc.encode(token))), exp: Date.now() + DAYS * 864e5 }); }
  async function unseal(s) { const o = JSON.parse(s); if (!o || !o.exp || o.exp < Date.now()) return null; const k = await idbKey(); return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(o.iv) }, k, unb64(o.ct))); }
  async function remember(token, keep) { TOKEN = token;
    try { localStorage.removeItem(TKEY); sessionStorage.removeItem(TKEY); const sealed = await seal(token); (keep ? localStorage : sessionStorage).setItem(EKEY, sealed); (keep ? sessionStorage : localStorage).removeItem(EKEY); }
    catch (e) { try { sessionStorage.setItem(TKEY, token); } catch (e2) {} } }
  function forget() { TOKEN = null; try { [TKEY, EKEY].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); }); } catch (e) {} }
  async function restore() {
    try {
      // старый формат: ключ открытым текстом. Шифруем и стираем открытую копию
      const plainL = localStorage.getItem(TKEY), plainS = sessionStorage.getItem(TKEY);
      if (plainL || plainS) { await remember(plainL || plainS, !!plainL); return !!TOKEN; }
      const s = localStorage.getItem(EKEY) || sessionStorage.getItem(EKEY); if (!s) return false;
      TOKEN = await unseal(s); if (!TOKEN) forget(); return !!TOKEN;
    } catch (e) { forget(); return false; }
  }

  async function login(password, keep) {
    const t = await decryptToken(password);
    TOKEN = t; await gh(repo()); await remember(t, keep);
  }

  async function getText(path, ref) {
    const j = await gh(`${repo()}/contents/${path}?ref=${encodeURIComponent(ref || branch())}`);
    return dec.decode(unb64(j.content.replace(/\s/g, "")));
  }
  function parseSite(code) { const w = {}; new Function("window", code)(w); if (!w.SITE) throw new Error("Не удалось прочитать данные сайта"); return w.SITE; }
  const siteText = (S) => "/* Данные сайта АлтынНур. Меняются в админке (/admin/), руками не править. */\nwindow.SITE = " + JSON.stringify(S, null, 2) + ";\n";

  /* одна правка из нескольких файлов: text = строка, bin = Uint8Array */
  async function commit(files, message) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ref = await gh(`${repo()}/git/ref/heads/${branch()}`);
      const head = await gh(`${repo()}/git/commits/${ref.object.sha}`);
      const tree = [];
      for (const f of files) {
        if (f.bin) { const b = await gh(`${repo()}/git/blobs`, { method: "POST", body: { content: b64(f.bin), encoding: "base64" } }); tree.push({ path: f.path, mode: "100644", type: "blob", sha: b.sha }); }
        else tree.push({ path: f.path, mode: "100644", type: "blob", content: f.text });
      }
      const t = await gh(`${repo()}/git/trees`, { method: "POST", body: { base_tree: head.tree.sha, tree } });
      const c = await gh(`${repo()}/git/commits`, { method: "POST", body: { message, tree: t.sha, parents: [ref.object.sha] } });
      try { await gh(`${repo()}/git/refs/heads/${branch()}`, { method: "PATCH", body: { sha: c.sha } }); return c; }
      catch (e) { if (e.status !== 422 || attempt) throw e; }
    }
  }

  async function loadSite(ref) { return parseSite(await getText("assets/data.js", ref)); }
  async function publish(S) {
    S.mode = "static";
    const files = [{ path: "assets/data.js", text: siteText(S) }];
    if (window.ALTYN_PAGES) for (const p of window.ALTYN_PAGES(S)) files.push({ path: p.path, text: p.html });
    return commit(files, "Публикация из админки");
  }
  async function history() {
    const j = await gh(`${repo()}/commits?path=assets/data.js&sha=${branch()}&per_page=30`);
    return j.map((c) => ({ sha: c.sha, date: c.commit.author.date, msg: c.commit.message }));
  }

  /* фото: уменьшаем в браузере до 640, 1280 и 1600 px и сохраняем рядом с остальными */
  async function toBin(img, w) {
    const k = Math.min(1, w / img.naturalWidth), cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob((b) => (b && b.type === "image/webp" ? r(b) : cv.toBlob(r, "image/jpeg", 0.84)), "image/webp", 0.82));
    return { bin: new Uint8Array(await blob.arrayBuffer()), url: URL.createObjectURL(blob) };
  }
  async function uploadPhoto(file) {
    if (file.size > 25e6) throw new Error("Фото больше 25 МБ, выберите поменьше");
    const img = new Image(); img.src = URL.createObjectURL(file);
    try { await img.decode(); } catch (e) { throw new Error("Не получилось открыть фото. Попробуйте JPG или PNG"); }
    const name = "ph/up-" + Date.now().toString(36), sizes = [640, 1280, 1600], files = [], urls = {};
    for (const w of sizes) { const r = await toBin(img, w); files.push({ path: `${name}-${w}.webp`, bin: r.bin }); urls[w] = r.url; }
    await commit(files, "Фото из админки");
    return { src: name, preview: urls[640] };
  }

  /* видео: файл как есть (до 30 МБ), обложка из кадра на 1-й секунде в трёх размерах */
  async function uploadVideo(file) {
    if (file.size > 30e6) throw new Error("Видео больше 30 МБ. Обрежьте его до 10-15 секунд в «Фото» на телефоне и попробуйте снова");
    const url = URL.createObjectURL(file), v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = () => bad(new Error("Не получилось открыть видео. Попробуйте MP4 или MOV с iPhone")); });
    await new Promise((ok) => { v.onseeked = ok; v.currentTime = Math.min(1, (v.duration || 2) / 2); });
    const img = document.createElement("canvas"); img.width = v.videoWidth; img.height = v.videoHeight; img.getContext("2d").drawImage(v, 0, 0);
    const pic = new Image(); pic.src = img.toDataURL("image/jpeg", 0.9); await pic.decode();
    const name = "ph/vid-" + Date.now().toString(36), ext = /quicktime|mov/i.test(file.type + file.name) ? "mov" : "mp4", files = [], urls = {};
    for (const w of [640, 1280, 1600]) { const r = await toBin(pic, w); files.push({ path: `${name}-${w}.webp`, bin: r.bin }); urls[w] = r.url; }
    files.push({ path: `${name}.${ext}`, bin: new Uint8Array(await file.arrayBuffer()) });
    await commit(files, "Видео из админки");
    return { src: name, video: `${name}.${ext}`, preview: urls[640] };
  }

  // пароль защищает ключ, который лежит в открытом репозитории: его можно перебирать без ограничений, поэтому нужен длинный
  function weak(pw) { pw = pw || ""; if (pw.length < 12) return "Новый пароль: не короче 12 символов. Удобно из 3-4 слов через дефис";
    if (/^(.)\1+$/.test(pw) || /^\d+$/.test(pw) || /^(qwerty|12345|password|пароль|altyn|алтын)/i.test(pw)) return "Пароль слишком простой. Возьмите 3-4 разных слова через дефис и цифры";
    if (new Set(pw.toLowerCase()).size < 6) return "В пароле слишком мало разных символов"; return ""; }
  async function changePassword(oldPw, newPw) {
    const w = weak(newPw); if (w) throw new Error(w);
    const t = await decryptToken(oldPw);
    const e = await encryptToken(t, newPw);
    const cfg = Object.assign({}, C, { enc: e, iter: NEW_ITER });
    await commit([{ path: "admin/config.js", text: "/* Настройки админки: где лежит сайт. Ключ зашифрован паролем владельца. */\nwindow.GH_CFG = " + JSON.stringify(cfg, null, 2) + ";\n" }], "Смена пароля админки");
    C.enc = e; C.iter = NEW_ITER; ITER = NEW_ITER;
  }

  window.GH = { weak, login, restore, forget, loadSite, publish, history, uploadPhoto, uploadVideo, changePassword, encryptToken, siteText, parseSite };
})();
