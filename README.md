Student Document Request Tracker — Local Setup (Windows)

This repository contains a static frontend (HTML/CSS/JS) and a small Express backend to persist requests and send Gmail notifications when a student submits a document request.

Main features added in this update:
- A minimal Express backend at server.js with endpoints:
  - POST /api/requests — accept request data and optional attachments; saves to db.json and attempts to send an email to the student's Gmail.
  - GET /api/requests — list all requests (admin view)
  - GET /api/requests/:id — fetch specific request
- Nodemailer configured via environment variables for Gmail SMTP.
- Frontend update: student-script.js now POSTs requests to /api/requests (keeps a localStorage fallback).

Prerequisites:
- Node.js (v16+ recommended)
- A Gmail account (recommended: use an App Password if you have 2FA enabled)

Setup (Windows PowerShell):
1. Open PowerShell and change to the project folder (example):

   cd 'C:\\Users\\Admin\\Documents\\SOFTENG'

2. Install dependencies:

   npm install

3. Copy the example env file and fill your Gmail credentials:

   copy .env.example .env

   Then open .env in a text editor and set EMAIL_USER and EMAIL_PASS.

Important: If your Google account has 2FA, create an App Password and use it in EMAIL_PASS.

4. Start the server:

   npm start

5. Open the site in your browser:

   Visit http://localhost:3000 to use the site served by the backend.

How to test the flow:
1. Open http://localhost:3000.
2. Click "Login / Sign Up" and create a student account (registration stores user locally).
3. Go to Student Portal, click "Submit New Request", fill the form, and submit.
4. The UI saves the request locally and then attempts to POST it to the backend; if email config is valid, you will receive a confirmation email at the address you gave.

Notes and next steps:
- The backend uses a JSON DB (db.json) for persistence — not meant for production.
- Attachments are saved into uploads/ and their metadata stored in db.json.
- For production, migrate to a real database and secure authentication (JWT, password hashing, input sanitization).

If you want, I can now:
- Update auth to use backend endpoints (signup/login persisted),
- Create separate folders for frontend (student/, admin/, faculty/),
- Add a small admin UI to view requests using the backend,
- Add unit tests.
