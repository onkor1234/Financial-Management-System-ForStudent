<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Method not allowed', 405);
}

$body      = getBody();
$id        = (int)($_GET['id'] ?? 0);
$requestId = (int)($body['request_id'] ?? 0);
$studentId = (int)($body['student_id'] ?? 0);

if (!$id && (!$requestId || !$studentId)) {
    jsonError('Missing id or request_id/student_id');
}

$stmtById = $pdo->prepare("SELECT * FROM `payments` WHERE id = ?");
$payment  = null;

if ($id) {
    $stmtById->execute([$id]);
    $payment = $stmtById->fetch();
    if (!$payment) jsonError('Payment not found', 404);
} else {
    $stmt = $pdo->prepare(
        "SELECT * FROM `payments` WHERE request_id = ? AND student_id = ? ORDER BY id DESC LIMIT 1"
    );
    $stmt->execute([$requestId, $studentId]);
    $payment = $stmt->fetch();

    if (!$payment) {
        $pdo->prepare(
            "INSERT INTO `payments` (request_id, student_id, is_paid) VALUES (?, ?, 0)"
        )->execute([$requestId, $studentId]);
        $id = (int)$pdo->lastInsertId();

        $stmtById->execute([$id]);
        $payment = $stmtById->fetch();
    } else {
        $id = (int)$payment['id'];
    }
}

$isPaid        = isset($body['is_paid']) ? (bool)$body['is_paid'] : (bool)$payment['is_paid'];
$receiptImage  = array_key_exists('receipt_image', $body)
                    ? $body['receipt_image']
                    : $payment['receipt_image'];
$paidAt = $isPaid
    ? ($payment['paid_at'] ?? date('Y-m-d H:i:s'))
    : null;

// If receipt uploaded, mark as paid automatically
if ($receiptImage && !$isPaid) {
    $isPaid = true;
    $paidAt = date('Y-m-d H:i:s');
}

$pdo->prepare(
    "UPDATE `payments` SET is_paid=?, receipt_image=?, paid_at=? WHERE id=?"
)->execute([(int)$isPaid, $receiptImage, $paidAt, $id]);

$stmtById->execute([$id]);
$updated = $stmtById->fetch();

jsonResponse([
    'id'            => (int)$updated['id'],
    'request_id'    => (int)$updated['request_id'],
    'student_id'    => (int)$updated['student_id'],
    'is_paid'       => (bool)$updated['is_paid'],
    'receipt_image' => $updated['receipt_image'],
    'paid_at'       => $updated['paid_at'],
]);
