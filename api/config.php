<?php
// ─── CORS ────────────────────────────────────────────────────────────────────
$allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Session ─────────────────────────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
               || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
               || (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

    session_set_cookie_params([
        'lifetime' => 86400 * 7,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ─── Capture raw request body once (reused by getBody + audit logger) ─────────
$GLOBALS['__rawInput'] = file_get_contents('php://input');

// ─── Audit logging: auto-record authenticated mutating requests on shutdown ───
register_shutdown_function('logAuditRequest');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function jsonResponse(mixed $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError(string $message, int $status = 400): void
{
    jsonResponse(['error' => $message], $status);
}

function getBody(): array
{
    $raw = $GLOBALS['__rawInput'] ?? file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

/**
 * Shutdown handler: persist an audit-log row for every authenticated request
 * that changes data (POST/PUT/PATCH/DELETE). Runs automatically for any endpoint
 * that includes config.php + db.php, so no per-endpoint instrumentation needed.
 * Failures here must never break the actual response.
 */
function logAuditRequest(): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        return;
    }
    if (empty($_SESSION['user_id'])) {
        return; // only log actions by logged-in users
    }

    // Skip the audit/visit endpoints themselves to avoid noise & recursion.
    $script = basename((string)($_SERVER['SCRIPT_NAME'] ?? ''));
    if (in_array($script, ['audit_log.php', 'visits.php'], true)) {
        return;
    }

    // $pdo is created at global scope in db.php; skip if the endpoint didn't load it.
    if (empty($GLOBALS['pdo']) || !($GLOBALS['pdo'] instanceof PDO)) {
        return;
    }
    $pdo = $GLOBALS['pdo'];

    try {
        $uid = (int)$_SESSION['user_id'];

        $username = null;
        try {
            $s = $pdo->prepare("SELECT username FROM `users` WHERE id = ?");
            $s->execute([$uid]);
            $username = $s->fetchColumn() ?: null;
        } catch (Exception $e) { /* ignore */ }

        $endpoint = (string)($_SERVER['REQUEST_URI'] ?? $script);
        if (mb_strlen($endpoint) > 255) {
            $endpoint = mb_substr($endpoint, 0, 255);
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $detail = auditSanitizeBody($GLOBALS['__rawInput'] ?? '');

        $stmt = $pdo->prepare(
            "INSERT INTO `audit_logs` (user_id, username, method, endpoint, detail, ip)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$uid, $username, $method, $endpoint, $detail, $ip]);
    } catch (Exception $e) { /* never break the response */ }
}

/**
 * Turn a raw JSON request body into a compact, human-readable summary that is
 * safe to store: sensitive/huge fields are masked, long strings truncated.
 */
function auditSanitizeBody(string $raw): ?string
{
    if ($raw === '') {
        return null;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return mb_strlen($raw) > 200 ? mb_substr($raw, 0, 200) . '…' : $raw;
    }

    $hidden = ['password', 'receipt_image', 'receipt_images', 'profile_image', 'signature', 'requester_signature'];
    $clean  = [];
    foreach ($data as $k => $v) {
        if (in_array($k, $hidden, true)) {
            $clean[$k] = '[ซ่อน]';
        } elseif (is_string($v)) {
            $clean[$k] = mb_strlen($v) > 200 ? mb_substr($v, 0, 200) . '…' : $v;
        } elseif (is_array($v)) {
            $clean[$k] = '[' . count($v) . ' รายการ]';
        } else {
            $clean[$k] = $v;
        }
    }

    $json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return null;
    }
    return mb_strlen($json) > 2000 ? mb_substr($json, 0, 2000) : $json;
}

function normalizeReceiptImage(mixed $value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $value = trim($value);
    if ($value === '') {
        return null;
    }

    if (preg_match('/^data:image\/[a-z0-9.+-]+;base64,/i', $value) === 1) {
        return $value;
    }
    if (preg_match('/^(https?:\/\/|blob:|\/)/i', $value) === 1) {
        return $value;
    }

    $raw = preg_replace('/\s+/', '', $value);
    if (!is_string($raw) || $raw === '') {
        return null;
    }
    if (preg_match('/^[A-Za-z0-9+\/=]+$/', $raw) !== 1) {
        return $value;
    }

    $mime = 'image/jpeg';
    if (str_starts_with($raw, 'iVBORw0KGgo')) {
        $mime = 'image/png';
    } elseif (str_starts_with($raw, 'R0lGOD')) {
        $mime = 'image/gif';
    } elseif (str_starts_with($raw, 'UklGR')) {
        $mime = 'image/webp';
    }

    return "data:$mime;base64,$raw";
}

/**
 * Compute collection progress for a payment request the same way the public
 * status page does: based on the students CURRENTLY in the target sections,
 * not on stale rows in the payments table (a student may have changed section
 * after the request was created). Returns ['total_count' => int, 'paid_count' => int].
 */
function computePaymentProgress(PDO $pdo, array $req): array
{
    $targets = json_decode($req['target_sections'], true) ?? [];
    $isAll   = in_array('All', $targets, true);

    if ($isAll) {
        $studentIds = $pdo->query("SELECT id FROM `students`")->fetchAll(PDO::FETCH_COLUMN);
    } elseif (empty($targets)) {
        $studentIds = [];
    } else {
        $placeholders = implode(',', array_fill(0, count($targets), '?'));
        $stmt = $pdo->prepare(
            "SELECT s.id FROM `students` s
             LEFT JOIN `sections` sec ON s.section_id = sec.id
             WHERE sec.name IN ($placeholders)"
        );
        $stmt->execute($targets);
        $studentIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    $total = count($studentIds);
    if ($total === 0) {
        return ['total_count' => 0, 'paid_count' => 0];
    }

    $placeholders = implode(',', array_fill(0, count($studentIds), '?'));
    $params       = array_merge([(int)$req['id']], array_map('intval', $studentIds));
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM `payments`
         WHERE request_id = ? AND is_paid = 1 AND student_id IN ($placeholders)"
    );
    $stmt->execute($params);
    $paid = (int)$stmt->fetchColumn();

    return ['total_count' => $total, 'paid_count' => $paid];
}

function requireAuth(): array
{
    if (empty($_SESSION['user_id'])) {
        jsonError('Unauthorized', 401);
    }
    return ['user_id' => (int)$_SESSION['user_id'], 'role' => $_SESSION['user_role']];
}

function requireAdmin(): array
{
    $session = requireAuth();
    if ($session['role'] !== 'admin') {
        jsonError('Forbidden: Admin only', 403);
    }
    return $session;
}

function formatUser(array $row): array
{
    return [
        'id'                   => (int)$row['id'],
        'username'             => $row['username'],
        'name'                 => $row['name'],
        'student_id'           => $row['student_id'],
        'role'                 => $row['role'],
        'allowed_pages'        => isset($row['allowed_pages']) ? json_decode($row['allowed_pages'], true) : null,
        'profile_image'        => $row['profile_image'] ?? null,
        'department_id'        => isset($row['department_id']) ? (int)$row['department_id'] : null,
        'department_name'      => $row['department_name'] ?? null,
        'signature'            => $row['signature'] ?? null,
        'can_approve_expenses' => !empty($row['can_approve_expenses']),
    ];
}

function requireApprover(): array
{
    $session = requireAuth();
    if ($session['role'] === 'admin') return $session;
    global $pdo;
    $stmt = $pdo->prepare("SELECT can_approve_expenses FROM `users` WHERE id = ?");
    $stmt->execute([$session['user_id']]);
    $u = $stmt->fetch();
    if (!$u || !$u['can_approve_expenses']) {
        jsonError('ไม่มีสิทธิ์อนุมัติรายการ', 403);
    }
    return $session;
}
