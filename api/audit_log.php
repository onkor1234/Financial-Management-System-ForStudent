<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ─── List recent logs (admin only) ────────────────────────────────────────────
if ($method === 'GET') {
    requireAdmin();

    $limit = isset($_GET['limit']) ? max(1, min(1000, (int)$_GET['limit'])) : 300;

    $rows = $pdo->query(
        "SELECT * FROM `audit_logs` ORDER BY id DESC LIMIT $limit"
    )->fetchAll();

    jsonResponse(array_map(fn($r) => [
        'id'         => (int)$r['id'],
        'user_id'    => $r['user_id'] !== null ? (int)$r['user_id'] : null,
        'username'   => $r['username'],
        'method'     => $r['method'],
        'endpoint'   => $r['endpoint'],
        'detail'     => $r['detail'],
        'ip'         => $r['ip'],
        'created_at' => $r['created_at'],
    ], $rows));
}

// ─── Clear all logs (admin only) ──────────────────────────────────────────────
if ($method === 'DELETE') {
    requireAdmin();
    $pdo->exec("DELETE FROM `audit_logs`");
    jsonResponse(['success' => true]);
}

jsonError('Method not allowed', 405);
