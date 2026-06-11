<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

// ไม่ได้ login — return null (200) แทน 401 เพื่อไม่ให้ browser log error
if (empty($_SESSION['user_id'])) {
    jsonResponse(null);
}

$stmt = $pdo->prepare("SELECT u.*, d.name AS department_name FROM `users` u LEFT JOIN `departments` d ON d.id = u.department_id WHERE u.id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    session_destroy();
    jsonResponse(null);
}

jsonResponse(formatUser($user));
