-- ============================================================
-- Enterprise Knowledge Base Management System (EKBMS)
-- MySQL Database Schema  |  v2.0
-- 13 Tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS ekbms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ekbms_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- TABLE 1: roles
-- Admin, Author, Reviewer, Employee
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
    id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)     NOT NULL UNIQUE,
    description VARCHAR(255)    NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 2: users
-- All user accounts. Department stored as plain text (no FK needed).
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role_id         INT UNSIGNED    NOT NULL,
    department      VARCHAR(100)    NULL                  COMMENT 'e.g. HR, IT, Finance',
    employee_id     VARCHAR(50)     NULL UNIQUE,
    job_title       VARCHAR(150)    NULL,
    phone           VARCHAR(20)     NULL,
    avatar_url      VARCHAR(500)    NULL,
    bio             TEXT            NULL,
    is_active       BOOLEAN         DEFAULT TRUE,
    last_login_at   DATETIME        NULL,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_email     (email),
    INDEX idx_role      (role_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 3: categories
-- Hierarchical via parent_id (supports sub-categories).
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)    NOT NULL,
    slug        VARCHAR(200)    NOT NULL UNIQUE,
    description TEXT            NULL,
    parent_id   INT UNSIGNED    NULL                      COMMENT 'NULL = top-level category',
    icon        VARCHAR(10)     NULL                      COMMENT 'Emoji or icon name',
    color_code  VARCHAR(10)     NULL                      COMMENT 'Hex e.g. #3B82F6',
    sort_order  INT             DEFAULT 0,
    is_active   BOOLEAN         DEFAULT TRUE,
    created_by  INT UNSIGNED    NOT NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id)  REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)      ON DELETE RESTRICT,
    INDEX idx_parent   (parent_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 4: tags
-- Reusable labels that can be applied to any article.
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    slug        VARCHAR(120)    NOT NULL UNIQUE,
    color_code  VARCHAR(10)     NULL,
    usage_count INT UNSIGNED    DEFAULT 0,
    created_by  INT UNSIGNED    NOT NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_name (name)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 5: articles
-- Core knowledge articles. view_count is a lightweight counter
-- (no separate views table needed).
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
    id                  INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    title               VARCHAR(500)    NOT NULL,
    slug                VARCHAR(600)    NOT NULL UNIQUE,
    summary             TEXT            NULL                  COMMENT 'Short excerpt shown in listings',
    content             LONGTEXT        NOT NULL,
    category_id         INT UNSIGNED    NOT NULL,
    author_id           INT UNSIGNED    NOT NULL,
    status              ENUM('draft','pending_review','approved',
                             'rejected','published','archived')
                                        DEFAULT 'draft',
    visibility          ENUM('public','internal','private')  DEFAULT 'internal',
    is_featured         BOOLEAN         DEFAULT FALSE,
    view_count          INT UNSIGNED    DEFAULT 0,
    avg_rating          DECIMAL(3,2)    DEFAULT 0.00,
    rating_count        INT UNSIGNED    DEFAULT 0,
    version_number      INT UNSIGNED    DEFAULT 1,
    read_time_minutes   INT UNSIGNED    NULL,
    published_at        DATETIME        NULL,
    archived_at         DATETIME        NULL,
    created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (author_id)   REFERENCES users(id)      ON DELETE RESTRICT,
    FULLTEXT INDEX ft_search  (title, content, summary),
    INDEX idx_status        (status),
    INDEX idx_author        (author_id),
    INDEX idx_category      (category_id),
    INDEX idx_published_at  (published_at),
    INDEX idx_view_count    (view_count)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 6: article_tags
-- Many-to-many join between articles and tags.
-- ============================================================
CREATE TABLE IF NOT EXISTS article_tags (
    article_id  INT UNSIGNED    NOT NULL,
    tag_id      INT UNSIGNED    NOT NULL,
    added_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)     REFERENCES tags(id)     ON DELETE CASCADE,
    INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 7: article_versions
-- Saves a snapshot every time an article is updated.
-- Enables "version history" and rollback.
-- ============================================================
CREATE TABLE IF NOT EXISTS article_versions (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    article_id      INT UNSIGNED    NOT NULL,
    version_number  INT UNSIGNED    NOT NULL,
    title           VARCHAR(500)    NOT NULL,
    content         LONGTEXT        NOT NULL,
    summary         TEXT            NULL,
    changed_by      INT UNSIGNED    NOT NULL,
    change_note     VARCHAR(300)    NULL                  COMMENT 'What changed in this version',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id)  ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)     ON DELETE RESTRICT,
    UNIQUE KEY uq_article_version (article_id, version_number),
    INDEX idx_article (article_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 8: attachments
-- Files uploaded and linked to articles.
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    article_id      INT UNSIGNED    NOT NULL,
    uploaded_by     INT UNSIGNED    NOT NULL,
    original_name   VARCHAR(500)    NOT NULL,
    stored_name     VARCHAR(500)    NOT NULL              COMMENT 'UUID-based filename on disk',
    file_path       VARCHAR(1000)   NOT NULL,
    file_type       VARCHAR(100)    NULL                  COMMENT 'MIME type',
    file_extension  VARCHAR(20)     NULL,
    file_size_bytes BIGINT UNSIGNED NOT NULL,
    download_count  INT UNSIGNED    DEFAULT 0,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id)  REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)    ON DELETE RESTRICT,
    INDEX idx_article (article_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 9: approval_workflows
-- One row per approval request. Reviewer comment is inline
-- (no separate table needed for a capstone).
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_workflows (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    article_id      INT UNSIGNED    NOT NULL,
    submitted_by    INT UNSIGNED    NOT NULL,
    reviewer_id     INT UNSIGNED    NULL,
    status          ENUM('pending','under_review',
                         'approved','rejected','revision_requested')
                                    DEFAULT 'pending',
    author_note     TEXT            NULL                  COMMENT 'Author message to reviewer',
    reviewer_comment TEXT           NULL                  COMMENT 'Reviewer feedback to author',
    submitted_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
    reviewed_at     DATETIME        NULL,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id)   REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id)    ON DELETE RESTRICT,
    FOREIGN KEY (reviewer_id)  REFERENCES users(id)    ON DELETE SET NULL,
    INDEX idx_article    (article_id),
    INDEX idx_reviewer   (reviewer_id),
    INDEX idx_status     (status)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 10: comments
-- User comments on published articles. Supports one level
-- of threaded replies via parent_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    article_id  INT UNSIGNED    NOT NULL,
    user_id     INT UNSIGNED    NOT NULL,
    parent_id   INT UNSIGNED    NULL                      COMMENT 'For replies to a comment',
    content     TEXT            NOT NULL,
    is_edited   BOOLEAN         DEFAULT FALSE,
    is_approved BOOLEAN         DEFAULT TRUE,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (parent_id)  REFERENCES comments(id)   ON DELETE CASCADE,
    INDEX idx_article (article_id),
    INDEX idx_user    (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 11: article_ratings
-- One rating per user per article (1–5 stars).
-- avg_rating and rating_count are denormalised on articles
-- for fast reads; updated via app logic on insert/update.
-- ============================================================
CREATE TABLE IF NOT EXISTS article_ratings (
    id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    article_id  INT UNSIGNED    NOT NULL,
    user_id     INT UNSIGNED    NOT NULL,
    rating      TINYINT UNSIGNED NOT NULL                 COMMENT '1 to 5',
    feedback    TEXT            NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_article (user_id, article_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    INDEX idx_article (article_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 12: bookmarks
-- Users saving articles for later.
-- ============================================================
CREATE TABLE IF NOT EXISTS bookmarks (
    id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED    NOT NULL,
    article_id  INT UNSIGNED    NOT NULL,
    note        VARCHAR(300)    NULL                      COMMENT 'Personal bookmark note',
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_article (user_id, article_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_user    (user_id),
    INDEX idx_article (article_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 13: notifications
-- In-app notifications triggered by workflow events.
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NOT NULL              COMMENT 'Recipient',
    triggered_by    INT UNSIGNED    NULL                  COMMENT 'Who caused the notification',
    type            ENUM(
                        'article_approved',
                        'article_rejected',
                        'revision_requested',
                        'article_submitted',
                        'comment_added',
                        'article_published'
                    )               NOT NULL,
    title           VARCHAR(300)    NOT NULL,
    message         TEXT            NOT NULL,
    link_url        VARCHAR(500)    NULL,
    is_read         BOOLEAN         DEFAULT FALSE,
    read_at         DATETIME        NULL,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created_at  (created_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
