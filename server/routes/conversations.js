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
    console.log(`\n🚀 ===== POST /conversations/${req.params.requestId} =====`);
    console.log(`📨 Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`👤 Authenticated user:`, req.user ? { id: req.user.id, role: req.user.role, name: req.user.fullName } : 'NOT AUTHENTICATED');
    
    let conn;
    try {
        conn = await getConnection();
        const requestId = req.params.requestId;
        const { message, isInternal } = req.body;

        // Use authenticated user ID from token (SECURE)
        const userId = req.user.id;
        const userRole = req.user.role;

        console.log(`📝 Processing message - Request ID: ${requestId}, User ID: ${userId}, Role: ${userRole}`);
        console.log(`📝 Message: "${message}", isInternal: ${isInternal}`);

        if (!message) {
            console.warn(`⚠️ Message is empty, returning 400`);
            if (conn) conn.release();
            return res.status(400).json({ message: 'Message is required' });
        }

        // Students cannot send internal messages
        const messageIsInternal = userRole === 'student' ? false : (isInternal || false);
        
        console.log(`💬 Posting message - Request ID: ${requestId}, User ID: ${userId}, Role: ${userRole}, isInternal: ${messageIsInternal}, isInternal param: ${isInternal}`);

        await conn.query(
            `INSERT INTO request_conversations (request_id, user_id, message, is_internal) 
       VALUES (?, ?, ?, ?)`,
            [requestId, userId, message, messageIsInternal]
        );
        
        console.log(`✅ Message saved successfully. is_internal = ${messageIsInternal}`);

        // Handle notifications based on message type
        if (messageIsInternal) {
            console.log(`🔔 Processing internal message notifications for request ${requestId}...`);
            // Internal messages (admin-faculty only) - notify the other party
            try {
                const [requestRows] = await conn.query(
                    'SELECT student_id, faculty_id, department_id FROM requests WHERE id = ?',
                    [requestId]
                );
                
                if (requestRows.length > 0) {
                    const request = requestRows[0];
                    const senderName = req.user.fullName || req.user.name || (userRole === 'faculty' ? 'Faculty' : 'Admin');
                    
                    if (userRole === 'admin') {
                        // Admin sent internal message - notify all faculty in the department
                        console.log(`👨‍💼 Admin (ID: ${userId}, Name: ${senderName}) sending internal message to faculty...`);
                        try {
                            // Get all faculty users in the department directly from users table
                            const [facultyRows] = await conn.query(
                                'SELECT id, full_name FROM users WHERE role = ? AND department_id = ?',
                                ['faculty', request.department_id]
                            );
                            
                            console.log(`📨 Found ${facultyRows.length} faculty member(s) to notify for admin message on request ${requestId} in department ${request.department_id}`);
                            
                            if (facultyRows.length === 0) {
                                console.warn(`⚠️ No faculty found in department ${request.department_id} for request ${requestId}`);
                            } else {
                                console.log(`📋 Faculty to notify:`, facultyRows.map(f => `ID ${f.id} (${f.full_name})`).join(', '));
                            }
                            
                            for (const faculty of facultyRows) {
                                try {
                                    const notificationData = {
                                        userId: faculty.id,
                                        role: 'faculty',
                                        type: 'comment',
                                        title: 'New Message from Admin',
                                        message: `${senderName} sent a message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                                        requestId: requestId
                                    };
                                    console.log(`📤 Creating notification for faculty ID ${faculty.id}:`, notificationData);
                                    await createNotification(notificationData);
                                    console.log(`✅ Internal message notification sent to faculty ID: ${faculty.id} (${faculty.full_name}) for request ${requestId}`);
                                } catch (facultyNotifError) {
                                    console.error(`❌ Failed to notify faculty ID ${faculty.id}:`, facultyNotifError.message);
                                    console.error(`❌ Error stack:`, facultyNotifError.stack);
                                }
                            }
                        } catch (facultyNotifError) {
                            console.error('❌ Failed to notify faculty of internal message:', facultyNotifError.message);
                            console.error('❌ Error stack:', facultyNotifError.stack);
                        }
                    } else if (userRole === 'faculty') {
                        // Faculty sent internal message - notify all admins in department
                        const [admins] = await conn.query(
                            'SELECT id FROM users WHERE role = ? AND department_id = ?',
                            ['admin', request.department_id]
                        );
                        
                        for (const admin of admins) {
                            try {
                                await createNotification({
                                    userId: admin.id,
                                    role: 'admin',
                                    type: 'comment',
                                    title: 'New Message from Faculty',
                                    message: `${senderName} sent a message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                                    requestId: requestId
                                });
                                console.log(`✅ Internal message notification sent to admin ID: ${admin.id} for request ${requestId}`);
                            } catch (adminNotifError) {
                                console.error(`❌ Failed to notify admin ID ${admin.id}:`, adminNotifError.message);
                            }
                        }
                    }
                }
            } catch (notifError) {
                console.error('❌ Failed to send internal message notifications:', notifError.message);
            }
        } else {
            // Public messages - notify student if from faculty/admin
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

        console.log(`✅ Message posted successfully for request ${requestId}`);
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('❌ Error posting message:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (conn) conn.release();
        console.log(`🏁 ===== END POST /conversations/${req.params.requestId} =====\n`);
    }
});

module.exports = router;

