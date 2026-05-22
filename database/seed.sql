-- ============================================================
-- Enterprise Knowledge Base Management System (EKBMS)
-- Seed Data  |  v2.0  (matches 13-table schema)
-- ============================================================

USE ekbms_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Roles
-- ============================================================
INSERT INTO roles (id, name, description) VALUES
(1, 'admin',    'Full system access — manage users, categories, and analytics'),
(2, 'author',   'Create and manage articles, submit for review'),
(3, 'reviewer', 'Review, approve, or reject submitted articles'),
(4, 'employee', 'Read articles, bookmark, comment, and rate content'),
(5, 'hr',       'Upload HR policies and onboarding documents'),
(6, 'support',  'Publish troubleshooting solutions');

-- ============================================================
-- Users  (all passwords = bcrypt hash of "Password@123")
-- ============================================================
INSERT INTO users (id, first_name, last_name, email, password_hash, role_id, department, employee_id, job_title, is_active) VALUES
(1, 'Admin',   'System',  'admin@ekbms.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 1, 'IT',          'EMP001', 'System Administrator',     TRUE),
(2, 'Sarah',   'Connor',  'sarah.c@ekbms.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 2, 'IT',          'EMP002', 'Senior Technical Writer',  TRUE),
(3, 'James',   'Wilson',  'james.w@ekbms.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 2, 'Engineering', 'EMP003', 'Software Engineer',        TRUE),
(4, 'Emily',   'Rogers',  'emily.r@ekbms.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 3, 'IT',          'EMP004', 'Knowledge Review Manager', TRUE),
(5, 'Michael', 'Brown',   'michael.b@ekbms.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 4, 'Operations',  'EMP005', 'Operations Analyst',       TRUE),
(6, 'Priya',   'Sharma',  'priya.s@ekbms.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 5, 'HR',          'EMP006', 'HR Business Partner',      TRUE),
(7, 'David',   'Kim',     'david.k@ekbms.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 6, 'Support',     'EMP007', 'Technical Support Lead',   TRUE),
(8, 'Linda',   'Zhang',   'linda.z@ekbms.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 2, 'Engineering', 'EMP008', 'DevOps Engineer',          TRUE),
(9, 'Tom',     'Harris',  'tom.h@ekbms.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 3, 'Engineering', 'EMP009', 'Senior Reviewer',          TRUE),
(10,'Aisha',   'Khan',    'aisha.k@ekbms.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPZJe4Uyq76', 4, 'Finance',     'EMP010', 'Finance Analyst',          TRUE);

-- ============================================================
-- Categories  (top-level + sub-categories)
-- ============================================================
INSERT INTO categories (id, name, slug, description, parent_id, icon, color_code, sort_order, created_by) VALUES
-- Top-level
(1,  'HR Policies',       'hr-policies',       'HR policies, procedures, and employee guides',  NULL, '👥', '#3B82F6', 1, 1),
(2,  'IT Support',        'it-support',        'IT troubleshooting, setup guides, and FAQs',    NULL, '💻', '#10B981', 2, 1),
(3,  'Infrastructure',    'infrastructure',    'Network, server, and cloud infrastructure docs', NULL, '🏗️', '#8B5CF6', 3, 1),
(4,  'Training',          'training',          'Employee training and learning resources',       NULL, '📚', '#F59E0B', 4, 1),
(5,  'Finance',           'finance',           'Financial processes, policies, and guides',      NULL, '💰', '#EF4444', 5, 1),
(6,  'Operations',        'operations',        'Operational procedures and SOPs',                NULL, '⚙️', '#6366F1', 6, 1),
(7,  'Onboarding',        'onboarding',        'New employee onboarding documentation',          NULL, '🚀', '#EC4899', 7, 1),
-- Sub-categories under IT Support
(8,  'Software Issues',   'software-issues',   'Application and software troubleshooting',       2,    '🖥️', '#10B981', 1, 1),
(9,  'Network & VPN',     'network-vpn',       'Network connectivity and VPN setup guides',      2,    '🌐', '#10B981', 2, 1),
(10, 'Security & Access', 'security-access',   'Security policies and access management',        2,    '🔒', '#10B981', 3, 1),
-- Sub-categories under HR
(11, 'Leave Policies',    'leave-policies',    'Annual, sick, and casual leave policies',        1,    '🏖️', '#3B82F6', 1, 1),
(12, 'Code of Conduct',   'code-of-conduct',   'Workplace conduct and ethics guidelines',        1,    '📋', '#3B82F6', 2, 1),
-- Sub-categories under Training
(13, 'Technical Training','technical-training','Dev, QA, and DevOps technical courses',          4,    '🔧', '#F59E0B', 1, 1),
(14, 'Soft Skills',       'soft-skills',       'Communication, leadership, and teamwork',        4,    '🤝', '#F59E0B', 2, 1);

-- ============================================================
-- Tags
-- ============================================================
INSERT INTO tags (id, name, slug, color_code, created_by) VALUES
(1,  'Password Reset',  'password-reset',  '#EF4444', 1),
(2,  'VPN',             'vpn',             '#8B5CF6', 1),
(3,  'Onboarding',      'onboarding',      '#EC4899', 1),
(4,  'Security',        'security',        '#F59E0B', 1),
(5,  'Windows',         'windows',         '#3B82F6', 1),
(6,  'Email',           'email',           '#10B981', 1),
(7,  'Remote Work',     'remote-work',     '#14B8A6', 1),
(8,  'Cloud',           'cloud',           '#0EA5E9', 1),
(9,  'FAQ',             'faq',             '#84CC16', 1),
(10, 'SOP',             'sop',             '#F97316', 1),
(11, 'Policy',          'policy',          '#A78BFA', 1),
(12, 'Troubleshooting', 'troubleshooting', '#FCD34D', 1),
(13, 'Best Practices',  'best-practices',  '#34D399', 1),
(14, 'HR',              'hr',              '#C084FC', 1),
(15, 'Training',        'training',        '#FB7185', 1);

-- ============================================================
-- Articles
-- ============================================================
INSERT INTO articles (id, title, slug, summary, content, category_id, author_id, status, visibility, is_featured, view_count, avg_rating, rating_count, version_number, published_at) VALUES

(1,
 'How to Reset Your Corporate Password',
 'how-to-reset-your-corporate-password',
 'Step-by-step guide for resetting your Active Directory password through the self-service portal or IT helpdesk.',
 '<h2>Overview</h2><p>Your corporate password can be reset using the Self-Service Password Reset (SSPR) portal or by contacting the IT Helpdesk.</p><h2>Method 1: Self-Service Portal</h2><ol><li>Navigate to <strong>https://sspr.company.com</strong></li><li>Click "I forgot my password"</li><li>Enter your registered email address</li><li>Complete identity verification via authenticator app or SMS</li><li>Set a new password following the password policy below</li></ol><h2>Password Policy</h2><ul><li>Minimum 12 characters</li><li>At least one uppercase letter</li><li>At least one number and one special character</li><li>Cannot reuse the last 10 passwords</li></ul><h2>Method 2: IT Helpdesk</h2><p>Call <strong>ext. 4357</strong> or email <strong>itsupport@company.com</strong>. Have your Employee ID ready for identity verification.</p>',
 8, 2, 'published', 'internal', TRUE, 245, 4.50, 18, 1, '2024-01-15 09:00:00'),

(2,
 'VPN Setup Guide for Remote Employees',
 'vpn-setup-guide-remote-employees',
 'Complete instructions for installing and configuring the corporate VPN on Windows and macOS.',
 '<h2>Overview</h2><p>All remote employees must connect to the corporate network via VPN before accessing internal resources.</p><h2>Prerequisites</h2><ul><li>Corporate or approved personal device</li><li>VPN credentials from IT (sent on joining)</li></ul><h2>Windows Installation</h2><ol><li>Download Cisco AnyConnect from the IT portal</li><li>Run the installer as Administrator</li><li>Launch Cisco AnyConnect from the Start Menu</li><li>Enter server: <strong>vpn.company.com</strong></li><li>Log in with your corporate credentials and approve the MFA prompt</li></ol><h2>macOS Installation</h2><ol><li>Download the .dmg file from the IT portal</li><li>Drag to Applications and follow the same steps above</li></ol><h2>Troubleshooting</h2><p>If you cannot connect, verify your internet connection and that your password has not expired. Contact IT at itsupport@company.com.</p>',
 9, 2, 'published', 'internal', TRUE, 312, 4.70, 25, 1, '2024-01-20 10:30:00'),

(3,
 'Employee Leave Policy 2024',
 'employee-leave-policy-2024',
 'Comprehensive guide to annual leave, sick leave, and casual leave entitlements for all employees.',
 '<h2>Annual Leave</h2><ul><li><strong>Less than 5 years tenure:</strong> 20 days/year</li><li><strong>5+ years tenure:</strong> 25 days/year</li><li>Apply at least 7 days in advance</li></ul><h2>Sick Leave</h2><ul><li>10 days/year fully paid</li><li>Medical certificate required for 3+ consecutive days</li></ul><h2>Casual Leave</h2><ul><li>5 days/year for personal emergencies</li><li>Non-carryforward — lapses at year end</li></ul><h2>Maternity / Paternity Leave</h2><ul><li>Maternity: 26 weeks fully paid</li><li>Paternity: 10 days fully paid</li></ul><h2>How to Apply</h2><ol><li>Log in to HR Portal at hrportal.company.com</li><li>Go to Leave Management → Apply Leave</li><li>Select type and dates, then submit for manager approval</li></ol>',
 11, 6, 'published', 'internal', TRUE, 189, 4.30, 22, 2, '2024-02-01 08:00:00'),

(4,
 'New Employee Onboarding Checklist',
 'new-employee-onboarding-checklist',
 'Day-by-day checklist covering first-week activities, system access setup, and mandatory trainings.',
 '<h2>Day 1 — Orientation</h2><ul><li>Attend HR induction (9:00 AM, HR Conference Room)</li><li>Collect ID badge from Security Desk</li><li>Meet your buddy/mentor</li><li>Set up laptop with IT assistance</li><li>Activate corporate email</li><li>Complete Data Protection training (mandatory)</li></ul><h2>Day 2 — System Access</h2><ul><li>Set up VPN (see VPN Setup Guide)</li><li>Update personal details on HR Portal</li><li>Join department Slack/Teams channels</li><li>Complete IT Security Awareness training</li></ul><h2>Week 1 — Integration</h2><ul><li>Meet key stakeholders and team members</li><li>Review department SOPs</li><li>Complete role-specific training</li><li>Schedule 1:1 with manager</li><li>Sign Code of Conduct</li></ul><h2>Key Contacts</h2><ul><li><strong>HR:</strong> Priya Sharma — priya.s@company.com</li><li><strong>IT Helpdesk:</strong> itsupport@company.com / ext. 4357</li></ul>',
 7, 6, 'published', 'internal', TRUE, 156, 4.60, 14, 1, '2024-01-10 08:00:00'),

(5,
 'Troubleshooting Common Outlook Issues',
 'troubleshooting-common-outlook-issues',
 'Fixes for the most common Outlook problems — connection errors, calendar sync issues, and slow performance.',
 '<h2>Issue 1: Outlook Not Connecting</h2><p><strong>Symptoms:</strong> "Disconnected" or "Trying to connect" in status bar.</p><ol><li>Check your internet / VPN connection</li><li>Restart Outlook (File → Exit, reopen)</li><li>Check Office 365 status at status.office.com</li><li>Run Quick Repair: Control Panel → Programs → Microsoft Office → Change → Quick Repair</li></ol><h2>Issue 2: Calendar Not Syncing</h2><ol><li>Press F9 to Send/Receive All Folders</li><li>Remove and re-add your email account</li><li>Clear the .ost cache file and let Outlook rebuild it</li></ol><h2>Issue 3: Slow Performance</h2><ol><li>Compact the .pst file (File → Account Settings → Data Files)</li><li>Disable unnecessary add-ins (File → Options → Add-ins)</li><li>Archive emails older than 1 year</li></ol><p>Still stuck? Submit a ticket at helpdesk.company.com or call ext. 4357.</p>',
 8, 7, 'published', 'internal', FALSE, 203, 4.20, 16, 1, '2024-02-10 11:00:00'),

(6,
 'Cloud Infrastructure Best Practices',
 'cloud-infrastructure-best-practices',
 'Standards for AWS and Azure resource provisioning, naming conventions, tagging, and security requirements.',
 '<h2>Resource Naming Convention</h2><p>All cloud resources must follow: <code>[env]-[team]-[resource-type]-[identifier]</code></p><p>Examples: <code>prod-eng-ec2-webserver01</code>, <code>dev-data-s3-backups</code></p><h2>Mandatory Tags on Every Resource</h2><ul><li><strong>Environment:</strong> prod / staging / dev</li><li><strong>Team:</strong> engineering / operations / data</li><li><strong>CostCenter:</strong> department code</li><li><strong>Owner:</strong> owner email</li></ul><h2>Security Requirements</h2><ul><li>No public S3 buckets without explicit approval</li><li>All EC2 access via SSM — no direct SSH from internet</li><li>Secrets stored in AWS Secrets Manager / Azure Key Vault</li><li>MFA mandatory for all console access</li></ul><h2>Cost Optimization</h2><ul><li>Use Reserved Instances for production workloads (&gt;1 year)</li><li>Set up Cost Anomaly Detection alerts</li><li>Terminate unused resources within 48 hours</li></ul>',
 3, 8, 'published', 'internal', FALSE, 98, 4.80, 8, 3, '2024-03-01 14:00:00'),

-- Draft article (not yet published)
(7,
 'Introduction to Agile and Scrum',
 'introduction-agile-scrum',
 'A beginner-friendly overview of Agile methodology and Scrum framework for new team members.',
 '<h2>What is Agile?</h2><p>Agile is an iterative approach to software development that emphasises flexibility, collaboration, and continuous delivery.</p><h2>Scrum Framework</h2><p>Scrum divides work into fixed-length iterations called Sprints (typically 2 weeks).</p><h2>Key Ceremonies</h2><ul><li><strong>Sprint Planning</strong> — Define what to deliver</li><li><strong>Daily Standup</strong> — 15-min sync on progress and blockers</li><li><strong>Sprint Review</strong> — Demo completed work</li><li><strong>Sprint Retrospective</strong> — Reflect and improve the process</li></ul>',
 13, 3, 'draft', 'internal', FALSE, 0, 0.00, 0, 1, NULL);

-- ============================================================
-- Article Tags
-- ============================================================
INSERT INTO article_tags (article_id, tag_id) VALUES
(1, 1), (1, 4), (1, 5),           -- Password Reset: Password Reset, Security, Windows
(2, 2), (2, 4), (2, 7),           -- VPN: VPN, Security, Remote Work
(3, 14),(3, 11),(3, 10),          -- Leave Policy: HR, Policy, SOP
(4, 3), (4, 14),(4, 15),          -- Onboarding: Onboarding, HR, Training
(5, 6), (5, 12),(5, 9),           -- Outlook: Email, Troubleshooting, FAQ
(6, 8), (6, 13),(6, 4),           -- Cloud: Cloud, Best Practices, Security
(7, 15),(7, 13);                  -- Agile: Training, Best Practices

-- Update tag usage counts
UPDATE tags t
SET usage_count = (SELECT COUNT(*) FROM article_tags at WHERE at.tag_id = t.id);

-- ============================================================
-- Article Versions  (history for articles that were edited)
-- ============================================================
INSERT INTO article_versions (article_id, version_number, title, content, summary, changed_by, change_note) VALUES
(3, 1,
 'Employee Leave Policy 2024',
 '<h2>Annual Leave</h2><p>Employees are entitled to 18 days per year...</p>',
 'Initial draft of leave policy',
 6, 'Initial draft'),
(3, 2,
 'Employee Leave Policy 2024',
 '<h2>Annual Leave</h2><p>Updated: 20 days for &lt;5 years, 25 days for 5+ years...</p>',
 'Updated entitlement per Q1 HR directive',
 6, 'Increased annual leave from 18 to 20 days; added maternity/paternity section'),

(6, 1,
 'Cloud Infrastructure Best Practices',
 '<h2>Overview</h2><p>Initial cloud guidelines draft...</p>',
 'Initial cloud guidelines',
 8, 'Initial draft'),
(6, 2,
 'Cloud Infrastructure Best Practices',
 '<h2>Overview</h2><p>Added Azure naming conventions...</p>',
 'Added Azure-specific content',
 8, 'Added Azure naming conventions and cost guidelines'),
(6, 3,
 'Cloud Infrastructure Best Practices',
 '<h2>Overview</h2><p>Final version with security requirements...</p>',
 'Added mandatory security section',
 9, 'Added security requirements reviewed by InfoSec team');

-- ============================================================
-- Approval Workflows
-- ============================================================
INSERT INTO approval_workflows (article_id, submitted_by, reviewer_id, status, author_note, reviewer_comment, submitted_at, reviewed_at) VALUES
(1, 2, 4, 'approved',  'Ready for review — standard IT password guide.', 'Clear and well-structured. Approved for publication.', '2024-01-14 14:00:00', '2024-01-15 08:30:00'),
(2, 2, 4, 'approved',  'Updated for the new Cisco AnyConnect client.', 'Good guide. Tested on Windows — works as described. Approved.', '2024-01-19 16:00:00', '2024-01-20 10:00:00'),
(3, 6, 9, 'approved',  'Updated with 2024 policy changes from Legal.', 'Comprehensive. Maternity/paternity section is a great addition. Approved.', '2024-01-31 11:00:00', '2024-02-01 07:30:00'),
(4, 6, 4, 'approved',  'New hire onboarding doc for Q1 2024.', 'Easy to follow checklist. Approved.', '2024-01-09 15:00:00', '2024-01-10 07:45:00'),
(5, 7, 9, 'approved',  'Compiled from most common support tickets.', 'Useful troubleshooting steps. Verified the Outlook fixes — all correct. Approved.', '2024-02-09 10:00:00', '2024-02-10 10:30:00'),
(6, 8, 9, 'approved',  'Final version — please check the security section.', 'Security requirements look solid after InfoSec review. Approved.', '2024-02-28 16:30:00', '2024-03-01 13:00:00'),
(7, 3, NULL, 'pending', 'Draft ready for initial review.', NULL, '2024-03-10 10:00:00', NULL);

-- ============================================================
-- Comments
-- ============================================================
INSERT INTO comments (article_id, user_id, parent_id, content, is_approved) VALUES
(1, 5,  NULL, 'This worked perfectly! The SSPR portal is much faster than calling the helpdesk. Thanks for the clear guide.', TRUE),
(1, 10, NULL, 'What if we do not have the authenticator app set up yet — is there a backup method?', TRUE),
(1, 2,  2,    'Great question! If the authenticator app is not set up, use the SMS backup option on the SSPR portal. If neither works, call IT Helpdesk at ext. 4357.', TRUE),
(2, 5,  NULL, 'Windows setup worked perfectly. The macOS section could use more detail for M1/M2 Macs though.', TRUE),
(2, 8,  4,    'Thanks for the feedback — I will update the macOS section with Apple Silicon specific notes in the next revision.', TRUE),
(3, 5,  NULL, 'Very comprehensive! Could you add a section covering unpaid leave as well?', TRUE),
(4, 10, NULL, 'Really helpful for my first week! The day-by-day format makes it easy to stay on track.', TRUE),
(5, 10, NULL, 'Deleting the .ost cache file fixed my calendar sync issue instantly. Great tip!', TRUE);

-- ============================================================
-- Article Ratings
-- ============================================================
INSERT INTO article_ratings (article_id, user_id, rating, feedback) VALUES
(1, 5,  5, 'Very clear and easy to follow'),
(1, 10, 4, 'Good guide — screenshots would make it even better'),
(2, 5,  5, 'Solved my VPN issue in under 5 minutes'),
(2, 10, 4, 'Clear instructions, worked on first attempt'),
(3, 5,  4, 'Comprehensive and well organized'),
(3, 7,  5, 'Very helpful for planning leave'),
(4, 10, 5, 'Made my first week so much easier'),
(5, 10, 4, 'Good troubleshooting steps, very practical'),
(6, 5,  5, 'Exactly what the engineering team needed — very thorough');

-- ============================================================
-- Bookmarks
-- ============================================================
INSERT INTO bookmarks (user_id, article_id, note) VALUES
(5,  1, 'Quick reference for password resets'),
(5,  2, 'VPN setup steps'),
(5,  4, 'Onboarding checklist'),
(10, 3, 'Leave policy reference'),
(10, 5, 'Outlook troubleshooting'),
(7,  2, 'VPN guide for support tickets'),
(7,  5, NULL),
(8,  6, 'Team infrastructure standards');

-- ============================================================
-- Notifications
-- ============================================================
INSERT INTO notifications (user_id, triggered_by, type, title, message, link_url, is_read) VALUES
(2, 4, 'article_approved',  'Article Approved',  'Your article "How to Reset Your Corporate Password" has been approved and published.', '/articles/how-to-reset-your-corporate-password', TRUE),
(2, 4, 'article_approved',  'Article Approved',  'Your article "VPN Setup Guide for Remote Employees" has been approved and published.', '/articles/vpn-setup-guide-remote-employees', TRUE),
(6, 9, 'revision_requested','Revision Requested', 'Tom Harris requested revisions on "Employee Leave Policy 2024". Please check the feedback.', '/articles/employee-leave-policy-2024', FALSE),
(2, 5, 'comment_added',     'New Comment',       'Michael Brown commented on "How to Reset Your Corporate Password".', '/articles/how-to-reset-your-corporate-password', FALSE),
(3, 4, 'article_submitted', 'Article Submitted', 'James Wilson submitted "Introduction to Agile and Scrum" for review.', '/approval-queue', FALSE);

SET FOREIGN_KEY_CHECKS = 1;
