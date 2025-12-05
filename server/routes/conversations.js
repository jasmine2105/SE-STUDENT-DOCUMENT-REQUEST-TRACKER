const express = require('express');
const router = express.Router();
const { initPool } = require('../config/db');
const authMiddleware = require('../middleware/auth');

// GET /:requestId - Get conversation for a request
router.get('/:requestId', authMiddleware(true), async (req, res) => {
    try {
        const pool = await initPool();
        const requestId = req.params.requestId;
        const userRole = req.user.role;

        // Fetch messages - filter based on role
        // Students only see non-internal messages
        // Faculty and Admin see all messages
        let query = `
      SELECT rc.*, u.full_name, u.role 
      FROM request_conversations rc 
      JOIN users u ON rc.user_id = u.id 
      WHERE rc.request_id = ?
    `;

        if (userRole === 'student') {
            query += ' AND rc.is_internal = FALSE';
        }

        query += ' ORDER BY rc.created_at ASC';

        const [rows] = await pool.query(query, [requestId]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /:requestId - Post a message
router.post('/:requestId', authMiddleware(true), async (req, res) => {
    try {
        const pool = await initPool();
        const requestId = req.params.requestId;
        const { message, isInternal } = req.body;

        // Use authenticated user ID from token (SECURE)
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Students cannot send internal messages
        const messageIsInternal = userRole === 'student' ? false : (isInternal || false);

        await pool.query(
            `INSERT INTO request_conversations (request_id, user_id, message, is_internal) 
       VALUES (?, ?, ?, ?)`,
            [requestId, userId, message, messageIsInternal]
        );

        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error posting message:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

