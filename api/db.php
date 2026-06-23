<?php
// Database credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'vj7xondevzsh_cmru');
define('DB_USER', 'vj7xondevzsh_cmru');
define('DB_PASS', 'cXCDrrCdLm4qrf6dqHEk');

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// ─── Auto-migration: create tables if not exist ───────────────────────────────

$pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `username`      VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `name`          VARCHAR(200) NOT NULL DEFAULT '',
    `student_id`    VARCHAR(20)  DEFAULT NULL,
    `role`          ENUM('admin','operation') NOT NULL DEFAULT 'operation',
    `allowed_pages` JSON         DEFAULT NULL,
    `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS `sections` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `name`       VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS `majors` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `name`       VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS `students` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` VARCHAR(20)  NOT NULL UNIQUE,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name`  VARCHAR(100) NOT NULL,
    `section_id` INT DEFAULT NULL,
    `major_id`   INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`major_id`)   REFERENCES `majors`(`id`)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS `payment_requests` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `title`            VARCHAR(255)   NOT NULL,
    `target_sections`  JSON           NOT NULL,
    `amount_per_person` DECIMAL(12,2) NOT NULL,
    `created_by`       INT DEFAULT NULL,
    `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS `payments` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `request_id`    INT            NOT NULL,
    `student_id`    INT            NOT NULL,
    `is_paid`       TINYINT(1)     NOT NULL DEFAULT 0,
    `receipt_image` LONGTEXT       DEFAULT NULL,
    `paid_at`       TIMESTAMP      NULL DEFAULT NULL,
    FOREIGN KEY (`request_id`) REFERENCES `payment_requests`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS `expense_requests` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `title`        VARCHAR(255)  NOT NULL,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
    `description`  TEXT          DEFAULT NULL,
    `status`       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    `created_by`   INT DEFAULT NULL,
    `approved_by`  INT DEFAULT NULL,
    `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`)  REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS `expense_items` (
    `id`                  INT AUTO_INCREMENT PRIMARY KEY,
    `expense_request_id`  INT           NOT NULL,
    `item_name`           VARCHAR(255)  NOT NULL,
    `price`               DECIMAL(12,2) NOT NULL,
    `quantity`            INT           NOT NULL DEFAULT 1,
    FOREIGN KEY (`expense_request_id`) REFERENCES `expense_requests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
try { $pdo->exec("ALTER TABLE `expense_items` ADD COLUMN `quantity` INT NOT NULL DEFAULT 1"); } catch (Exception $e) {}

$pdo->exec("CREATE TABLE IF NOT EXISTS `budget_additions` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `amount`      DECIMAL(12,2) NOT NULL,
    `description` VARCHAR(255)  NOT NULL,
    `created_by`  INT DEFAULT NULL,
    `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS `departments` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `name`       VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

// ─── Audit log: records every authenticated mutating request (POST/PUT/PATCH/DELETE)
$pdo->exec("CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id`         BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id`    INT          DEFAULT NULL,
    `username`   VARCHAR(100) DEFAULT NULL,
    `method`     VARCHAR(10)  NOT NULL,
    `endpoint`   VARCHAR(255) NOT NULL,
    `detail`     TEXT         DEFAULT NULL,
    `ip`         VARCHAR(45)  DEFAULT NULL,
    `created_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

// ─── Site visits: one row per page load (used for website visit count) ────────
$pdo->exec("CREATE TABLE IF NOT EXISTS `site_visits` (
    `id`         BIGINT AUTO_INCREMENT PRIMARY KEY,
    `path`       VARCHAR(255) DEFAULT NULL,
    `ip`         VARCHAR(45)  DEFAULT NULL,
    `user_agent` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_visit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

// ─── Auto-migration: add profile_image column if missing ─────────────────────
try {
    $pdo->exec("ALTER TABLE `users` ADD COLUMN `profile_image` LONGTEXT DEFAULT NULL");
} catch (PDOException $e) { /* column already exists */ }

// ─── Auto-migration: add department_id to users ───────────────────────────────
try { $pdo->exec("ALTER TABLE `users` ADD COLUMN `department_id` INT DEFAULT NULL"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE `users` ADD CONSTRAINT `fk_users_dept` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL"); } catch (PDOException $e) {}

// ─── Auto-migration: add updated_at to payments (for real-time change detection)
try {
    $pdo->exec("ALTER TABLE `payments` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
} catch (PDOException $e) { /* column already exists */ }

// ─── Auto-migration: signature + approval rights on users ─────────────────────
try { $pdo->exec("ALTER TABLE `users` ADD COLUMN `signature` LONGTEXT DEFAULT NULL"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE `users` ADD COLUMN `can_approve_expenses` TINYINT(1) NOT NULL DEFAULT 0"); } catch (PDOException $e) {}

// ─── Auto-migration: requester info + approved_at on expense_requests ─────────
try { $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `requester_name` VARCHAR(200) DEFAULT NULL"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `requester_signature` LONGTEXT DEFAULT NULL"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `approved_at` TIMESTAMP NULL DEFAULT NULL"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `receipt_images` LONGTEXT DEFAULT NULL"); } catch (PDOException $e) {}

// ─── Seed: insert default users only when the table is empty ─────────────────

$userCount = (int)$pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
if ($userCount === 0) {
    $allPages = json_encode(['/', '/payments', '/expenses', '/budget', '/students', '/sections', '/majors', '/users']);
    $opPages  = json_encode(['/', '/payments', '/expenses', '/students']);

    $stmt = $pdo->prepare(
        "INSERT INTO `users` (username, password_hash, name, role, allowed_pages) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute(['admin', password_hash('admin123', PASSWORD_BCRYPT), 'ผู้ดูแลระบบ',           'admin',     $allPages]);
    $stmt->execute(['op1',   password_hash('op1123',   PASSWORD_BCRYPT), 'เจ้าหน้าที่ปฏิบัติการ', 'operation', $opPages]);
}
