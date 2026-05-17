<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$requestId = (int)($_GET['id'] ?? 0);
if (!$requestId) {
    jsonError('Missing id');
}

$stmt = $pdo->prepare("SELECT * FROM `payment_requests` WHERE id = ?");
$stmt->execute([$requestId]);
$req = $stmt->fetch();
if (!$req) {
    jsonError('Not found', 404);
}

$targets = json_decode($req['target_sections'], true) ?? [];
$isAll   = in_array('All', $targets, true);

if ($isAll) {
    $studentsStmt = $pdo->query(
        "SELECT s.id, s.student_id, s.first_name, s.last_name, sec.name AS section
         FROM `students` s
         LEFT JOIN `sections` sec ON s.section_id = sec.id
         ORDER BY s.id"
    );
    $students = $studentsStmt->fetchAll();
} else {
    if (empty($targets)) {
        $students = [];
    } else {
        $placeholders = implode(',', array_fill(0, count($targets), '?'));
        $studentsStmt = $pdo->prepare(
            "SELECT s.id, s.student_id, s.first_name, s.last_name, sec.name AS section
             FROM `students` s
             LEFT JOIN `sections` sec ON s.section_id = sec.id
             WHERE sec.name IN ($placeholders)
             ORDER BY s.id"
        );
        $studentsStmt->execute($targets);
        $students = $studentsStmt->fetchAll();
    }
}

$payStmt = $pdo->prepare("SELECT student_id, is_paid FROM `payments` WHERE request_id = ?");
$payStmt->execute([$requestId]);
$payments = $payStmt->fetchAll();
$payMap   = [];
foreach ($payments as $p) {
    $payMap[(int)$p['student_id']] = (bool)$p['is_paid'];
}

$studentPayments = array_map(function ($s) use ($payMap) {
    $sid = (int)$s['id'];
    $isPaid = $payMap[$sid] ?? null;

    return [
        'student' => [
            'id'         => $sid,
            'student_id' => $s['student_id'],
            'first_name' => $s['first_name'],
            'last_name'  => $s['last_name'],
            'section'    => $s['section'] ?? '',
        ],
        'payment' => $isPaid === null ? null : [
            'is_paid' => $isPaid,
        ],
    ];
}, $students);

jsonResponse([
    'id'                => (int)$req['id'],
    'title'             => $req['title'],
    'target_sections'   => $targets,
    'amount_per_person' => (float)$req['amount_per_person'],
    'created_by'        => $req['created_by'] ? (int)$req['created_by'] : null,
    'created_at'        => $req['created_at'],
    'student_payments'  => $studentPayments,
]);
