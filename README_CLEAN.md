# Student Document Request Tracker

A local demo of a Student Document Request Tracker (frontend + minimal Express backend). This repo contains static HTML/CSS/JS pages plus a small Node/Express backend that persists requests into a JSON file and can send email notifications via Gmail SMTP.

## Key features
- Student sign up / login (client-side/localStorage for now)
- Submit document requests with optional attachments
- Backend endpoint to receive requests and save to `db.json`
- Nodemailer integration (configure via environment variables) to send confirmation emails

## Tech
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Persistence: lowdb (file-based JSON)
- Email: nodemailer

## Prerequisites
- Node.js (v16+)
- A Gmail account (use an App Password if your account uses 2FA)

## Setup (Windows PowerShell)
1. Open PowerShell and change to the project folder:

   cd 'C:\\Users\\Admin\\Documents\\SOFTENG'

2. Install dependencies:

   npm install

3. Copy the example env file and set credentials:

   copy .env.example .env

   Edit `.env` and set:
   - EMAIL_USER (your Gmail address)
   - EMAIL_PASS (your app password or SMTP password)
   - PORT (optional, default 3000)

4. Start the server:

   npm start

5. Open the site in your browser:

   http://localhost:3000

## How to test the flow
1. Open `http://localhost:3000` (or open the `auth.html` page directly).
2. Sign up a student account and log in.
3. Go to the Student Portal and submit a new request (attach files if needed).
4. The frontend will POST to `/api/requests` and the backend will save the request and attempt to send a confirmation email.

## Files of interest
- `server.js` — Express API endpoints (POST /api/requests, GET /api/requests, GET /api/requests/:id)
- `student-script.js` / `STUDENT/student-script.js` — student UI + POST wiring
- `auth-script.js` — client-side auth, redirects and helpers
- `styles.css` — main stylesheet

## Notes & Next steps
- This is a demo; passwords and auth are currently client-side only. For production, migrate auth to server-side with password hashing and sessions/JWT.
- lowdb is used for simple persistence — migrate to a proper DB for production.
- If you want, I can:
  - Move auth to the backend (signup/login API + hashed passwords)
  - Create a small admin UI to view/process requests
  - Reorganize the frontend into `student/`, `admin/`, and `faculty/` folders and fix paths

If you'd like me to continue, tell me which item above you want next and I will implement it.
