<?php
/* АлтынНур: сервер админки и заявок. Один вход: /api/?r=<действие> */
declare(strict_types=1);
require __DIR__ . '/lib.php';

set_exception_handler(function (Throwable $e) {
  error_log('altynnur api: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  fail(500, 'Ошибка на сервере. Попробуйте ещё раз');
});

$r = (string)($_GET['r'] ?? '');
$m = $_SERVER['REQUEST_METHOD'];
$post = function () use ($m) { if ($m !== 'POST') fail(405, 'Нужен POST'); };

switch ($r) {

  /* ---------- состояние ---------- */
  case 'ping':
    $u = cfg() ? user() : null;
    out(['ok' => true, 'installed' => (bool)cfg(), 'user' => $u, 'csrf' => $u ? ($_SESSION['csrf'] ?? null) : null]);

  /* ---------- установка: один раз, потом закрыта ---------- */
  case 'install':
    $post();
    if (cfg()) fail(403, 'Сайт уже установлен');
    $b = body();
    $login = trim((string)($b['login'] ?? '')); $pass = (string)($b['pass'] ?? '');
    if (!preg_match('~^[a-zA-Z0-9_.-]{3,32}$~', $login)) fail(422, 'Логин: 3-32 латинские буквы или цифры');
    if (mb_strlen($pass) < 10) fail(422, 'Пароль должен быть не короче 10 символов');
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    if (($b['driver'] ?? '') === 'sqlite') {
      if (!$local) fail(403, 'SQLite разрешён только для локальной проверки');
      $dsn = 'sqlite:' . __DIR__ . '/data/local.sqlite'; $du = null; $dp = null;
      if (!is_dir(__DIR__ . '/data')) mkdir(__DIR__ . '/data', 0700, true);
    } else {
      $host = trim((string)($b['db_host'] ?? 'localhost')) ?: 'localhost'; $name = trim((string)($b['db_name'] ?? ''));
      if (!preg_match('~^[\w.-]+$~', $host) || !preg_match('~^[\w-]+$~', $name)) fail(422, 'Проверьте адрес и имя базы данных');
      $dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4"; $du = (string)($b['db_user'] ?? ''); $dp = (string)($b['db_pass'] ?? '');
    }
    try { $pdo = new PDO($dsn, $du, $dp, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]); }
    catch (Throwable $e) { fail(422, 'Не удалось подключиться к базе. Проверьте имя базы, пользователя и пароль'); }
    schema($pdo, str_starts_with($dsn, 'mysql:'));
    $base = rtrim(trim((string)($b['base_url'] ?? '')), '/');
    if ($base !== '' && !preg_match('~^https?://[\w.-]+(/[\w./-]*)?$~', $base)) fail(422, 'Адрес сайта должен начинаться с https://');
    $conf = ['dsn' => $dsn, 'user' => $du, 'pass' => $dp, 'salt' => bin2hex(random_bytes(16)), 'base_url' => $base];
    if (file_put_contents(CONFIG, "<?php\n/* Создано установщиком. Не выкладывать в общий доступ. */\nreturn " . var_export($conf, true) . ";\n", LOCK_EX) === false) fail(500, 'Не удалось записать настройки. Проверьте права на папку api');
    @chmod(CONFIG, 0600);
    $pdo->prepare("INSERT INTO an_users (login, pass, created_at) VALUES (?, ?, ?)")->execute([$login, password_hash($pass, PASSWORD_DEFAULT), now()]);
    $seed = json_decode((string)file_get_contents(__DIR__ . '/seed.json'), true);
    $j = json_encode($seed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $pdo->prepare("INSERT INTO an_store (k, v, updated_at) VALUES ('draft', ?, ?)")->execute([$j, now()]);
    out(['ok' => true]);

  /* ---------- вход ---------- */
  case 'login':
    $post(); throttle('login', 6, 900);
    $b = body();
    $st = db()->prepare("SELECT login, pass FROM an_users WHERE login = ?"); $st->execute([trim((string)($b['login'] ?? ''))]);
    $u = $st->fetch();
    if (!$u || !password_verify((string)($b['pass'] ?? ''), $u['pass'])) { hit('login'); fail(401, 'Неверный логин или пароль'); }
    session_boot(); session_regenerate_id(true);
    $_SESSION['login'] = $u['login']; $_SESSION['csrf'] = bin2hex(random_bytes(20));
    out(['ok' => true, 'user' => $u['login'], 'csrf' => $_SESSION['csrf']]);

  case 'logout':
    $post(); need_user();
    $_SESSION = []; session_destroy();
    out(['ok' => true]);

  case 'password':
    $post(); $me = need_user(); $b = body();
    $st = db()->prepare("SELECT pass FROM an_users WHERE login = ?"); $st->execute([$me]);
    if (!password_verify((string)($b['old'] ?? ''), (string)$st->fetchColumn())) fail(422, 'Текущий пароль введён неверно');
    if (mb_strlen((string)($b['new'] ?? '')) < 10) fail(422, 'Новый пароль должен быть не короче 10 символов');
    db()->prepare("UPDATE an_users SET pass = ? WHERE login = ?")->execute([password_hash((string)$b['new'], PASSWORD_DEFAULT), $me]);
    out(['ok' => true]);

  /* ---------- содержимое сайта ---------- */
  case 'draft':
    need_user();
    if ($m === 'GET') {
      $st = db()->query("SELECT k, updated_at FROM an_store WHERE k IN ('draft','published')"); $t = [];
      foreach ($st as $row) $t[$row['k']] = $row['updated_at'];
      out(['ok' => true, 'site' => store_get('draft'), 'draft_at' => $t['draft'] ?? null, 'published_at' => $t['published'] ?? null]);
    }
    $post();
    store_set('draft', clean_site(body()['site'] ?? null));
    out(['ok' => true, 'draft_at' => now()]);

  case 'publish':
    $post(); $me = need_user();
    $b = body();
    $site = clean_site($b['site'] ?? store_get('draft'));
    store_set('draft', $site);
    publish_files($site);
    store_set('published', $site);
    $pdo = db();
    $pdo->prepare("INSERT INTO an_versions (v, created_at, author) VALUES (?, ?, ?)")->execute([json_encode($site, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), now(), $me]);
    $ids = $pdo->query("SELECT id FROM an_versions ORDER BY id DESC LIMIT 30")->fetchAll(PDO::FETCH_COLUMN);
    if (count($ids) === 30) $pdo->prepare("DELETE FROM an_versions WHERE id < ?")->execute([end($ids)]);
    out(['ok' => true, 'published_at' => now()]);

  case 'versions':
    need_user();
    out(['ok' => true, 'items' => db()->query("SELECT id, created_at, author FROM an_versions ORDER BY id DESC LIMIT 30")->fetchAll()]);

  case 'restore':
    $post(); need_user();
    $st = db()->prepare("SELECT v FROM an_versions WHERE id = ?"); $st->execute([(int)(body()['id'] ?? 0)]);
    $v = $st->fetchColumn();
    if ($v === false) fail(404, 'Версия не найдена');
    $site = clean_site(json_decode((string)$v, true));
    store_set('draft', $site);
    out(['ok' => true, 'site' => $site]);

  /* ---------- заявки ---------- */
  case 'lead': // открытый адрес: его вызывает форма на сайте
    $post(); throttle('lead', 5, 600);
    $b = body();
    if (!empty($b['website'])) out(['ok' => true]); // ловушка для роботов
    $name = trim(mb_substr((string)($b['name'] ?? ''), 0, 80));
    $digits = preg_replace('~\D~', '', (string)($b['phone'] ?? ''));
    if (mb_strlen($name) < 2) fail(422, 'Напишите, как к вам обращаться');
    if (!preg_match('~^[78]\d{10}$~', (string)$digits) && !preg_match('~^9\d{9}$~', (string)$digits)) fail(422, 'Проверьте номер телефона');
    if (empty($b['consent'])) fail(422, 'Без согласия мы не можем принять заявку');
    $phone = '+7' . substr((string)$digits, -10);
    $course = '';
    if (!empty($b['course'])) {
      $siteNow = store_get('published') ?: (store_get('draft') ?: []);
      foreach (($siteNow['courses'] ?? []) as $c) if (($c['slug'] ?? '') === $b['course']) $course = $c['name'];
    }
    $lead = ['name' => $name, 'phone' => $phone, 'course' => $course,
      'way' => in_array($b['way'] ?? '', ['WhatsApp', 'Звонок', 'Telegram'], true) ? $b['way'] : '',
      'note' => trim(mb_substr((string)($b['note'] ?? ''), 0, 600)), 'extra' => trim(mb_substr((string)($b['extra'] ?? ''), 0, 600)),
      'page' => mb_substr((string)($b['page'] ?? ''), 0, 200)];
    db()->prepare("INSERT INTO an_leads (created_at, name, phone, course, way, note, extra, page) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      ->execute([now(), $lead['name'], $lead['phone'], $lead['course'], $lead['way'], $lead['note'], $lead['extra'], $lead['page']]);
    hit('lead');
    notify($lead);
    out(['ok' => true]);

  case 'leads':
    need_user();
    $rows = db()->query("SELECT * FROM an_leads ORDER BY id DESC LIMIT 500")->fetchAll();
    if (($_GET['format'] ?? '') === 'csv') {
      header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="zayavki.csv"'); header('Cache-Control: no-store');
      $f = fopen('php://output', 'w'); fwrite($f, "\xEF\xBB\xBF");
      fputcsv($f, ['Дата (UTC)', 'Имя', 'Телефон', 'Курс', 'Связаться', 'Комментарий', 'Дополнительно', 'Статус', 'Заметка'], ';');
      $safe = fn($v) => preg_match('~^[=+\-@\t\r]~', (string)$v) ? "'" . $v : (string)$v; // защита от формул в таблицах
      foreach ($rows as $x) fputcsv($f, array_map($safe, [$x['created_at'], $x['name'], $x['phone'], $x['course'], $x['way'], $x['note'], $x['extra'], $x['status'], $x['admin_note']]), ';');
      exit;
    }
    out(['ok' => true, 'items' => $rows]);

  case 'lead_update':
    $post(); need_user(); $b = body();
    $status = in_array($b['status'] ?? '', ['new', 'work', 'done', 'refuse'], true) ? $b['status'] : 'new';
    db()->prepare("UPDATE an_leads SET status = ?, admin_note = ? WHERE id = ?")->execute([$status, mb_substr((string)($b['admin_note'] ?? ''), 0, 1000), (int)($b['id'] ?? 0)]);
    out(['ok' => true]);

  case 'lead_delete':
    $post(); need_user();
    db()->prepare("DELETE FROM an_leads WHERE id = ?")->execute([(int)(body()['id'] ?? 0)]);
    out(['ok' => true]);

  /* ---------- уведомления ---------- */
  case 'notify':
    need_user();
    if ($m === 'GET') { $n = store_get('notify') ?: []; out(['ok' => true, 'tg_chat' => $n['tg_chat'] ?? '', 'email' => $n['email'] ?? '', 'tg_token_set' => !empty($n['tg_token'])]); }
    $post(); $b = body(); $n = store_get('notify') ?: [];
    $n['tg_chat'] = trim(mb_substr((string)($b['tg_chat'] ?? ''), 0, 40)); $n['email'] = trim(mb_substr((string)($b['email'] ?? ''), 0, 120));
    if (isset($b['tg_token']) && $b['tg_token'] !== '') {
      if (!preg_match('~^\d{6,12}:[\w-]{30,}$~', (string)$b['tg_token'])) fail(422, 'Токен бота выглядит неверно');
      $n['tg_token'] = $b['tg_token'];
    }
    if (!empty($b['tg_token_clear'])) unset($n['tg_token']);
    store_set('notify', $n);
    if (!empty($b['test'])) notify(['name' => 'Проверка', 'phone' => '+70000000000', 'course' => '', 'way' => '', 'note' => 'Это проверочное уведомление из админки', 'extra' => '']);
    out(['ok' => true]);

  /* ---------- фото ---------- */
  case 'upload':
    $post(); need_user();
    $f = $_FILES['file'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) fail(422, 'Файл не загрузился. Возможно, он слишком большой');
    if ($f['size'] > 15_000_000) fail(422, 'Фото больше 15 МБ. Уменьшите его');
    $info = @getimagesize($f['tmp_name']);
    $types = [IMAGETYPE_JPEG => 'imagecreatefromjpeg', IMAGETYPE_PNG => 'imagecreatefrompng', IMAGETYPE_WEBP => 'imagecreatefromwebp'];
    if (!$info || !isset($types[$info[2]])) fail(422, 'Подходят фото JPG, PNG или WebP. Фото с iPhone в формате HEIC сначала сохраните как JPG');
    if (!function_exists('imagewebp')) fail(500, 'На хостинге не включена обработка фото (GD с WebP)');
    if ($info[0] * $info[1] > 50_000_000) fail(422, 'Фото слишком большое по размеру в пикселях');
    $src = @$types[$info[2]]($f['tmp_name']);
    if (!$src) fail(422, 'Не удалось прочитать фото');
    if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) { // фото с телефона бывает повёрнуто
      $o = (int)(@exif_read_data($f['tmp_name'])['Orientation'] ?? 1);
      $deg = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
      if ($deg) $src = imagerotate($src, $deg, 0);
    }
    $w = imagesx($src); $hh = imagesy($src);
    $id = 'ph/u-' . bin2hex(random_bytes(6));
    if (!is_dir(ROOT . '/ph')) mkdir(ROOT . '/ph', 0755, true);
    foreach ([640, 1280, 1600] as $tw) {
      $nw = min($tw, $w); $nh = (int)round($hh * $nw / $w);
      $dst = imagecreatetruecolor($nw, $nh);
      imagealphablending($dst, false); imagesavealpha($dst, true);
      imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $hh);
      if (!imagewebp($dst, ROOT . "/$id-$tw.webp", 80)) fail(500, 'Не удалось сохранить фото. Проверьте права на папку ph');
      imagedestroy($dst);
    }
    out(['ok' => true, 'src' => $id]);

  default:
    fail(404, 'Нет такого действия');
}
