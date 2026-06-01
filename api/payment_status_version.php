<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$requestId = (int)($_GET['id'] ?? 0);
if (!$requestId) {
    jsonError('Missing id');
}

// Confirm the request exists (separate query — cheap, returns 404 if deleted)
$exists = $pdo->prepare("SELECT 1 FROM `payment_requests` WHERE id = ?");
$exists->execute([$requestId]);
if (!$exists->fetchColumn()) {
    jsonError('Not found', 404);
}

// Lightweight version: max(updated_at) + count + paid_count is enough to
// detect any change to this request's payments — including row deletion.
$stmt = $pdo->prepare(
    "SELECT
        COALESCE(UNIX_TIMESTAMP(MAX(updated_at)), 0) AS max_ts,
        COUNT(*)                                     AS row_count,
        COALESCE(SUM(is_paid), 0)                    AS paid_count
     FROM `payments`
     WHERE request_id = ?"
);
$stmt->execute([$requestId]);
$row = $stmt->fetch();

jsonResponse([
    'version'    => sprintf('%d-%d-%d', (int)$row['max_ts'], (int)$row['row_count'], (int)$row['paid_count']),
    'updated_at' => (int)$row['max_ts'],
]);
