<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$session = requireAuth();

$stmt = $pdo->prepare("SELECT * FROM `users` WHERE id = ?");
$stmt->execute([$session['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    session_destroy();
    jsonError('User not found', 404);
}

jsonResponse(formatUser($user));
