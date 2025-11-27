# 🎓 Recoletos Student Document Request Tracker

A role-based web application for managing academic document requests at the University of San Jose–Recoletos (USJ-R).

## 🎨 Branding

- **Primary Color (Recoletos Green):** `#004225`
- **Accent Color (Recoletos Gold):** `#E4B429`
- **Background:** `#FAF7F0`
- **Text:** `#1A1A1A`
- **Borders:** `#E5E7EB`

## 👥 User Roles

### Student
- Submit document requests
- Track request status
- View request history
- Receive notifications

### Faculty
- Approve/decline academic-related requests
- Add comments to approvals
- Track pending approvals
- View approval history

### Administrative Staff
- View and process all requests
- Update request statuses
- Add internal notes
- Filter and search requests
- Coordinate with faculty

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or later
- npm
- MySQL Server 8.x (or compatible MariaDB)

### Installation & Setup

1. Install project dependencies:

   ```bash
   npm install
   ```

2. Create the database and run the schema script:

   ```bash
   mysql -u <user> -p -e "CREATE DATABASE IF NOT EXISTS recoletos_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u <user> -p recoletos_tracker < database/schema.sql
   ```

3. Configure environment variables. Create `.env` in the project root:

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=recoletos_tracker
   DB_USER=root
   DB_PASSWORD=your_password
   JWT_SECRET=replace_with_secure_value
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Visit `http://localhost:3000` to use the app (API lives under `/api`).

## 📁 Project Structure

```
SE-STUDENT-DOCUMENT-REQUEST-TRACKER/
├── STUDENT/          # Student portal files
├── FACULTY/          # Faculty portal files
├── ADMIN/            # Admin portal files
├── shared/           # Shared utilities and components
├── assets/           # Images, logos, icons
├── database/
│   └── schema.sql    # MySQL schema + seed data
├── server/           # Express routes, middleware, config
├── index.html        # Homepage
└── package.json      # Dependencies & scripts
```

## 🔐 Accounts

- Students self-register via the login modal (valid USJ-R ID required, e.g., `2022011084`).
- Faculty and administrative users should be inserted into the `users` table by an administrator after hashing their passwords.

## 🛠️ Technologies Used

- HTML5 & modular CSS (Recoletos palette)
- Vanilla JavaScript for portals and shared utilities
- Express.js + MySQL (`mysql2`) for the REST API
- JWT + bcrypt for authentication
- Multer for attachment uploads

## 📝 Features

- ✅ Modal-based authentication with JWT sessions
- ✅ Student self-service document submission
- ✅ Faculty approval workflow with remarks history
- ✅ Admin dashboards with filters, notes, priority, and assignment
- ✅ Department-aware document catalog with cross-department requests
- ✅ Notification bell (+ unread count) for every role
- ✅ Attachment uploads (JPG/PNG, 5 MB limit)
- ✅ Responsive UI consistent with Recoletos branding

## 📄 License

MIT License

## 👨‍💻 Development Notes

- Server entry point: `server.js`
- Business logic organised under `server/routes/*`
- Database helper: `server/config/db.js`
- Schema & seed data: `database/schema.sql`
- Attachments stored under `/uploads/<studentId>`

### Core API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/signup` | Student registration |
| POST | `/api/auth/login` | Obtain JWT token |
| GET | `/api/departments` | Department + document metadata |
| GET/POST/PATCH | `/api/requests` | Read/create/update requests |
| GET/PATCH | `/api/notifications` | Notification feed & unread state |
| GET | `/api/users/faculty` | Faculty directory (admin/faculty) |

All protected endpoints expect `Authorization: Bearer <token>` in the headers.

