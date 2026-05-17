<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

// ─── Budget calculation ────────────────────────────────────────────────────
// Total budget = paid payments + budget additions - approved expenses

$totalCollected = (float)$pdo->query(
    "SELECT COALESCE(SUM(pr.amount_per_person), 0)
     FROM `payments` p
     JOIN `payment_requests` pr ON p.request_id = pr.id
     WHERE p.is_paid = 1"
)->fetchColumn();

$totalAdded = (float)$pdo->query(
    "SELECT COALESCE(SUM(amount), 0) FROM `budget_additions`"
)->fetchColumn();

$totalSpent = (float)$pdo->query(
    "SELECT COALESCE(SUM(total_amount), 0)
     FROM `expense_requests` WHERE status = 'approved'"
)->fetchColumn();

$totalBudget = $totalCollected + $totalAdded - $totalSpent;

// ─── KPI counts ───────────────────────────────────────────────────────────
$unpaidCount = (int)$pdo->query(
    "SELECT COUNT(*) FROM `payments` WHERE is_paid = 0"
)->fetchColumn();

$pendingTotal = (float)$pdo->query(
    "SELECT COALESCE(SUM(total_amount), 0) FROM `expense_requests` WHERE status = 'pending'"
)->fetchColumn();

$pendingCount = (int)$pdo->query(
    "SELECT COUNT(*) FROM `expense_requests` WHERE status = 'pending'"
)->fetchColumn();

$studentCount = (int)$pdo->query("SELECT COUNT(*) FROM `students`")->fetchColumn();

$sectionCount = (int)$pdo->query("SELECT COUNT(DISTINCT section_id) FROM `students` WHERE section_id IS NOT NULL")->fetchColumn();

// ─── Recent data ──────────────────────────────────────────────────────────
$recentExpenses = $pdo->query(
    "SELECT * FROM `expense_requests` ORDER BY created_at DESC LIMIT 5"
)->fetchAll();

$paymentRequests = $pdo->query(
    "SELECT * FROM `payment_requests` ORDER BY id DESC"
)->fetchAll();

$budgetAdditions = $pdo->query(
    "SELECT * FROM `budget_additions` ORDER BY created_at DESC LIMIT 5"
)->fetchAll();

jsonResponse([
    'totalBudget'         => $totalBudget,
    'unpaidCount'         => $unpaidCount,
    'pendingExpenseTotal' => $pendingTotal,
    'pendingExpenseCount' => $pendingCount,
    'studentCount'        => $studentCount,
    'sectionCount'        => $sectionCount,
    'recentExpenses'      => array_map(fn($r) => [
        'id'           => (int)$r['id'],
        'title'        => $r['title'],
        'total_amount' => (float)$r['total_amount'],
        'description'  => $r['description'],
        'status'       => $r['status'],
        'created_by'   => $r['created_by'] ? (int)$r['created_by'] : null,
        'approved_by'  => $r['approved_by'] ? (int)$r['approved_by'] : null,
        'created_at'   => $r['created_at'],
    ], $recentExpenses),
    'paymentRequests' => array_map(fn($r) => [
        'id'                => (int)$r['id'],
        'title'             => $r['title'],
        'target_sections'   => json_decode($r['target_sections'], true) ?? [],
        'amount_per_person' => (float)$r['amount_per_person'],
        'created_by'        => $r['created_by'] ? (int)$r['created_by'] : null,
        'created_at'        => $r['created_at'],
    ], $paymentRequests),
    'budgetAdditions' => array_map(fn($r) => [
        'id'          => (int)$r['id'],
        'amount'      => (float)$r['amount'],
        'description' => $r['description'],
        'created_by'  => $r['created_by'] ? (int)$r['created_by'] : null,
        'created_at'  => $r['created_at'],
    ], $budgetAdditions),
]);
