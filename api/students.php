<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

function formatStudent(array $r): array
{
    return [
        'id'         => (int)$r['id'],
        'student_id' => $r['student_id'],
        'first_name' => $r['first_name'],
        'last_name'  => $r['last_name'],
        'section'    => $r['section'] ?? '',
        'major'      => $r['major']   ?? '',
        'section_id' => $r['section_id'] ? (int)$r['section_id'] : null,
        'major_id'   => $r['major_id']   ? (int)$r['major_id']   : null,
    ];
}

function resolveIds(PDO $pdo, string $sectionName, string $majorName): array
{
    $secId = null;
    $majId = null;

    if ($sectionName) {
        $s = $pdo->prepare("SELECT id FROM `sections` WHERE name = ?");
        $s->execute([$sectionName]);
        $secId = $s->fetchColumn() ?: null;
    }
    if ($majorName) {
        $m = $pdo->prepare("SELECT id FROM `majors` WHERE name = ?");
        $m->execute([$majorName]);
        $majId = $m->fetchColumn() ?: null;
    }
    return [$secId, $majId];
}

$listSql = "SELECT s.*, sec.name AS section, maj.name AS major
            FROM `students` s
            LEFT JOIN `sections` sec ON s.section_id = sec.id
            LEFT JOIN `majors`   maj ON s.major_id   = maj.id
            ORDER BY CAST(s.student_id AS UNSIGNED), s.student_id, s.id";

switch ($method) {
    case 'GET':
        $rows = $pdo->query($listSql)->fetchAll();
        jsonResponse(array_map('formatStudent', $rows));

    case 'POST':
        $body = getBody();
        $sid  = trim($body['student_id'] ?? '');
        $fn   = trim($body['first_name'] ?? '');
        $ln   = trim($body['last_name']  ?? '');
        $sec  = trim($body['section']    ?? '');
        $maj  = trim($body['major']      ?? '');

        if (!$sid || !$fn || !$ln) jsonError('รหัสนักศึกษา, ชื่อ และนามสกุล จำเป็นต้องกรอก');

        [$secId, $majId] = resolveIds($pdo, $sec, $maj);

        try {
            $pdo->prepare(
                "INSERT INTO `students` (student_id, first_name, last_name, section_id, major_id)
                 VALUES (?, ?, ?, ?, ?)"
            )->execute([$sid, $fn, $ln, $secId, $majId]);
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) {
                jsonError('รหัสนักศึกษานี้มีอยู่แล้ว', 409);
            }
            jsonError('เกิดข้อผิดพลาด', 500);
        }

        $newId = (int)$pdo->lastInsertId();
        $row   = $pdo->prepare($listSql . " -- not used");
        // Re-query single row
        $row = $pdo->prepare(
            "SELECT s.*, sec.name AS section, maj.name AS major
             FROM `students` s
             LEFT JOIN `sections` sec ON s.section_id = sec.id
             LEFT JOIN `majors`   maj ON s.major_id   = maj.id
             WHERE s.id = ?"
        );
        $row->execute([$newId]);
        jsonResponse(formatStudent($row->fetch()), 201);

    case 'PUT':
        $id   = (int)($_GET['id'] ?? 0);
        $body = getBody();
        if (!$id) jsonError('Missing id');

        $sid = trim($body['student_id'] ?? '');
        $fn  = trim($body['first_name'] ?? '');
        $ln  = trim($body['last_name']  ?? '');
        $sec = trim($body['section']    ?? '');
        $maj = trim($body['major']      ?? '');

        if (!$sid || !$fn || !$ln) jsonError('รหัสนักศึกษา, ชื่อ และนามสกุล จำเป็นต้องกรอก');

        [$secId, $majId] = resolveIds($pdo, $sec, $maj);

        try {
            $pdo->prepare(
                "UPDATE `students` SET student_id=?, first_name=?, last_name=?, section_id=?, major_id=? WHERE id=?"
            )->execute([$sid, $fn, $ln, $secId, $majId, $id]);
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) {
                jsonError('รหัสนักศึกษานี้มีอยู่แล้ว', 409);
            }
            jsonError('เกิดข้อผิดพลาด', 500);
        }

        $row = $pdo->prepare(
            "SELECT s.*, sec.name AS section, maj.name AS major
             FROM `students` s
             LEFT JOIN `sections` sec ON s.section_id = sec.id
             LEFT JOIN `majors`   maj ON s.major_id   = maj.id
             WHERE s.id = ?"
        );
        $row->execute([$id]);
        jsonResponse(formatStudent($row->fetch()));

    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Missing id');
        $pdo->prepare("DELETE FROM `students` WHERE id=?")->execute([$id]);
        jsonResponse(['success' => true]);

    default:
        jsonError('Method not allowed', 405);
}
