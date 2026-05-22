# Enterprise Knowledge Base Management System (EKBMS)

> Capstone Project — AFDE_May26_Sanjana_EKBMS

A full-stack enterprise-grade knowledge management platform that enables organizations to centralize, manage, and distribute knowledge resources across departments and teams.

---

## 🚀 Features

- **Role-Based Access Control** — Admin, Author, Reviewer, Employee, HR, Support
- **Article Lifecycle Management** — Draft → Review → Approve → Publish → Archive
- **Rich Text Editor** — Quill.js powered article creation with formatting support
- **Hierarchical Categories** — Multi-level category and tag organization
- **File Attachments** — Upload PDFs, DOCX, images linked to articles
- **Approval Workflow** — Submit → Review → Approve/Reject with comments
- **Search & Filtering** — Full-text search with category, tag, and author filters
- **Collaboration** — Comments, star ratings, and bookmarks on articles
- **Analytics Dashboard** — View counts, popular articles, search trends, user activity
- **Version Control** — Complete edit history for every article
- **Notifications** — In-app notifications for workflow events

---

## 🛠️ Technology Stack

| Layer     | Technology                          |
|-----------|--------------------------------------|
| Frontend  | React.js + Tailwind CSS + Quill.js  |
| Backend   | Node.js + Express.js                |
| Database  | MySQL 8.0+                           |
| Auth      | JWT (JSON Web Tokens) + bcryptjs     |
| Files     | Multer (local disk storage)          |
| Tools     | Postman, VS Code, GitHub             |

---

## 📁 Project Structure

```
AFDE_May26_Sanjana_EKBMS/
├── frontend/               # React + Tailwind CSS frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Route-level page components
│       ├── services/       # Axios API service calls
│       ├── context/        # React Context (Auth, etc.)
│       └── utils/          # Helper functions
├── backend/                # Node.js + Express API
│   └── src/
│       ├── controllers/    # Business logic
│       ├── routes/         # Express route definitions
│       ├── middleware/     # Auth, validation, error handling
│       ├── models/         # DB query helpers
│       ├── config/         # DB, Multer configuration
│       └── utils/          # Shared utilities
├── database/
│   ├── schema.sql          # Full MySQL schema (21 tables)
│   └── seed.sql            # Realistic sample data
├── docs/                   # API documentation
├── screenshots/            # UI screenshots
├── README.md
└── .gitignore
```

---

## ⚙️ Setup Instructions

### Prerequisites

- Node.js >= 18.x
- MySQL 8.0+
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/Sanjana-Boligorla/AFDE_May26_Sanjana_EKBMS.git
cd AFDE_May26_Sanjana_EKBMS
```

### 2. Database Setup

```bash
# Log in to MySQL
mysql -u root -p

# Run schema (creates database + all tables)
SOURCE database/schema.sql;

# Load sample data
SOURCE database/seed.sql;
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env — set DB_PASSWORD and other values

# Start development server
npm run dev
```

Backend runs at: `http://localhost:5000`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start React development server
npm start
```

Frontend runs at: `http://localhost:3000`

---

## 🔑 Default Test Accounts

| Role     | Email                  | Password      |
|----------|------------------------|---------------|
| Admin    | admin@ekbms.com        | Password@123  |
| Author   | sarah.c@ekbms.com      | Password@123  |
| Reviewer | emily.r@ekbms.com      | Password@123  |
| Employee | michael.b@ekbms.com    | Password@123  |
| HR       | priya.s@ekbms.com      | Password@123  |
| Support  | david.k@ekbms.com      | Password@123  |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint                    | Description              | Auth |
|--------|-----------------------------|--------------------------|------|
| POST   | `/api/auth/register`        | Register new user        | No   |
| POST   | `/api/auth/login`           | Login and get JWT token  | No   |
| POST   | `/api/auth/logout`          | Revoke session token     | Yes  |
| GET    | `/api/auth/me`              | Get current user profile | Yes  |
| PUT    | `/api/auth/me`              | Update profile           | Yes  |
| PUT    | `/api/auth/change-password` | Change password          | Yes  |

*(More endpoints added in Milestone 2)*

---

## 🗄️ Database Schema

The database consists of **13 tables**:

| Table               | Purpose                                        |
|---------------------|------------------------------------------------|
| roles               | System roles (Admin, Author, Reviewer, etc.)   |
| users               | User accounts with role and department         |
| categories          | Hierarchical article categories (parent_id)    |
| tags                | Reusable article labels                        |
| articles            | Core knowledge articles with view counter      |
| article_tags        | Articles ↔ tags (many-to-many)                 |
| article_versions    | Full edit history / version snapshots          |
| attachments         | File attachments linked to articles            |
| approval_workflows  | Article approval lifecycle with reviewer notes |
| comments            | Threaded user comments on articles             |
| article_ratings     | Star ratings (1–5) per user per article        |
| bookmarks           | User saved/favourite articles                  |
| notifications       | In-app notifications for workflow events       |

---

## 📸 Screenshots

*(Added after frontend completion in Milestone 3)*

---

## 👩‍💻 Author

**Sanjana** — AFDE Batch May 2026  
GitHub: [Sanjana-Boligorla](https://github.com/Sanjana-Boligorla)
