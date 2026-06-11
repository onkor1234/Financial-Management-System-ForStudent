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

$hasProfileImage = array_key_exists('profile_image', $body);
if (!$hasProfileImage) {
    jsonError('profile_image is required');
}

$image = $body['profile_image'];

if (!is_string($image) && $image !== null) {
    jsonError('profile_image must be a string or null');
}

// Allow clearing image with null, empty string, or null-string
if ($image === null || trim((string)$image) === '' || $image === 'null') {
    $image = null;
}

$pdo->prepare("UPDATE `users` SET profile_image = ? WHERE id = ?")
    ->execute([$image, $userId]);

$user = $pdo->prepare("SELECT u.*, d.name AS department_name FROM `users` u LEFT JOIN `departments` d ON d.id = u.department_id WHERE u.id = ?");
$user->execute([$userId]);
jsonResponse(formatUser($user->fetch()));
