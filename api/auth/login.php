<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body     = getBody();
$username = trim($body['username'] ?? '');
$password = $body['password'] ?? '';

if (!$username || !$password) {
    jsonError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
}

$stmt = $pdo->prepare("SELECT * FROM `users` WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    jsonError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
}

$_SESSION['user_id']   = $user['id'];
$_SESSION['user_role'] = $user['role'];

jsonResponse(formatUser($user));
