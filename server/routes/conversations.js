const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { createNotification } = require('../services/notifications');

// GET /:requestId - Get conversation for a request
router.get('/:requestId', authMiddleware(true), async (req, res) => {
    let conn;
    try {
        conn = await getConnection();
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

        const [rows] = await conn.query(query, [requestId]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (conn) conn.release();
    }
});

// POST /:requestId - Post a message
router.post('/:requestId', authMiddleware(true), async (req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const requestId = req.params.requestId;
        const { message, isInternal } = req.body;

        // Use authenticated user ID from token (SECURE)
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!message) {
            if (conn) conn.release();
            return res.status(400).json({ message: 'Message is required' });
        }

        // Students cannot send internal messages
        const messageIsInternal = userRole === 'student' ? false : (isInternal || false);

        await conn.query(
            `INSERT INTO request_conversations (request_id, user_id, message, is_internal) 
       VALUES (?, ?, ?, ?)`,
            [requestId, userId, message, messageIsInternal]
        );

        // Create notification for student if message is from faculty/admin
        if (userRole === 'faculty' || userRole === 'admin') {
            try {
                // Get student ID from request
                const [requestRows] = await conn.query(
                    'SELECT student_id FROM requests WHERE id = ?',
                    [requestId]
                );
                
                if (requestRows.length > 0) {
                    const studentId = requestRows[0].student_id;
                    const senderName = req.user.fullName || req.user.name || (userRole === 'faculty' ? 'Faculty' : 'Admin');
                    
                    await createNotification({
                        userId: studentId,
                        role: 'student', // Notification is FOR the student
                        type: 'comment',
                        title: 'New Comment on Your Request',
                        message: `${senderName} sent a comment: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                        requestId: requestId
                    });
                    console.log(`✅ Comment notification sent to student ID: ${studentId} for request ${requestId}`);
                }
            } catch (notifError) {
                console.error('❌ Failed to notify student of comment:', notifError.message);
                // Don't fail the request if notification fails
            }
        }

        // Create notification for admins if message is from student
        if (userRole === 'student') {
            try {
                // Get request details to find department
                const [requestRows] = await conn.query(
                    'SELECT department_id, request_code, student_id FROM requests WHERE id = ?',
                    [requestId]
                );
                
                if (requestRows.length > 0) {
                    const request = requestRows[0];
                    const departmentId = request.department_id;
                    const requestCode = request.request_code || '';
                    const studentName = req.user.fullName || req.user.name || 'Student';
                    
                    // Notify all admins in the same department
                    const [admins] = await conn.query(
                        'SELECT id FROM users WHERE role = ? AND department_id = ?',
                        ['admin', departmentId]
                    );
                    
                    console.log(`📨 Found ${admins.length} admin(s) to notify for student comment on request ${requestId}`);
                    
                    for (const admin of admins) {
                        try {
                            await createNotification({
                                userId: admin.id,
                                role: 'admin', // Notification is FOR the admin
                                type: 'comment',
                                title: 'New Comment on Request',
                                message: `${studentName} sent a comment on request ${requestCode}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                                requestId: requestId
                            });
                            console.log(`✅ Comment notification sent to admin ID: ${admin.id} for request ${requestId}`);
                        } catch (adminNotifError) {
                            console.error(`❌ Failed to notify admin ID ${admin.id}:`, adminNotifError.message);
                            // Continue with other admins even if one fails
                        }
                    }
                }
            } catch (notifError) {
                console.error('❌ Failed to notify admins of student comment:', notifError.message);
                // Don't fail the request if notification fails
            }
        }

        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('❌ Error posting message:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;

