# CMRU Finance Pro

ระบบจัดการการเงินสำหรับมหาวิทยาลัยราชภัฏเชียงใหม่ — จัดการงบประมาณ เรียกเก็บเงิน เบิกจ่าย และข้อมูลนักศึกษา

---

## Tech Stack

| ชั้น | เทคโนโลยี |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 + Vite 6 |
| Backend  | PHP 8.1+ |
| Database | MySQL 8+ |
| File Storage | Base64 data URL (รูปภาพ/ใบเสร็จ/ลายเซ็นเก็บใน LONGTEXT) |

---

## โครงสร้างโปรเจค

```
cmru-unifinance/
├── api/                        # PHP Backend
│   ├── db.php                  # DB connection + Auto-migration + Seed data
│   ├── config.php              # CORS, Session, Helper functions
│   ├── auth/
│   │   ├── login.php           # POST /api/auth/login.php
│   │   ├── logout.php          # POST /api/auth/logout.php
│   │   └── me.php              # GET  /api/auth/me.php
│   ├── users.php               # GET/POST/PUT/DELETE /api/users.php
│   ├── students.php            # GET/POST/PUT/DELETE /api/students.php
│   ├── sections.php            # GET/POST/PUT/DELETE /api/sections.php
│   ├── majors.php              # GET/POST/PUT/DELETE /api/majors.php
│   ├── departments.php         # GET/POST/PUT/DELETE /api/departments.php
│   ├── payment_requests.php    # GET/POST/DELETE /api/payment_requests.php
│   ├── payments.php            # PATCH /api/payments.php
│   ├── expense_requests.php    # GET/POST/PUT/PATCH/DELETE /api/expense_requests.php
│   ├── budget.php              # GET/POST /api/budget.php
│   └── dashboard.php           # GET /api/dashboard.php
├── src/
│   ├── lib/
│   │   └── api.ts              # API Service Layer (Types + Fetch wrapper)
│   ├── contexts/
│   │   └── AuthContext.tsx     # Auth State + Session management
│   └── pages/
│       ├── Dashboard.tsx       # KPI cards, รายการล่าสุด, modal ดูหลักฐาน
│       ├── ExpenseRequests.tsx # เบิกจ่าย + ReceiptUploader/Viewer + printReport (exported)
│       ├── MasterData.tsx      # Master Data (กลุ่มเรียน / สาขาวิชา / ตำแหน่ง)
│       └── ...
├── vite.config.ts              # Vite config + API Proxy
├── AGENTS.md                   # คำแนะนำสำหรับ AI agents
└── README.md
```

---

## การติดตั้งและรัน (Local Development)

### 1. รัน PHP Backend

```bash
# รัน PHP built-in server ที่ root ของโปรเจค
php -S localhost:8080 -t .
```

> **XAMPP/WAMP:** คัดลอกโปรเจคไปที่ `htdocs/cmru-unifinance/` แล้วตั้ง `VITE_API_TARGET` ใน `.env.local`

### 2. ตั้งค่า API Target (ถ้าจำเป็น)

สร้างไฟล์ `.env.local`:

```env
# PHP built-in server (ค่าเริ่มต้น — ไม่ต้องตั้งถ้าใช้ php -S localhost:8080)
VITE_API_TARGET=http://localhost:8080

# XAMPP บน port 80
# VITE_API_TARGET=http://localhost

# XAMPP และโปรเจคอยู่ใน /cmru-unifinance/
# VITE_API_TARGET=http://localhost/cmru-unifinance
```

### 3. ติดตั้ง Node dependencies และรัน Frontend

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

**Auto-migration** จะสร้างตารางทั้งหมดและ seed user ตั้งต้นโดยอัตโนมัติเมื่อมีการเรียก API ครั้งแรก

---

## บัญชีตั้งต้น (Seed Data)

| Username | Password | บทบาท |
|----------|----------|-------|
| `admin`  | `admin123` | ผู้ดูแลระบบ (เข้าถึงได้ทุกหน้า) |
| `op1`    | `op1123`   | พนักงาน/ฝ่ายปฏิบัติการ |

> เปลี่ยนรหัสผ่านหลังติดตั้งครั้งแรกผ่านหน้า **จัดการสมาชิก**

---

## Database Schema

```sql
users (
  id, username UNIQUE, password_hash, name, student_id,
  role ENUM('admin','operation'), allowed_pages JSON,
  profile_image LONGTEXT,
  department_id FK→departments(SET NULL),
  signature LONGTEXT,             -- base64 PNG data URL
  can_approve_expenses TINYINT,   -- 1 = อนุมัติเบิกจ่ายได้
  created_at, updated_at
)

sections    (id, name, created_at)
majors      (id, name, created_at)
departments (id, name, created_at)

students (
  id, student_id UNIQUE, first_name, last_name,
  section_id FK→sections(SET NULL), major_id FK→majors(SET NULL),
  created_at
)

payment_requests (
  id, title, target_sections JSON,
  amount_per_person DECIMAL, created_by FK→users, created_at
)

payments (
  id, request_id FK→payment_requests(CASCADE),
  student_id FK→students(CASCADE),
  is_paid TINYINT, receipt_image LONGTEXT, paid_at, updated_at
)

expense_requests (
  id, title, total_amount DECIMAL, description TEXT,
  status ENUM('pending','approved','rejected'),
  created_by FK→users, approved_by FK→users,
  requester_name VARCHAR(200),
  requester_signature LONGTEXT,   -- base64 PNG data URL
  receipt_images LONGTEXT,        -- JSON array of base64 image data URLs
  created_at, updated_at, approved_at
)

expense_items (
  id, expense_request_id FK→expense_requests(CASCADE),
  item_name, price DECIMAL, quantity INT
)

budget_additions (
  id, amount DECIMAL, description, created_by FK→users, created_at
)
```

---

## API Endpoints

### Auth

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|---------|------|
| POST | `/api/auth/login.php` | เข้าสู่ระบบ | — |
| POST | `/api/auth/logout.php` | ออกจากระบบ | ✅ |
| GET  | `/api/auth/me.php` | ดู session ปัจจุบัน | ✅ |

### Master Data

| Method | Endpoint | Auth |
|--------|----------|------|
| GET/POST/PUT/DELETE | `/api/users.php` | Admin |
| GET/POST/PUT/DELETE | `/api/students.php` | ✅ |
| GET/POST/PUT/DELETE | `/api/sections.php` | ✅ |
| GET/POST/PUT/DELETE | `/api/majors.php` | ✅ |
| GET/POST/PUT/DELETE | `/api/departments.php` | ✅ (เขียน: Admin) |

### Payments

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|---------|------|
| GET | `/api/payment_requests.php` | รายการทั้งหมด | ✅ |
| GET | `/api/payment_requests.php?id=X` | รายละเอียด + สถานะชำระ | ✅ |
| POST | `/api/payment_requests.php` | สร้างรายการ (auto-create payments) | ✅ |
| PATCH | `/api/payments.php` | อัปเดตสถานะชำระ / แนบใบเสร็จ | ✅ |

### Expense Requests

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|---------|------|
| GET | `/api/expense_requests.php` | รายการทั้งหมด | — |
| GET | `/api/expense_requests.php?id=X` | รายละเอียด + items | — |
| POST | `/api/expense_requests.php` | สร้างคำขอ (รองรับ `receipt_images[]`) | ✅ |
| PUT | `/api/expense_requests.php?id=X` | แก้ไข (pending เท่านั้น) | creator/admin |
| PATCH | `/api/expense_requests.php?id=X` | approve/reject | requireApprover |
| PATCH + `action:update_requester` | `/api/expense_requests.php?id=X` | แก้ไขชื่อ/ลายเซ็น | creator/admin |
| PATCH + `action:update_receipts` | `/api/expense_requests.php?id=X` | แนบ/แทนที่ใบเสร็จ (ทุก status) | creator/admin |
| DELETE | `/api/expense_requests.php?id=X` | ลบ | creator(pending)/admin(ทุก status) |

### Budget & Dashboard

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|---------|------|
| GET/POST | `/api/budget.php` | รายการเติมงบประมาณ | Admin |
| GET | `/api/dashboard.php` | KPIs + recentExpenses(8) + paymentRequests + budgetAdditions | ✅ |

---

## หน้าและเมนูในระบบ

| เส้นทาง | หน้า | สิทธิ์ |
|---------|------|--------|
| `/` | Dashboard — KPI, รายการล่าสุด, modal หลักฐาน (ใบเสร็จ + PDF) | ✅ |
| `/payments` | รายการเรียกเก็บเงิน | ✅ |
| `/expenses` | รายการเบิกจ่าย — สร้าง/แก้ไข/อนุมัติ/แนบใบเสร็จ/พิมพ์ PDF | ✅ |
| `/budget` | งบประมาณระบบ | Admin |
| `/students` | รายชื่อนักศึกษา | Admin |
| `/master-data` | Master Data (กลุ่มเรียน / สาขาวิชา / ตำแหน่ง) | Admin |
| `/users` | จัดการสมาชิก | Admin |

> **Backward compat:** user ที่มี `/sections` หรือ `/majors` ใน `allowed_pages` เดิม เข้า `/master-data` ได้โดยอัตโนมัติ

---

## ฟีเจอร์ใบเสร็จ / หลักฐาน

ระบบรองรับการแนบรูปภาพใบเสร็จ/สลิปใน expense requests:

- **ตอนสร้าง:** แนบรูปได้ทันทีในฟอร์ม Create
- **ย้อนหลัง:** ปุ่ม "แนบใบเสร็จ" ใน details modal — ใช้ได้ทุก status (pending/approved/rejected)
- **แสดงผล:** thumbnail grid พร้อม click-to-fullscreen ทั้งใน `/expenses` และ Dashboard
- **ใน PDF:** ส่วนท้ายของรายงาน PDF แสดงรูปใบเสร็จที่แนบไว้
- **Dashboard evidence:** modal แสดง 2 หลักฐาน — (1) รูปใบเสร็จ (2) ปุ่มพิมพ์ PDF สำหรับที่อนุมัติแล้ว

---

## สิทธิ์การใช้งาน

| ฟีเจอร์ | admin | operation |
|--------|-------|-----------|
| ดู Dashboard | ✅ | ✅ |
| รายการเรียกเก็บ / อัปเดตการชำระ | ✅ | ✅ |
| ดูรายการเบิกจ่าย | ✅ | ✅ |
| สร้างคำขอเบิกจ่าย + แนบใบเสร็จ | ✅ | ✅ |
| อนุมัติ/ปฏิเสธเบิกจ่าย | ✅ | ✅ (ถ้า `can_approve_expenses = 1`) |
| เติมงบประมาณ | ✅ | ❌ |
| จัดการนักศึกษา | ✅ | ❌ |
| Master Data | ✅ | ❌ |
| จัดการสมาชิก | ✅ | ❌ |

---

## Deploy บน cPanel / Shared Hosting

1. อัปโหลดไฟล์ทั้งหมดขึ้น public_html หรือ subdomain
2. ตรวจสอบ credentials ใน [api/db.php](api/db.php) ให้ถูกต้อง
3. Build frontend: `npm run build`
4. อัปโหลดโฟลเดอร์ `dist/` และ `api/` ขึ้น server
5. ตั้งค่า `.htaccess` สำหรับ SPA routing:

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)$ /index.html [L]
```

> บน cPanel ไม่ต้องรัน `php -S` เพราะ Apache จัดการ PHP อยู่แล้ว

---

## การพัฒนาเพิ่มเติม

- **เพิ่มหน้าใหม่:** สร้างไฟล์ใน `src/pages/`, เพิ่ม route ใน `src/App.tsx`, เพิ่ม path ใน `AVAILABLE_PAGES` (`ManageUsers.tsx`)
- **เพิ่ม API endpoint:** ทุกไฟล์ต้อง `require_once __DIR__ . '/config.php'` และ `require_once __DIR__ . '/db.php'`
- **Migration เพิ่มเติม:** เพิ่ม `try { $pdo->exec("ALTER TABLE ..."); } catch (PDOException $e) {}` ใน `api/db.php`
- **เพิ่มแท็บใน Master Data:** แก้ไข `src/pages/MasterData.tsx` เพิ่ม entry ใน `TAB_META`
- **Shared components:** `printReport`, `ReceiptUploader`, `ReceiptViewer` อยู่ใน `src/pages/ExpenseRequests.tsx` — import ได้จากไฟล์อื่น
