<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'PUT' && $method !== 'POST') {
    jsonError('Method not allowed', 405);
}

$session = requireAuth();
$userId  = $session['user_id'];
$body    = getBody();

$sets   = [];
$params = [];

if (array_key_exists('profile_image', $body)) {
    $image = $body['profile_image'];
    if (!is_string($image) && $image !== null) {
        jsonError('profile_image must be a string or null');
    }
    if ($image === null || trim((string)$image) === '' || $image === 'null') {
        $image = null;
    }
    $sets[]   = 'profile_image = ?';
    $params[] = $image;
}

if (array_key_exists('signature', $body)) {
    $sig = $body['signature'];
    if (!is_string($sig) && $sig !== null) {
        jsonError('signature must be a string or null');
    }
    if ($sig === null || trim((string)$sig) === '' || $sig === 'null') {
        $sig = null;
    }
    $sets[]   = 'signature = ?';
    $params[] = $sig;
}

if (empty($sets)) {
    jsonError('profile_image or signature is required');
}

$params[] = $userId;
$pdo->prepare("UPDATE `users` SET " . implode(', ', $sets) . " WHERE id = ?")
    ->execute($params);

$stmt = $pdo->prepare(
    "SELECT u.*, d.name AS department_name FROM `users` u
     LEFT JOIN `departments` d ON d.id = u.department_id WHERE u.id = ?"
);
$stmt->execute([$userId]);
jsonResponse(formatUser($stmt->fetch()));
