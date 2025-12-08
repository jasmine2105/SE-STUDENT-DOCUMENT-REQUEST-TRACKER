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
    const queryUserId = req.query.userId;
    
    console.log('🔔 Notifications GET request:');
    console.log('  - User from token:', userId);
    console.log('  - User from query:', queryUserId);
    console.log('  - Full req.user:', req.user);
    
    if (!userId) {
      console.error('❌ No userId found in token');
      return res.status(401).json({ 
        message: 'Authentication required. Please log in to view notifications.' 
      });
    }

    conn = await getConnection();
    
    // Get notifications for this user
    console.log(`📋 Fetching notifications for user ID: ${userId}`);
    const [notifications] = await conn.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    console.log(`✅ Found ${notifications.length} notifications for user ${userId}`);
    if (notifications.length > 0) {
      console.log(`  Sample: ${notifications[0].title} - ${notifications[0].message.substring(0, 50)}...`);
    }

    res.json(notifications);
    
  } catch (error) {
    console.error('❌ Notifications error:', error);
    console.error('❌ Error stack:', error.stack);
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