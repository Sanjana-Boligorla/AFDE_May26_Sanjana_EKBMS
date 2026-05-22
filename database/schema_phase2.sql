-- ============================================================
-- EKBMS Phase 2 — Schema Extensions
-- Run AFTER schema.sql (Phase 1)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- TABLE 14: etl_jobs
-- Tracks every ETL import / rollup execution.
-- ============================================================
CREATE TABLE IF NOT EXISTS etl_jobs (
    id                  INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    job_name            VARCHAR(150)    NOT NULL                    COMMENT 'Human-readable job label',
    job_type            ENUM(
                            'csv_import',
                            'json_import',
                            'analytics_rollup',
                            'cleanup'
                        )               NOT NULL,
    status              ENUM(
                            'pending',
                            'running',
                            'completed',
                            'failed',
                            'cancelled'
                        )               DEFAULT 'pending',
    source_file         VARCHAR(500)    NULL                        COMMENT 'Original filename uploaded/used',
    records_total       INT UNSIGNED    DEFAULT 0,
    records_processed   INT UNSIGNED    DEFAULT 0,
    records_failed      INT UNSIGNED    DEFAULT 0,
    records_skipped     INT UNSIGNED    DEFAULT 0,
    error_message       TEXT            NULL,
    config_snapshot     JSON            NULL                        COMMENT 'Job config params at run-time',
    started_at          DATETIME        NULL,
    completed_at        DATETIME        NULL,
    triggered_by        INT UNSIGNED    NULL,
    created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status      (status),
    INDEX idx_job_type    (job_type),
    INDEX idx_created_at  (created_at)
) ENGINE=InnoDB COMMENT='ETL pipeline execution history';

-- ============================================================
-- TABLE 15: etl_job_logs
-- Line-by-line log output for each ETL job.
-- ============================================================
CREATE TABLE IF NOT EXISTS etl_job_logs (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id      INT UNSIGNED    NOT NULL,
    level       ENUM('info','warn','error','debug') DEFAULT 'info',
    message     TEXT            NOT NULL,
    `row_number` INT UNSIGNED   NULL                COMMENT 'Source row that caused this log entry',
    metadata    JSON            NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES etl_jobs(id) ON DELETE CASCADE,
    INDEX idx_job_id    (job_id),
    INDEX idx_level     (level),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='Detailed per-row ETL execution logs';

-- ============================================================
-- TABLE 16: analytics_events
-- Raw event stream — every meaningful user interaction.
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id      INT UNSIGNED    NULL,
    event_type      ENUM(
                        'view',
                        'search_click',
                        'bookmark_add',
                        'bookmark_remove',
                        'comment_add',
                        'rating_submit',
                        'download',
                        'share',
                        'time_on_page'
                    )               NOT NULL,
    user_id         INT UNSIGNED    NULL,
    session_id      VARCHAR(64)     NULL,
    referrer        VARCHAR(500)    NULL,
    time_spent_sec  INT UNSIGNED    NULL                COMMENT 'For time_on_page events',
    ip_address      VARCHAR(45)     NULL,
    user_agent      VARCHAR(300)    NULL,
    extra           JSON            NULL                COMMENT 'Extra event-specific payload',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
    INDEX idx_article_id  (article_id),
    INDEX idx_event_type  (event_type),
    INDEX idx_user_id     (user_id),
    INDEX idx_created_at  (created_at)
) ENGINE=InnoDB COMMENT='Raw analytics event stream';

-- ============================================================
-- TABLE 17: search_analytics
-- Tracks every search query with result and click data.
-- ============================================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id                  INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    query               VARCHAR(500)    NOT NULL,
    results_count       INT UNSIGNED    DEFAULT 0,
    clicked_article_id  INT UNSIGNED    NULL,
    user_id             INT UNSIGNED    NULL,
    session_id          VARCHAR(64)     NULL,
    category_filter     VARCHAR(100)    NULL,
    tag_filter          VARCHAR(100)    NULL,
    created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clicked_article_id) REFERENCES articles(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id)            REFERENCES users(id)    ON DELETE SET NULL,
    INDEX idx_query      (query(100)),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id    (user_id)
) ENGINE=InnoDB COMMENT='Search query analytics log';

-- ============================================================
-- TABLE 18: content_analytics
-- Daily per-article rollup — pre-aggregated for fast reporting.
-- ============================================================
CREATE TABLE IF NOT EXISTS content_analytics (
    id                  INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    article_id          INT UNSIGNED    NOT NULL,
    date                DATE            NOT NULL,
    views               INT UNSIGNED    DEFAULT 0,
    unique_views        INT UNSIGNED    DEFAULT 0,
    avg_time_spent_sec  DECIMAL(8,2)    DEFAULT 0,
    search_appearances  INT UNSIGNED    DEFAULT 0,
    bookmark_adds       INT UNSIGNED    DEFAULT 0,
    comment_adds        INT UNSIGNED    DEFAULT 0,
    rating_submits      INT UNSIGNED    DEFAULT 0,
    created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_article_date (article_id, date),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_date       (date),
    INDEX idx_article_id (article_id)
) ENGINE=InnoDB COMMENT='Daily per-article analytics rollup';

SET FOREIGN_KEY_CHECKS = 1;
