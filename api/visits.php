<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ─── Record a visit (public — anyone loading the site) ────────────────────────
if ($method === 'POST') {
    $body = getBody();
    $path = isset($body['path']) ? mb_substr((string)$body['path'], 0, 255) : null;
    $ua   = isset($_SERVER['HTTP_USER_AGENT']) ? mb_substr((string)$_SERVER['HTTP_USER_AGENT'], 0, 255) : null;
    $ip   = $_SERVER['REMOTE_ADDR'] ?? null;

    $stmt = $pdo->prepare("INSERT INTO `site_visits` (path, ip, user_agent) VALUES (?, ?, ?)");
    $stmt->execute([$path, $ip, $ua]);

    jsonResponse(['success' => true]);
}

// ─── Visit statistics (admin only) ────────────────────────────────────────────
if ($method === 'GET') {
    requireAdmin();

    $total  = (int)$pdo->query("SELECT COUNT(*) FROM `site_visits`")->fetchColumn();
    $today  = (int)$pdo->query("SELECT COUNT(*) FROM `site_visits` WHERE DATE(created_at) = CURDATE()")->fetchColumn();
    $unique = (int)$pdo->query("SELECT COUNT(DISTINCT ip) FROM `site_visits`")->fetchColumn();

    $daily = $pdo->query(
        "SELECT DATE(created_at) AS day, COUNT(*) AS count
         FROM `site_visits`
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC"
    )->fetchAll();

    jsonResponse([
        'total'  => $total,
        'today'  => $today,
        'unique' => $unique,
        'daily'  => array_map(fn($r) => ['day' => $r['day'], 'count' => (int)$r['count']], $daily),
    ]);
}

jsonError('Method not allowed', 405);
