<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Method not allowed', 405);
}

$id   = (int)($_GET['id'] ?? 0);
$body = getBody();
if (!$id) jsonError('Missing id');

$stmt = $pdo->prepare("SELECT * FROM `payments` WHERE id = ?");
$stmt->execute([$id]);
$payment = $stmt->fetch();
if (!$payment) jsonError('Payment not found', 404);

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

$stmt->execute([$id]);
$updated = $stmt->fetch();

jsonResponse([
    'id'            => (int)$updated['id'],
    'request_id'    => (int)$updated['request_id'],
    'student_id'    => (int)$updated['student_id'],
    'is_paid'       => (bool)$updated['is_paid'],
    'receipt_image' => $updated['receipt_image'],
    'paid_at'       => $updated['paid_at'],
]);
