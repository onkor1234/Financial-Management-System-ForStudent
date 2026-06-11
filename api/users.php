<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handleCreate($pdo);
        break;
    case 'PUT':
        handleUpdate($pdo);
        break;
    case 'DELETE':
        handleDelete($pdo);
        break;
    default:
        jsonError('Method not allowed', 405);
}

function handleGet(PDO $pdo): void
{
    requireAdmin();
    $rows = $pdo->query(
        "SELECT u.*, d.name AS department_name
         FROM `users` u
         LEFT JOIN `departments` d ON d.id = u.department_id
         ORDER BY u.id"
    )->fetchAll();
    jsonResponse(array_map('formatUser', $rows));
}

function handleCreate(PDO $pdo): void
{
    requireAdmin();
    $body     = getBody();
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';
    $name     = trim($body['name'] ?? '');
    $sid      = trim($body['student_id'] ?? '') ?: null;
    $role     = $body['role'] ?? 'operation';
    $pages    = $body['allowed_pages'] ?? null;
    $deptId   = isset($body['department_id']) ? ((int)$body['department_id'] ?: null) : null;

    if (!$username || !$password || !$name) {
        jsonError('ชื่อผู้ใช้, รหัสผ่าน และชื่อ-นามสกุล จำเป็นต้องกรอก');
    }
    if (!in_array($role, ['admin', 'operation'], true)) {
        jsonError('บทบาทไม่ถูกต้อง');
    }

    $stmt = $pdo->prepare(
        "INSERT INTO `users` (username, password_hash, name, student_id, role, allowed_pages, department_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    try {
        $stmt->execute([
            $username,
            password_hash($password, PASSWORD_BCRYPT),
            $name,
            $sid,
            $role,
            $pages !== null ? json_encode($pages) : null,
            $deptId,
        ]);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) {
            jsonError('ชื่อผู้ใช้นี้มีอยู่แล้ว', 409);
        }
        jsonError('เกิดข้อผิดพลาด', 500);
    }

    $new = $pdo->prepare(
        "SELECT u.*, d.name AS department_name
         FROM `users` u
         LEFT JOIN `departments` d ON d.id = u.department_id
         WHERE u.id = ?"
    );
    $new->execute([(int)$pdo->lastInsertId()]);
    jsonResponse(formatUser($new->fetch()), 201);
}

function handleUpdate(PDO $pdo): void
{
    requireAdmin();
    $id   = (int)($_GET['id'] ?? 0);
    $body = getBody();

    if (!$id) jsonError('Missing id');

    $stmt = $pdo->prepare(
        "SELECT u.*, d.name AS department_name
         FROM `users` u
         LEFT JOIN `departments` d ON d.id = u.department_id
         WHERE u.id = ?"
    );
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) jsonError('User not found', 404);

    $username = trim($body['username'] ?? $user['username']);
    $name     = trim($body['name']     ?? $user['name']);
    $sid      = array_key_exists('student_id', $body)
                    ? (trim($body['student_id']) ?: null)
                    : $user['student_id'];
    $role     = $body['role']          ?? $user['role'];
    $pages    = array_key_exists('allowed_pages', $body) ? $body['allowed_pages'] : null;
    $password = $body['password'] ?? '';
    $deptId   = array_key_exists('department_id', $body)
                    ? ((int)($body['department_id'] ?? 0) ?: null)
                    : ($user['department_id'] ?? null);

    if (!in_array($role, ['admin', 'operation'], true)) {
        jsonError('บทบาทไม่ถูกต้อง');
    }

    if ($password) {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $upd  = $pdo->prepare(
            "UPDATE `users` SET username=?, password_hash=?, name=?, student_id=?, role=?, allowed_pages=?, department_id=? WHERE id=?"
        );
        $upd->execute([$username, $hash, $name, $sid, $role,
            $pages !== null ? json_encode($pages) : $user['allowed_pages'], $deptId, $id]);
    } else {
        $upd = $pdo->prepare(
            "UPDATE `users` SET username=?, name=?, student_id=?, role=?, allowed_pages=?, department_id=? WHERE id=?"
        );
        $upd->execute([$username, $name, $sid, $role,
            $pages !== null ? json_encode($pages) : $user['allowed_pages'], $deptId, $id]);
    }

    $updated = $pdo->prepare(
        "SELECT u.*, d.name AS department_name
         FROM `users` u
         LEFT JOIN `departments` d ON d.id = u.department_id
         WHERE u.id = ?"
    );
    $updated->execute([$id]);
    jsonResponse(formatUser($updated->fetch()));
}

function handleDelete(PDO $pdo): void
{
    requireAdmin();
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonError('Missing id');

    $sess = requireAdmin();
    if ($id === $sess['user_id']) {
        jsonError('ไม่สามารถลบบัญชีของตัวเองได้');
    }

    $pdo->prepare("DELETE FROM `users` WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}
