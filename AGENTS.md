# AGENTS.md — คำแนะนำสำหรับ AI Agents

ไฟล์นี้ให้ context สำหรับ AI agents (Claude Code, Copilot, ฯลฯ) ที่ทำงานกับโปรเจคนี้

---

## โปรเจคนี้คืออะไร

**CMRU Finance Pro** — ระบบจัดการการเงินสำหรับมหาวิทยาลัยราชภัฏเชียงใหม่  
Frontend: React 19 + TypeScript + Tailwind CSS  
Backend: PHP 8+ (REST API, session-based auth)  
Database: MySQL (auto-migration ใน `api/db.php`)

---

## สถาปัตยกรรม

```
Browser → Vite Dev Server (port 3000)
                 ↓ proxy /api/*
           PHP Server (port 8080)
                 ↓
            MySQL Database
```

ทุก API request ไปที่ `/api/*.php` ผ่าน Vite proxy ที่กำหนดใน `vite.config.ts`

---

## ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|------|--------|
| `api/db.php` | DB connection + CREATE TABLE IF NOT EXISTS ทุกตาราง + ALTER TABLE migrations + seed users |
| `api/config.php` | CORS headers, session_start(), helper functions: `jsonResponse`, `requireAuth`, `requireAdmin`, `requireApprover` |
| `src/lib/api.ts` | TypeScript types + fetch wrapper + `api` object (ใช้แทน mockDb ทุกหน้า) |
| `src/contexts/AuthContext.tsx` | Login/logout state, PHP session cookie management |
| `src/pages/ExpenseRequests.tsx` | Export: `printReport`, `ReceiptUploader`, `ReceiptViewer` — ใช้ร่วมกับ Dashboard |

---

## Convention ที่ใช้

### PHP Backend
- ทุก endpoint include `config.php` ก่อนเสมอ (จัดการ session + CORS)
- ใช้ `requireAuth()` สำหรับ routes ที่ต้อง login
- ใช้ `requireAdmin()` สำหรับ admin-only routes
- ใช้ `requireApprover()` สำหรับ routes ที่ต้องการสิทธิ์อนุมัติ (admin หรือ `can_approve_expenses = 1`)
- ใช้ `jsonResponse($data)` และ `jsonError($msg, $status)` เสมอ
- ใช้ `getBody()` แทน `file_get_contents('php://input')`
- รูปภาพ (ลายเซ็น, ใบเสร็จ, profile) เก็บเป็น base64 data URL ใน column `LONGTEXT`
- JSON arrays เก็บใน `LONGTEXT` คอลัมน์ — decode ก่อน return, encode ก่อน save

### Frontend
- ทุก page import types และ `api` จาก `../lib/api`
- ไม่ import จาก `mockDb.ts` อีกต่อไป
- async/await กับ try/catch ทุก API call
- Error แสดงด้วย `alert()` (pattern เดิมของโปรเจค)
- Component ที่ใช้ร่วมกันหลายหน้า (`printReport`, `ReceiptViewer`) export จาก `src/pages/ExpenseRequests.tsx`

### Authentication Flow
1. User กรอก username + password → `POST /api/auth/login.php`
2. PHP ตรวจสอบ bcrypt hash → set `$_SESSION['user_id']` และ `$_SESSION['user_role']`
3. Browser รับ cookie `PHPSESSID`
4. Frontend เก็บ user object ใน localStorage สำหรับ UI
5. ทุก request ส่ง `credentials: 'include'` เพื่อแนบ session cookie

---

## Expense Request — PATCH Actions

`PATCH /api/expense_requests.php?id=X` รองรับ 3 action ที่แตกต่างกัน:

| `action` field | สิทธิ์ | ผลลัพธ์ |
|---|---|---|
| *(ไม่ระบุ)* | requireApprover | approve/reject ตาม `status` field |
| `update_requester` | creator หรือ admin | อัปเดต `requester_name` และ/หรือ `requester_signature` |
| `update_receipts` | creator หรือ admin | แทนที่ `receipt_images` ทั้งหมด (JSON array base64) |

---

## การเพิ่ม Feature ใหม่

### เพิ่ม API Endpoint ใหม่

1. สร้างไฟล์ `api/new_feature.php`:
```php
<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') requireAuth(); // หรือ requireAdmin()

switch ($method) {
    case 'GET': /* ... */ break;
    case 'POST': /* ... */ break;
}
```

2. เพิ่ม function ใน `src/lib/api.ts`:
```typescript
newFeature: {
  list: () => request<NewFeature[]>('GET', '/new_feature.php'),
  create: (data: CreateData) => request<NewFeature>('POST', '/new_feature.php', data),
}
```

### เพิ่ม Database Column ใหม่

เพิ่ม ALTER TABLE ใน `api/db.php` ต่อจาก migration สุดท้าย (ครอบด้วย try/catch เสมอ):

```php
try { $pdo->exec("ALTER TABLE `table_name` ADD COLUMN `col` TYPE DEFAULT NULL"); } catch (PDOException $e) {}
```

### เพิ่ม Database Table ใหม่

เพิ่ม `$pdo->exec("CREATE TABLE IF NOT EXISTS ...")` ใน `api/db.php`:

```php
$pdo->exec("CREATE TABLE IF NOT EXISTS `new_table` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    -- columns...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
```

---

## สิ่งที่ต้องระวัง

- **bcrypt hash:** ใช้ `password_hash($pass, PASSWORD_BCRYPT)` เสมอ ห้าม MD5/SHA1
- **SQL Injection:** ใช้ prepared statements (`$pdo->prepare()`) ทุกครั้ง ห้าม string concatenation
- **รูปภาพ/ใบเสร็จ:** เก็บ base64 data URL ใน `LONGTEXT` — ไม่มี file upload ไปยัง server filesystem
- **JSON columns:** decode ด้วย `json_decode($r['col'], true) ?: []` และ encode ด้วย `json_encode($array)` ก่อน save
- **Session:** PHP session ทำงานผ่าน cookie `PHPSESSID` + Vite proxy (credentials: 'include')
- **CORS:** `config.php` อนุญาต origin: localhost:3000, 5173, 8080 สำหรับ dev
- **receipt_images:** เก็บใน `LONGTEXT` เป็น JSON array — ต้อง `json_decode` ก่อน return ใน `formatExpense()`

---

## การ Debug

```bash
# ดู PHP errors
php -S localhost:8080 -t . 2>&1

# Test API ตรง ๆ
curl -s -c /tmp/cookies.txt -X POST http://localhost:8080/api/auth/login.php \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

curl -s -b /tmp/cookies.txt http://localhost:8080/api/dashboard.php
curl -s -b /tmp/cookies.txt http://localhost:8080/api/expense_requests.php
```
