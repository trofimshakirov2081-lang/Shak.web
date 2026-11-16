// Создаёт admin/config.js: где лежит сайт и зашифрованный паролем ключ GitHub.
// node tools/gh-key.mjs <owner> <repo> <branch> <ключ GitHub> <пароль админки> [адрес API для теста]
// Ключ: GitHub, Settings, Developer settings, Fine-grained tokens, доступ только к этому репозиторию, Contents: Read and write.
import fs from "node:fs"; import path from "node:path";
const [owner, repo, branch, token, password, api] = process.argv.slice(2);
if (!password) { console.log("node tools/gh-key.mjs <owner> <repo> <branch> <ключ> <пароль> [api]"); process.exit(1); }
const ITER = 250000, enc = new TextEncoder(), b64 = (b) => Buffer.from(b).toString("base64");
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(token));
const cfg = { owner, repo, branch, iter: ITER, enc: { salt: b64(salt), iv: b64(iv), ct: b64(ct) } };
if (api) cfg.api = api;
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../admin/config.js");
fs.writeFileSync(out, "/* Настройки админки: где лежит сайт. Ключ зашифрован паролем владельца. */\nwindow.GH_CFG = " + JSON.stringify(cfg, null, 2) + ";\n");
console.log("Готово:", out);
