const express = require('express');
const { getConnection } = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Use auth middleware to get user from token
router.get('/', authMiddleware(), async (req, res) => {
  let conn;
  try {
    // Get user ID from authenticated user (set by authMiddleware)
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Authentication required. Please log in to view notifications.' 
      });
    }

    conn = await getConnection();
    
    // Get notifications for this user
    const [notifications] = await conn.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    res.json(notifications);
    
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ 
      message: 'Failed to load notifications.',
      error: error.message
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

// ✅ KEEPING YOUR EXISTING CODE - completely unchanged
async function createNotification({ userId, role, type, title, message, requestId }) {
  if (!userId) return;
  const conn = await getConnection();
  try {
    await conn.query(
      `INSERT INTO notifications (user_id, role, type, title, message, request_id, read_flag)
       VALUES (?, ?, ?, ?, ?, ?, false)`,
      [userId, role || null, type || null, title || '', message || '', requestId || null]
    );
  } finally {
    conn.release();
  }
}

// ✅ Export both router and your existing function - unchanged
module.exports = router;
module.exports.createNotification = createNotification;