const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low } = require('lowdb');
// JSONFile adapter for Node (lowdb v6+)
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const PORT = process.env.PORT || 3000;
// Setup DB (lowdb)
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
// Provide default data as second argument (required by lowdb v6+)
const defaultData = { requests: [], users: [] };
const db = new Low(adapter, defaultData);

async function initDb() {
  await db.read();
  db.data = db.data || { requests: [], users: [] };
  await db.write();
}

initDb();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend files (so you can just start the server)
app.use(express.static(__dirname));

// Uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const upload = multer({ dest: uploadsDir });

// Create transporter for nodemailer
function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587;
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('EMAIL_USER or EMAIL_PASS not set. Email sending will fail until .env is configured.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

// API: submit new request (with optional attachments)
app.post('/api/requests', upload.array('attachments', 6), async (req, res) => {
  try {
    const payload = req.body;

    // Build request object
    const request = {
      id: `REQ-${nanoid(8).toUpperCase()}`,
      studentId: payload.studentId || payload.studentID || payload.student_id || 'UNKNOWN',
      studentName: payload.studentName || payload.name || '',
      studentEmail: payload.studentEmail || payload.email || '',
      documentType: payload.documentType || payload.documentType || 'Other',
      purpose: payload.purpose || '',
      termCoverage: payload.termCoverage || payload.term_coverage || '',
      copies: parseInt(payload.copies || '1') || 1,
      deliveryMethod: payload.deliveryMethod || 'Pickup',
      deliveryAddress: payload.deliveryAddress || '',
      recipientName: payload.recipientName || '',
      notes: payload.notes || '',
      status: 'Submitted',
      dateSubmitted: new Date().toISOString(),
      attachments: [],
      timeline: [ { status: 'Submitted', date: new Date().toISOString(), note: 'Request submitted' } ]
    };

    // Save attachments info
    if (req.files && req.files.length) {
      request.attachments = req.files.map(f => ({ originalName: f.originalname, path: f.path }));
    }

    // Save to DB
    await db.read();
    db.data.requests.unshift(request);
    await db.write();

    // Send email to student
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: request.studentEmail,
      subject: `Request Received: ${request.id} — ${request.documentType}`,
      text: `Hello ${request.studentName || ''},\n\nWe have received your request (${request.id}) for ${request.documentType}.\nCurrent status: ${request.status}.\n\nYou may track your request using the portal.\n\nThank you.\nDocTracker Team`,
      html: `<p>Hello ${request.studentName || ''},</p>
             <p>We have received your request <strong>${request.id}</strong> for <strong>${request.documentType}</strong>.</p>
             <p>Current status: <strong>${request.status}</strong>.</p>
             <p>You may track your request using the portal.</p>
             <p>Thank you,<br/>DocTracker Team</p>`
    };

    // Only attempt to send email if credentials present
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Error sending email:', err);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    } else {
      console.warn('Skipping email send: EMAIL_USER or EMAIL_PASS not set.');
    }

    return res.json({ success: true, request });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: list all requests (admin)
app.get('/api/requests', async (req, res) => {
  await db.read();
  res.json({ success: true, requests: db.data.requests });
});

// API: get specific request
app.get('/api/requests/:id', async (req, res) => {
  await db.read();
  const request = db.data.requests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, request });
});

// API: update a request (status, notes, clearance, timeline entries)
app.put('/api/requests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    await db.read();
    const idx = db.data.requests.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });

    const request = db.data.requests[idx];

    // Merge updatable fields
    if (payload.status) request.status = payload.status;
    if (typeof payload.requiresClearance !== 'undefined') request.requiresClearance = !!payload.requiresClearance;
    if (payload.adminNotes) request.adminNotes = payload.adminNotes;
    if (payload.facultyNotes) request.facultyNotes = payload.facultyNotes;

    // Add timeline entry if provided
    if (payload.timelineEntry) {
      request.timeline = request.timeline || [];
      request.timeline.push(payload.timelineEntry);
    }

    // Save changes
    db.data.requests[idx] = request;
    await db.write();

    // Optionally notify student by email about status change
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS && request.studentEmail) {
        const transporter = createTransporter();
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: request.studentEmail,
          subject: `Request Update: ${request.id} — ${request.status}`,
          text: `Hello ${request.studentName || ''},\n\nYour request ${request.id} status has been updated to ${request.status}.\n\nRegards,\nDocTracker`,
          html: `<p>Hello ${request.studentName || ''},</p><p>Your request <strong>${request.id}</strong> status has been updated to <strong>${request.status}</strong>.</p><p>Regards,<br/>DocTracker</p>`
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error('Error sending status update email:', err);
        });
      }
    } catch (e) {
      console.warn('Email status update skipped or failed:', e.message);
    }

    return res.json({ success: true, request });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Start server and handle common errors (EADDRINUSE)
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the process using the port or change PORT in your .env file.`);
    console.error('To find and stop the process on Windows:');
    console.error('  1) Run: netstat -ano | findstr :'+PORT);
    console.error('  2) Note the PID from the last column and run: taskkill /PID <PID> /F');
    process.exit(1);
  }
  // rethrow other errors
  throw err;
});
