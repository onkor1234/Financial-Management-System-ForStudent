<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

function formatAddition(array $r): array
{
    return [
        'id'          => (int)$r['id'],
        'amount'      => (float)$r['amount'],
        'description' => $r['description'],
        'created_by'  => $r['created_by'] ? (int)$r['created_by'] : null,
        'created_at'  => $r['created_at'],
    ];
}

switch ($method) {
    case 'GET':
        $rows = $pdo->query(
            "SELECT * FROM `budget_additions` ORDER BY created_at DESC"
        )->fetchAll();
        jsonResponse(array_map('formatAddition', $rows));

    case 'POST':
        requireAdmin();
        $session = requireAuth();
        $body    = getBody();
        $amount  = (float)($body['amount']      ?? 0);
        $desc    = trim($body['description'] ?? '');

        if ($amount <= 0) jsonError('จำนวนเงินต้องมากกว่า 0');
        if (!$desc)       jsonError('รายละเอียดจำเป็นต้องกรอก');

        $pdo->prepare(
            "INSERT INTO `budget_additions` (amount, description, created_by) VALUES (?, ?, ?)"
        )->execute([$amount, $desc, $session['user_id']]);

        $id   = (int)$pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM `budget_additions` WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(formatAddition($stmt->fetch()), 201);

    default:
        jsonError('Method not allowed', 405);
}
