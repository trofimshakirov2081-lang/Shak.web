<?php
/* АлтынНур: общие функции сервера. Работает на любом хостинге с PHP 8 и MySQL (или SQLite для проверки). */
declare(strict_types=1);

const ROOT = __DIR__ . '/..';            // корень сайта
const CONFIG = __DIR__ . '/config.php';  // создаётся установщиком, в репозиторий не попадает

function cfg(): ?array {
  static $c = false;
  if ($c === false) $c = is_file(CONFIG) ? require CONFIG : null;
  return $c;
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $c = cfg();
  if (!$c) fail(503, 'Сайт ещё не установлен');
  $pdo = new PDO($c['dsn'], $c['user'] ?? null, $c['pass'] ?? null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  if (is_mysql()) $pdo->exec("SET NAMES utf8mb4");
  return $pdo;
}
function is_mysql(): bool { return str_starts_with(cfg()['dsn'] ?? '', 'mysql:'); }

function schema(PDO $pdo, bool $mysql): void {
  $ai = $mysql ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  $long = $mysql ? 'MEDIUMTEXT' : 'TEXT';
  $tail = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
  $pdo->exec("CREATE TABLE IF NOT EXISTS an_users (id $ai, login VARCHAR(64) NOT NULL UNIQUE, pass VARCHAR(255) NOT NULL, created_at VARCHAR(19) NOT NULL)$tail");
  $pdo->exec("CREATE TABLE IF NOT EXISTS an_store (k VARCHAR(32) PRIMARY KEY, v $long NOT NULL, updated_at VARCHAR(19) NOT NULL)$tail");
  $pdo->exec("CREATE TABLE IF NOT EXISTS an_versions (id $ai, v $long NOT NULL, created_at VARCHAR(19) NOT NULL, author VARCHAR(64) NOT NULL)$tail");
  $pdo->exec("CREATE TABLE IF NOT EXISTS an_leads (id $ai, created_at VARCHAR(19) NOT NULL, name VARCHAR(80) NOT NULL, phone VARCHAR(20) NOT NULL, course VARCHAR(120) NOT NULL DEFAULT '', way VARCHAR(20) NOT NULL DEFAULT '', note TEXT, extra TEXT, page VARCHAR(200) NOT NULL DEFAULT '', status VARCHAR(16) NOT NULL DEFAULT 'new', admin_note TEXT)$tail");
  $pdo->exec("CREATE TABLE IF NOT EXISTS an_hits (id $ai, kind VARCHAR(8) NOT NULL, who CHAR(64) NOT NULL, at INT NOT NULL)$tail");
}

/* ---------- ответы ---------- */
function out($data, int $code = 200): never {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function fail(int $code, string $msg): never { out(['ok' => false, 'error' => $msg], $code); }
function body(): array {
  $raw = file_get_contents('php://input') ?: '';
  if (strlen($raw) > 2_000_000) fail(413, 'Слишком большой запрос');
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}
function now(): string { return gmdate('Y-m-d H:i:s'); }

/* ---------- вход и защита ---------- */
function session_boot(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
  session_name('an_sid');
  session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
  session_start();
}
function user(): ?string { session_boot(); return $_SESSION['login'] ?? null; }
function need_user(): string {
  $u = user();
  if (!$u) fail(401, 'Нужно войти');
  if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $t = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!$t || !hash_equals($_SESSION['csrf'] ?? '', $t)) fail(403, 'Сессия устарела, обновите страницу');
  }
  return $u;
}
function who(): string { return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . (cfg()['salt'] ?? '')); }
/* не больше $max попыток за $sec секунд с одного адреса (сам адрес не хранится, только его хеш) */
function throttle(string $kind, int $max, int $sec): void {
  $pdo = db(); $t = time();
  $pdo->prepare("DELETE FROM an_hits WHERE at < ?")->execute([$t - 86400]);
  $st = $pdo->prepare("SELECT COUNT(*) FROM an_hits WHERE kind = ? AND who = ? AND at > ?");
  $st->execute([$kind, who(), $t - $sec]);
  if ((int)$st->fetchColumn() >= $max) fail(429, 'Слишком много попыток. Попробуйте позже');
}
function hit(string $kind): void { db()->prepare("INSERT INTO an_hits (kind, who, at) VALUES (?, ?, ?)")->execute([$kind, who(), time()]); }

/* ---------- хранилище ---------- */
function store_get(string $k) {
  $st = db()->prepare("SELECT v FROM an_store WHERE k = ?"); $st->execute([$k]);
  $v = $st->fetchColumn();
  return $v === false ? null : json_decode((string)$v, true);
}
function store_set(string $k, $v): void {
  $pdo = db(); $j = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $st = $pdo->prepare("UPDATE an_store SET v = ?, updated_at = ? WHERE k = ?"); $st->execute([$j, now(), $k]);
  if (!$st->rowCount()) {
    $ex = $pdo->prepare("SELECT 1 FROM an_store WHERE k = ?"); $ex->execute([$k]);
    if (!$ex->fetchColumn()) $pdo->prepare("INSERT INTO an_store (k, v, updated_at) VALUES (?, ?, ?)")->execute([$k, $j, now()]);
  }
}

/* ---------- проверка данных сайта перед сохранением ---------- */
function clean_site($s): array {
  if (!is_array($s) || !isset($s['org'], $s['courses'], $s['hero']) || !is_array($s['courses'])) fail(422, 'Данные сайта повреждены, сохранение отменено');
  $seen = [];
  foreach ($s['courses'] as $i => &$c) {
    if (!is_array($c)) fail(422, 'Курс заполнен неверно');
    $c['name'] = trim((string)($c['name'] ?? ''));
    if ($c['name'] === '') fail(422, 'У курса №' . ($i + 1) . ' нет названия');
    $slug = strtolower(trim((string)($c['slug'] ?? '')));
    $slug = preg_replace('~[^a-z0-9-]+~', '-', $slug); $slug = trim((string)$slug, '-');
    if ($slug === '') $slug = 'kurs-' . ($i + 1);
    while (isset($seen[$slug])) $slug .= '-2';
    $seen[$slug] = 1; $c['slug'] = $slug;
    $c['price'] = max(0, (int)($c['price'] ?? 0));
  }
  unset($c);
  $s['featured'] = array_values(array_filter((array)($s['featured'] ?? []), fn($x) => isset($seen[$x])));
  return $s;
}

/* ---------- публикация: данные и страницы сайта становятся обычными файлами ---------- */
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function page_html(array $S, string $dir, string $pg, string $title, string $desc, string $extra = '', ?array $ld = null): void {
  $depth = $dir === '' ? 0 : count(explode('/', $dir));
  $r = str_repeat('../', $depth);
  $robots = !empty($S['preview']) ? '<meta name="robots" content="noindex">' : '';
  $og = ($S['hero']['photo'] ?? 'ph/hero-eye') . '-1280.webp';
  $v = substr(md5(json_encode($S)), 0, 8);
  $html = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' . "\n"
    . '<meta name="theme-color" content="#F3EDE4">' . $robots . "\n"
    . '<title>' . h($title) . '</title><meta name="description" content="' . h($desc) . '">' . "\n"
    . '<meta property="og:title" content="' . h($title) . '"><meta property="og:description" content="' . h($desc) . '"><meta property="og:type" content="website"><meta property="og:image" content="' . h($r . $og) . '">' . "\n"
    . '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n"
    . '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Prata&family=Bona+Nova:wght@400;700&family=Ysabeau+Office:wght@400;500;600&family=Finlandica:wght@400;500;600&family=Arsenal:wght@400;700&display=swap" rel="stylesheet">' . "\n"
    . '<link rel="stylesheet" href="' . $r . 'assets/site.css"></head><body data-page="' . $pg . '" data-root="' . $r . '"' . $extra . '><main id="main"></main>'
    . ($ld ? '<script type="application/ld+json">' . json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . '</script>' : '')
    . '<script src="' . $r . 'assets/data.js?v=' . $v . '"></script><script src="' . $r . 'assets/app.js"></script></body></html>' . "\n";
  $path = ROOT . ($dir === '' ? '' : '/' . $dir);
  if (!is_dir($path)) mkdir($path, 0755, true);
  file_put_contents($path . '/index.html', $html, LOCK_EX);
}
function publish_files(array $S): void {
  $o = $S['org']; $name = $o['name'] ?? 'АлтынНур'; $city = $o['city'] ?? ''; $cityIn = $o['cityIn'] ?? $city;
  $js = "/* Опубликовано из админки " . now() . " UTC. Руками не править: изменения делаются в /admin/ */\nwindow.SITE = "
    . json_encode($S, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . ";\n";
  if (file_put_contents(ROOT . '/assets/data.js', $js, LOCK_EX) === false) fail(500, 'Не удалось записать файл сайта. Проверьте права на папку assets');
  $same = array_values(array_filter(array_map(fn($c) => in_array($c['type'] ?? '', ['vk', 'instagram', 'telegram'], true) && !empty($c['on']) && str_starts_with((string)($c['value'] ?? ''), 'http') ? $c['value'] : null, (array)($S['contacts'] ?? []))));
  $org = ['@context' => 'https://schema.org', '@type' => 'EducationalOrganization', 'name' => $name, 'description' => $o['kind'] ?? '', 'telephone' => $o['phone'] ?? '', 'sameAs' => $same,
    'address' => ['@type' => 'PostalAddress', 'addressLocality' => $city, 'addressRegion' => $o['region'] ?? '', 'streetAddress' => $o['address'] ?? '', 'addressCountry' => 'RU'],
    'founder' => ['@type' => 'Person', 'name' => $o['owner'] ?? '']];
  page_html($S, '', 'home', "$name: учебный центр бьюти-профессий в $cityIn", "Обучение бьюти-профессиям в $cityIn: брови и ресницы, ногти, уход за лицом и волосами. Практика с преподавателем.", '', $org);
  $names = implode(', ', array_map(fn($c) => mb_strtolower($c['name']), array_slice($S['courses'], 0, 6)));
  page_html($S, 'courses', 'courses', "Курсы и цены | $name, $city", "Все курсы $name с ценами: $names.");
  $keep = [];
  foreach ($S['courses'] as $c) {
    $keep[$c['slug']] = 1;
    $ld = ['@context' => 'https://schema.org', '@type' => 'Course', 'name' => $c['name'], 'description' => $c['short'] ?? '', 'provider' => ['@type' => 'EducationalOrganization', 'name' => $name],
      'offers' => ['@type' => 'Offer', 'price' => $c['price'], 'priceCurrency' => 'RUB', 'category' => 'Paid']];
    page_html($S, 'courses/' . $c['slug'], 'course', $c['name'] . ": обучение в $cityIn | $name", trim(($c['short'] ?? '') . ' Цена ' . number_format($c['price'], 0, ',', ' ') . " ₽. Учебный центр $name, $city."), ' data-slug="' . h($c['slug']) . '"', $ld);
  }
  // страницы удалённых курсов убираем
  foreach (glob(ROOT . '/courses/*', GLOB_ONLYDIR) ?: [] as $d) {
    if (!isset($keep[basename($d)])) { @unlink($d . '/index.html'); @rmdir($d); }
  }
  page_html($S, 'about', 'about', "Об академии | $name", "Учебный центр бьюти-профессий $name в $cityIn: подход к обучению и преподаватель " . ($o['owner'] ?? '') . '.');
  page_html($S, 'works', 'works', "Работы учениц | $name", "Галерея работ учениц и преподавателя $name.");
  page_html($S, 'training', 'training', "Как проходит обучение | $name", "Как устроено обучение в $name: шаги от выбора направления до результата. Подбор курса за три вопроса.");
  page_html($S, 'faq', 'faq', "Частые вопросы | $name", "Ответы на частые вопросы об обучении в $name: с нуля, практика, материалы, оплата, адрес.");
  page_html($S, 'contacts', 'contacts', "Контакты | $name, $city", "Телефон, мессенджеры и адрес учебного центра $name в $cityIn.");
  page_html($S, 'privacy', 'privacy', "Политика обработки персональных данных | $name", "Политика обработки персональных данных учебного центра $name.");
  // карта сайта для поисковиков
  $base = rtrim((string)(cfg()['base_url'] ?? ''), '/');
  if ($base !== '' && empty($S['preview'])) {
    $urls = ['', 'courses/', 'about/', 'works/', 'training/', 'faq/', 'contacts/'];
    foreach ($S['courses'] as $c) $urls[] = 'courses/' . $c['slug'] . '/';
    $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    foreach ($urls as $u) $xml .= '<url><loc>' . h("$base/$u") . '</loc></url>';
    file_put_contents(ROOT . '/sitemap.xml', $xml . '</urlset>', LOCK_EX);
    file_put_contents(ROOT . '/robots.txt', "User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: $base/sitemap.xml\n", LOCK_EX);
  }
}

/* ---------- уведомление о новой заявке (если настроено) ---------- */
function notify(array $lead): void {
  $n = store_get('notify') ?: [];
  $text = "Новая заявка с сайта АлтынНур\nИмя: {$lead['name']}\nТелефон: {$lead['phone']}"
    . ($lead['course'] ? "\nКурс: {$lead['course']}" : '') . ($lead['way'] ? "\nСвязаться: {$lead['way']}" : '')
    . ($lead['note'] ? "\nКомментарий: {$lead['note']}" : '') . ($lead['extra'] ? "\n{$lead['extra']}" : '');
  if (!empty($n['tg_token']) && !empty($n['tg_chat']) && function_exists('curl_init')) {
    $ch = curl_init('https://api.telegram.org/bot' . $n['tg_token'] . '/sendMessage');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => ['chat_id' => $n['tg_chat'], 'text' => $text], CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6]);
    @curl_exec($ch); @curl_close($ch);
  }
  if (!empty($n['email']) && filter_var($n['email'], FILTER_VALIDATE_EMAIL)) {
    @mail($n['email'], '=?UTF-8?B?' . base64_encode('Новая заявка с сайта') . '?=', $text, "Content-Type: text/plain; charset=utf-8\r\n");
  }
}
