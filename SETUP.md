# Setup Guide – Recoletos Document Request Tracker

## Prerequisites

- Node.js 18 or later
- npm (ships with Node)
- MySQL Server 8.x (or compatible MariaDB)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure MySQL

1. Create the database:

   ```sql
   CREATE DATABASE IF NOT EXISTS recoletos_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Apply the schema and seed data:

   ```bash
   mysql -u <user> -p recoletos_tracker < database/schema.sql
   ```

3. (Optional) seed sample admin/faculty accounts. Example:

   ```sql
   INSERT INTO users (role, id_number, email, password_hash, full_name, department_id, position)
   VALUES
     ('admin', 'ADM-001', 'registrar@usjr.edu.ph', '$2a$10$kZbE2SfyZKkLbXAjpMDpJer9XzoG3XrVh.QrS3Vv1kpfrx.ux7pQ.', 'Registrar Office', NULL, 'Registrar'),
     ('faculty', 'FAC-001', 'faculty@usjr.edu.ph', '$2a$10$kZbE2SfyZKkLbXAjpMDpJer9XzoG3XrVh.QrS3Vv1kpfrx.ux7pQ.', 'Default Faculty', 1, 'Professor');
   ```

   The hash above corresponds to `password123`. Replace with a strong password for production use.

## 3. Environment variables

Create a `.env` file in the project root and supply your MySQL credentials:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=recoletos_tracker
DB_USER=root
DB_PASSWORD=your_password
DB_CONNECTION_LIMIT=10
JWT_SECRET=replace_with_secure_value
```

Restart the server whenever you change `.env`.

## 4. Run the server

```bash
npm start
```

The Express server now serves both the API and the static frontend:

- Web app: `http://localhost:3000`
- REST API: `http://localhost:3000/api`

## 5. Accounts

- **Students** sign up directly through the login modal. A valid USJ-R style ID number (e.g., `2022011084`) is required.
- **Faculty/Admin** accounts should be inserted into the `users` table by an administrator because they require elevated permissions.

## 6. API overview

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/auth/signup` | Student registration |
| POST | `/api/auth/login` | Authenticate and receive a JWT |
| GET | `/api/departments` | Department list with document catalog |
| GET/POST/PATCH | `/api/requests` | Submit or manage requests |
| GET/PATCH | `/api/notifications` | Notification bell data |
| GET | `/api/users/faculty` | Faculty directory (admin/faculty only) |

All protected routes expect `Authorization: Bearer <token>` headers.

## 7. Feature snapshot

- Role-based dashboards (Student, Faculty, Admin)
- MySQL-backed authentication with hashed passwords and JWT sessions
- Department-aware document selection with cross-department requests
- Attachment uploads (stored under `/uploads/<studentId>`)
- Admin notes, faculty approvals, and real-time status history
- Notification bell with unread counts for every role

## Troubleshooting

**Port already in use** – free port 3000 (`Get-NetTCPConnection -LocalPort 3000`) or change `PORT` in `.env`.

**Database connection failed** – confirm `.env` credentials and that `database/schema.sql` was executed.

**Login fails after sign-up** – clear `localStorage`, ensure the ID number uses the `20XXXXXXXX` format, and retry.

**Uploads rejected** – only JPG/PNG up to 5 MB each are accepted.

## Recommended next steps

- Provision migrations or an ORM (Prisma/Knex/TypeORM) for schema evolution.
- Add password reset / email verification flows.
- Secure file storage (S3, GCS) and scan uploads for malware.
- Build an internal admin panel for managing faculty/admin accounts.



- HOW TO LOGIN
Reproduce the signup in the browser (use a fresh test ID not already in DB):

For faculty: use something similar to the seeded example FAC1001 (note: sample uses no dash).
For admin: ADM-001 (or ADM1001 depending on your seed).
For student: 2022011084 (10 digits starting with 20).