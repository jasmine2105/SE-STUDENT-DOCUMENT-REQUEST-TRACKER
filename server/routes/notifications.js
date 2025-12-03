console.log("📌 Notifications route loaded");
const express = require('express');
const { getConnection } = require('../config/db');

const router = express.Router();

// ✅ UPDATED: Works with your authentication system
router.get('/', async (req, res) => {
  console.log("📌 /api/notifications endpoint hit");

  let conn;
  try {
    console.log('🔔 Notifications API called');
    
    // Get connection first
    conn = await getConnection();
    console.log('✅ Database connected');
    
    // Get user ID from authenticated user (from your auth system)
    // Try multiple ways your auth might set the user ID
    const userId = req.user?.id || 
                   req.session?.userId || 
                   req.query.userId || 
                   (req.headers.authorization ? await getUserIdFromToken(req.headers.authorization) : null);
    
    console.log('🔍 Auth check - req.user:', req.user);
    console.log('🔍 Auth check - req.session:', req.session);
    console.log('🔍 Auth check - req.query.userId:', req.query.userId);
    
    if (!userId) {
      // Return proper authentication error
      return res.status(401).json({ 
        message: 'Authentication required. Please log in to view notifications.' 
      });
    }

    console.log('👤 Using User ID:', userId);

    // Get notifications for this user
    console.log('📋 Executing notifications query...');
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

// Helper function to extract user ID from token (if using JWT)
async function getUserIdFromToken(authHeader) {
  try {
    // This would need to match your auth system
    // For now, return null and rely on other methods
    return null;
  } catch (error) {
    return null;
  }
}

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