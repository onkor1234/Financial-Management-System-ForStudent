<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $rows = $pdo->query("SELECT * FROM `sections` ORDER BY id")->fetchAll();
        jsonResponse(array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name']], $rows));

    case 'POST':
        $name = trim(getBody()['name'] ?? '');
        if (!$name) jsonError('ชื่อกลุ่มเรียนจำเป็นต้องกรอก');
        $pdo->prepare("INSERT INTO `sections` (name) VALUES (?)")->execute([$name]);
        $id = (int)$pdo->lastInsertId();
        jsonResponse(['id' => $id, 'name' => $name], 201);

    case 'PUT':
        $id      = (int)($_GET['id'] ?? 0);
        $newName = trim(getBody()['name'] ?? '');
        if (!$id || !$newName) jsonError('id และ name จำเป็น');

        $stmt = $pdo->prepare("SELECT name FROM `sections` WHERE id = ?");
        $stmt->execute([$id]);
        $old = $stmt->fetchColumn();
        if ($old === false) jsonError('Section not found', 404);

        $pdo->prepare("UPDATE `sections` SET name=? WHERE id=?")->execute([$newName, $id]);

        // Cascade: update payment_requests.target_sections that contain the old name
        if ($old !== $newName) {
            $reqs = $pdo->query(
                "SELECT id, target_sections FROM `payment_requests` WHERE JSON_CONTAINS(target_sections, '\"$old\"')"
            )->fetchAll();
            foreach ($reqs as $req) {
                $targets = json_decode($req['target_sections'], true);
                $targets = array_map(fn($t) => $t === $old ? $newName : $t, $targets);
                $pdo->prepare("UPDATE `payment_requests` SET target_sections=? WHERE id=?")
                    ->execute([json_encode($targets, JSON_UNESCAPED_UNICODE), $req['id']]);
            }
        }

        jsonResponse(['id' => $id, 'name' => $newName]);

    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Missing id');
        $pdo->prepare("DELETE FROM `sections` WHERE id=?")->execute([$id]);
        jsonResponse(['success' => true]);

    default:
        jsonError('Method not allowed', 405);
}
