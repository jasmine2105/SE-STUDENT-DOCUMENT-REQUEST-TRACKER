const express = require('express');
const { getConnection } = require('../config/db');

const router = express.Router();

// ✅ UPDATED: Proper authentication handling
router.get('/', async (req, res) => {
  let conn;
  try {
    console.log('🔔 Notifications API called');
    
    // Get connection first
    conn = await getConnection();
    console.log('✅ Database connected');
    
    // Get user ID from authenticated user (from your auth middleware)
    const userId = req.user?.id || req.query.userId;
    
    console.log('👤 User ID from auth:', req.user?.id);
    console.log('👤 User ID from query:', req.query.userId);
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Authentication required. Please log in.' 
      });
    }

    // Test the query
    console.log('📋 Executing notifications query for user:', userId);
    const [notifications] = await conn.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    console.log('✅ Notifications found:', notifications.length);
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
      console.log('🔓 Connection released');
    }
  }
});

// ✅ KEEPING YOUR EXISTING CODE - completely unchanged
async function createNotification({ userId, role, type, title, message, requestId }) {
  if (!userId) {
    console.warn('⚠️ createNotification called without userId');
    return;
  }
  
  console.log(`🔔 Creating notification: userId=${userId}, role=${role}, type=${type}, title="${title}", requestId=${requestId}`);
  
  const conn = await getConnection();
  try {
    const [result] = await conn.query(
      `INSERT INTO notifications (user_id, role, type, title, message, request_id, read_flag)
       VALUES (?, ?, ?, ?, ?, ?, false)`,
      [userId, role || null, type || null, title || '', message || '', requestId || null]
    );
    console.log(`✅ Notification created successfully with ID: ${result.insertId} for user ${userId}`);
  } catch (error) {
    console.error(`❌ Failed to create notification for user ${userId}:`, error.message);
    console.error(`❌ Error stack:`, error.stack);
    throw error;
  } finally {
    conn.release();
  }
}

// ✅ Export both router and your existing function - unchanged
module.exports = router;
module.exports.createNotification = createNotification;