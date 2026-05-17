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
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
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
        'id'            => (int)$row['id'],
        'username'      => $row['username'],
        'name'          => $row['name'],
        'student_id'    => $row['student_id'],
        'role'          => $row['role'],
        'allowed_pages' => isset($row['allowed_pages']) ? json_decode($row['allowed_pages'], true) : null,
        'profile_image' => $row['profile_image'] ?? null,
    ];
}
