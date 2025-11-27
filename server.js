require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const { initPool } = require('./server/config/db');

// Initialize database pool (non-blocking - will fail gracefully if DB unavailable)
initPool().catch(err => {
  console.warn('⚠️  Database connection failed. App will run with limited functionality.');
  console.warn('   Error:', err.message);
  console.warn('   To fix: Create a .env file with DB credentials or start MySQL server.');
});

const authRoutes = require('./server/routes/auth');
const departmentRoutes = require('./server/routes/departments');
const requestRoutes = require('./server/routes/requests');
const notificationRoutes = require('./server/routes/notifications');
const userRoutes = require('./server/routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsRoot = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const studentId = req.body.studentId || 'unknown';
    const dest = path.join(uploadsRoot, String(studentId));
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_');
    const ts = Date.now();
    cb(null, `${base}_${req.body.studentId || 'student'}_${ts}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG and PNG images are allowed'));
    }
    cb(null, true);
  }
});

app.post('/api/uploads', upload.array('files', 3), (req, res) => {
  const studentId = req.body.studentId || 'unknown';
  const files = (req.files || []).map((f) => ({
    name: f.originalname,
    url: `/uploads/${studentId}/${path.basename(f.path)}`,
  }));
  res.json({ attachments: files });
});

app.use('/uploads', express.static(uploadsRoot, { index: false, dotfiles: 'deny' }));

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const pool = await initPool();
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

app.use(express.static(path.join(__dirname), { index: false }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, async () => {
  try {
    await initPool();
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
});

