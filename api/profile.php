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

$image = $body['profile_image'] ?? null;

if ($image === null) {
    jsonError('profile_image is required');
}

// Allow clearing image with empty string or null-string
if ($image === '' || $image === 'null') {
    $image = null;
}

$pdo->prepare("UPDATE `users` SET profile_image = ? WHERE id = ?")
    ->execute([$image, $userId]);

$user = $pdo->prepare("SELECT * FROM `users` WHERE id = ?");
$user->execute([$userId]);
jsonResponse(formatUser($user->fetch()));
