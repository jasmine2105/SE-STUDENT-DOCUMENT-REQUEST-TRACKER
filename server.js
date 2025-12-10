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
console.log('📦 Loading request routes...');
const requestRoutes = require('./server/routes/requests');
console.log('✅ Request routes loaded');
const notificationRoutes = require('./server/routes/notifications');
const userRoutes = require('./server/routes/users');
const conversationRoutes = require('./server/routes/conversations');
const superAdminRoutes = require('./server/routes/super-admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`📥 ${req.method} ${req.path} at ${new Date().toISOString()}`);
  }
  next();
});

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
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and PDF files are allowed'));
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

// Test endpoint to verify server is receiving requests
app.post('/api/requests/test', (req, res) => {
  console.log('✅ Test endpoint hit at', new Date().toISOString());
  res.json({ message: 'Server is receiving requests', timestamp: new Date().toISOString() });
});

// Simple test endpoint for database
app.get('/api/test-db', async (req, res) => {
  try {
    const { getConnection } = require('./server/config/db');
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT 1 as test');
    conn.release();
    res.json({ status: 'ok', database: 'connected', result: rows[0] });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const pool = await initPool();
    const [rows] = await pool.query('SELECT 1 as test');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message,
      code: error.code
    });
  }
});

app.use(express.static(path.join(__dirname), { index: false }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, async () => {
  console.log(`🚀 Starting server on http://localhost:${PORT}`);
  try {
    await initPool();
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Database connection pool ready`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('⚠️  Server will start but database operations may fail');
    console.log(`⚠️  Server running on http://localhost:${PORT} (with limited functionality)`);
  }
});

