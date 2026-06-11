<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $rows = $pdo->query("SELECT * FROM `departments` ORDER BY id")->fetchAll();
        jsonResponse(array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name']], $rows));

    case 'POST':
        requireAdmin();
        $name = trim(getBody()['name'] ?? '');
        if (!$name) jsonError('ชื่อตำแหน่งจำเป็นต้องกรอก');
        $pdo->prepare("INSERT INTO `departments` (name) VALUES (?)")->execute([$name]);
        $id = (int)$pdo->lastInsertId();
        jsonResponse(['id' => $id, 'name' => $name], 201);

    case 'PUT':
        requireAdmin();
        $id      = (int)($_GET['id'] ?? 0);
        $newName = trim(getBody()['name'] ?? '');
        if (!$id || !$newName) jsonError('id และ name จำเป็น');
        $stmt = $pdo->prepare("SELECT id FROM `departments` WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) jsonError('Department not found', 404);
        $pdo->prepare("UPDATE `departments` SET name=? WHERE id=?")->execute([$newName, $id]);
        jsonResponse(['id' => $id, 'name' => $newName]);

    case 'DELETE':
        requireAdmin();
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Missing id');
        $pdo->prepare("DELETE FROM `departments` WHERE id=?")->execute([$id]);
        jsonResponse(['success' => true]);

    default:
        jsonError('Method not allowed', 405);
}
