<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

function formatExpense(array $r): array
{
    return [
        'id'           => (int)$r['id'],
        'title'        => $r['title'],
        'total_amount' => (float)$r['total_amount'],
        'description'  => $r['description'],
        'status'       => $r['status'],
        'created_by'   => $r['created_by'] ? (int)$r['created_by'] : null,
        'approved_by'  => $r['approved_by'] ? (int)$r['approved_by'] : null,
        'created_at'   => $r['created_at'],
    ];
}

function formatItem(array $r): array
{
    return [
        'id'                 => (int)$r['id'],
        'expense_request_id' => (int)$r['expense_request_id'],
        'item_name'          => $r['item_name'],
        'price'              => (float)$r['price'],
        'quantity'           => (int)($r['quantity'] ?? 1),
    ];
}

switch ($method) {
    case 'GET':
        $id = (int)($_GET['id'] ?? 0);
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM `expense_requests` WHERE id = ?");
            $stmt->execute([$id]);
            $req = $stmt->fetch();
            if (!$req) jsonError('Not found', 404);

            $items = $pdo->prepare("SELECT * FROM `expense_items` WHERE expense_request_id = ? ORDER BY id");
            $items->execute([$id]);

            $result = formatExpense($req);
            $result['items'] = array_map('formatItem', $items->fetchAll());
            jsonResponse($result);
        }

        $rows = $pdo->query(
            "SELECT * FROM `expense_requests` ORDER BY created_at DESC"
        )->fetchAll();
        jsonResponse(array_map('formatExpense', $rows));

    case 'POST':
        $session = requireAuth();
        $body    = getBody();
        $title   = trim($body['title']       ?? '');
        $desc    = trim($body['description'] ?? '');
        $items   = $body['items']            ?? [];

        if (!$title) jsonError('ชื่อรายการจำเป็นต้องกรอก');

        $validItems = array_filter($items, fn($i) => trim($i['name'] ?? '') !== '' && (float)($i['price'] ?? 0) > 0);
        if (empty($validItems)) jsonError('กรุณาเพิ่มรายการสิ่งของอย่างน้อย 1 รายการ');

        $total = array_sum(array_map(fn($i) => (float)$i['price'] * max(1, (int)($i['quantity'] ?? 1)), array_values($validItems)));

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "INSERT INTO `expense_requests` (title, total_amount, description, status, created_by)
                 VALUES (?, ?, ?, 'pending', ?)"
            )->execute([$title, $total, $desc ?: null, $session['user_id']]);

            $reqId   = (int)$pdo->lastInsertId();
            $itemStmt = $pdo->prepare(
                "INSERT INTO `expense_items` (expense_request_id, item_name, price, quantity) VALUES (?, ?, ?, ?)"
            );
            foreach ($validItems as $item) {
                $qty = max(1, (int)($item['quantity'] ?? 1));
                $itemStmt->execute([$reqId, trim($item['name']), (float)$item['price'], $qty]);
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonError('เกิดข้อผิดพลาด: ' . $e->getMessage(), 500);
        }

        $stmt = $pdo->prepare("SELECT * FROM `expense_requests` WHERE id = ?");
        $stmt->execute([$reqId]);
        jsonResponse(formatExpense($stmt->fetch()), 201);

    case 'PUT':
        $id      = (int)($_GET['id'] ?? 0);
        $body    = getBody();
        $session = requireAuth();

        if (!$id) jsonError('id จำเป็น');

        $stmt = $pdo->prepare("SELECT * FROM `expense_requests` WHERE id = ?");
        $stmt->execute([$id]);
        $req = $stmt->fetch();
        if (!$req) jsonError('Not found', 404);
        if ($req['status'] !== 'pending') jsonError('ไม่สามารถแก้ไขรายการที่อนุมัติ/ปฏิเสธแล้ว');
        if ($session['role'] !== 'admin' && (int)$req['created_by'] !== (int)$session['user_id']) {
            jsonError('ไม่มีสิทธิ์แก้ไขรายการนี้', 403);
        }

        $title = trim($body['title']       ?? '');
        $desc  = trim($body['description'] ?? '');
        $items = $body['items']            ?? [];

        if (!$title) jsonError('ชื่อรายการจำเป็นต้องกรอก');

        $validItems = array_filter($items, fn($i) => trim($i['name'] ?? '') !== '' && (float)($i['price'] ?? 0) > 0);
        if (empty($validItems)) jsonError('กรุณาเพิ่มรายการสิ่งของอย่างน้อย 1 รายการ');

        $total = array_sum(array_map(fn($i) => (float)$i['price'] * max(1, (int)($i['quantity'] ?? 1)), array_values($validItems)));

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "UPDATE `expense_requests` SET title=?, total_amount=?, description=? WHERE id=?"
            )->execute([$title, $total, $desc ?: null, $id]);

            $pdo->prepare("DELETE FROM `expense_items` WHERE expense_request_id = ?")->execute([$id]);

            $itemStmt = $pdo->prepare(
                "INSERT INTO `expense_items` (expense_request_id, item_name, price, quantity) VALUES (?, ?, ?, ?)"
            );
            foreach ($validItems as $item) {
                $qty = max(1, (int)($item['quantity'] ?? 1));
                $itemStmt->execute([$id, trim($item['name']), (float)$item['price'], $qty]);
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonError('เกิดข้อผิดพลาด: ' . $e->getMessage(), 500);
        }

        $stmt = $pdo->prepare("SELECT * FROM `expense_requests` WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(formatExpense($stmt->fetch()));

    case 'PATCH':
        $id      = (int)($_GET['id'] ?? 0);
        $body    = getBody();
        $status  = $body['status'] ?? '';
        $session = requireAdmin();

        if (!$id || !in_array($status, ['approved', 'rejected'], true)) {
            jsonError('id และ status (approved/rejected) จำเป็น');
        }

        $pdo->prepare(
            "UPDATE `expense_requests` SET status=?, approved_by=? WHERE id=?"
        )->execute([$status, $session['user_id'], $id]);

        $stmt = $pdo->prepare("SELECT * FROM `expense_requests` WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(formatExpense($stmt->fetch()));

    case 'DELETE':
        $id      = (int)($_GET['id'] ?? 0);
        $session = requireAuth();

        if (!$id) jsonError('id จำเป็น');

        $stmt = $pdo->prepare("SELECT * FROM `expense_requests` WHERE id = ?");
        $stmt->execute([$id]);
        $req = $stmt->fetch();
        if (!$req) jsonError('Not found', 404);
        if ($req['status'] !== 'pending') jsonError('ไม่สามารถลบรายการที่อนุมัติ/ปฏิเสธแล้ว');
        if ($session['role'] !== 'admin' && (int)$req['created_by'] !== (int)$session['user_id']) {
            jsonError('ไม่มีสิทธิ์ลบรายการนี้', 403);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM `expense_items` WHERE expense_request_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM `expense_requests` WHERE id = ?")->execute([$id]);
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonError('เกิดข้อผิดพลาด: ' . $e->getMessage(), 500);
        }

        jsonResponse(['success' => true]);

    default:
        jsonError('Method not allowed', 405);
}
