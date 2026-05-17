<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

function formatRequest(array $r): array
{
    return [
        'id'               => (int)$r['id'],
        'title'            => $r['title'],
        'target_sections'  => json_decode($r['target_sections'], true) ?? [],
        'amount_per_person'=> (float)$r['amount_per_person'],
        'created_by'       => $r['created_by'] ? (int)$r['created_by'] : null,
        'created_at'       => $r['created_at'],
    ];
}

switch ($method) {
    case 'GET':
        $id = (int)($_GET['id'] ?? 0);
        if ($id) {
            // Return request + full student payment detail
            $stmt = $pdo->prepare("SELECT * FROM `payment_requests` WHERE id = ?");
            $stmt->execute([$id]);
            $req = $stmt->fetch();
            if (!$req) jsonError('Not found', 404);

            $targets = json_decode($req['target_sections'], true) ?? [];
            $isAll   = in_array('All', $targets, true);

            // Get students in target sections
            if ($isAll) {
                $studentsStmt = $pdo->query(
                    "SELECT s.*, sec.name AS section, maj.name AS major
                     FROM `students` s
                     LEFT JOIN `sections` sec ON s.section_id = sec.id
                     LEFT JOIN `majors`   maj ON s.major_id   = maj.id
                     ORDER BY s.id"
                );
                $students = $studentsStmt->fetchAll();
            } else {
                if (empty($targets)) {
                    $students = [];
                } else {
                    $placeholders = implode(',', array_fill(0, count($targets), '?'));
                    $studentsStmt = $pdo->prepare(
                        "SELECT s.*, sec.name AS section, maj.name AS major
                         FROM `students` s
                         LEFT JOIN `sections` sec ON s.section_id = sec.id
                         LEFT JOIN `majors`   maj ON s.major_id   = maj.id
                         WHERE sec.name IN ($placeholders)
                         ORDER BY s.id"
                    );
                    $studentsStmt->execute($targets);
                    $students = $studentsStmt->fetchAll();
                }
            }

            // Get payments for this request
            $payStmt = $pdo->prepare("SELECT * FROM `payments` WHERE request_id = ?");
            $payStmt->execute([$id]);
            $payments = $payStmt->fetchAll();
            $payMap   = [];
            foreach ($payments as $p) {
                $payMap[(int)$p['student_id']] = $p;
            }

            $studentPayments = array_map(function ($s) use ($payMap) {
                $p = $payMap[(int)$s['id']] ?? null;
                return [
                    'student' => [
                        'id'         => (int)$s['id'],
                        'student_id' => $s['student_id'],
                        'first_name' => $s['first_name'],
                        'last_name'  => $s['last_name'],
                        'section'    => $s['section'] ?? '',
                        'major'      => $s['major']   ?? '',
                    ],
                    'payment' => $p ? [
                        'id'            => (int)$p['id'],
                        'request_id'    => (int)$p['request_id'],
                        'student_id'    => (int)$p['student_id'],
                        'is_paid'       => (bool)$p['is_paid'],
                        'receipt_image' => normalizeReceiptImage($p['receipt_image']),
                        'paid_at'       => $p['paid_at'],
                    ] : null,
                ];
            }, $students);

            $result = formatRequest($req);
            $result['student_payments'] = $studentPayments;
            jsonResponse($result);
        }

        // List all requests
        $rows = $pdo->query("SELECT * FROM `payment_requests` ORDER BY id DESC")->fetchAll();
        jsonResponse(array_map('formatRequest', $rows));

    case 'POST':
        $session = requireAuth();
        $body    = getBody();
        $title   = trim($body['title'] ?? '');
        $targets = $body['target_sections'] ?? ['All'];
        $amount  = (float)($body['amount_per_person'] ?? 0);

        if (!$title || $amount <= 0) {
            jsonError('ชื่อรายการและจำนวนเงินจำเป็นต้องกรอก');
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "INSERT INTO `payment_requests` (title, target_sections, amount_per_person, created_by)
                 VALUES (?, ?, ?, ?)"
            )->execute([$title, json_encode($targets, JSON_UNESCAPED_UNICODE), $amount, $session['user_id']]);

            $reqId   = (int)$pdo->lastInsertId();
            $isAll   = in_array('All', $targets, true);

            // Auto-create payment records for target students
            if ($isAll) {
                $students = $pdo->query("SELECT id FROM `students`")->fetchAll();
            } else {
                if (!empty($targets)) {
                    $placeholders = implode(',', array_fill(0, count($targets), '?'));
                    $st = $pdo->prepare(
                        "SELECT s.id FROM `students` s
                         LEFT JOIN `sections` sec ON s.section_id = sec.id
                         WHERE sec.name IN ($placeholders)"
                    );
                    $st->execute($targets);
                    $students = $st->fetchAll();
                } else {
                    $students = [];
                }
            }

            $payStmt = $pdo->prepare(
                "INSERT INTO `payments` (request_id, student_id, is_paid) VALUES (?, ?, 0)"
            );
            foreach ($students as $s) {
                $payStmt->execute([$reqId, (int)$s['id']]);
            }

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonError('เกิดข้อผิดพลาด: ' . $e->getMessage(), 500);
        }

        $stmt = $pdo->prepare("SELECT * FROM `payment_requests` WHERE id = ?");
        $stmt->execute([$reqId]);
        jsonResponse(formatRequest($stmt->fetch()), 201);

    default:
        jsonError('Method not allowed', 405);
}
