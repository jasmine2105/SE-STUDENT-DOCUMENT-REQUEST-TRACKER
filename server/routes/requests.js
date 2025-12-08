const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getConnection } = require('../config/db');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// Log all route matches for debugging
router.use((req, res, next) => {
  console.log(`🎯 Route matched: ${req.method} ${req.path}`);
  next();
});

// TEST ROUTE - No auth to verify routing works
router.get('/test', (req, res) => {
  console.log('✅ TEST ROUTE HIT - Routing works!');
  res.json({ message: 'Test route works', timestamp: new Date().toISOString() });
});

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  } catch (error) {
    return fallback;
  }
}

function mapRequestRow(row) {
  return {
    id: row.id,
    requestCode: row.request_code,
    studentId: row.student_id,
    studentName: row.student_name,
    studentIdNumber: row.student_id_number,
    studentCourse: row.student_course || null,
    studentYearLevel: row.student_year_level || null,
    studentEmail: row.student_email || null,
    departmentId: row.department_id,
    department: row.department_name,
    documentType: row.document_label || row.document_value,
    documentValue: row.document_value,
    status: row.status,
    priority: row.priority,
    quantity: row.quantity,
    purpose: row.purpose,
    crossDepartment: !!row.cross_department,
    crossDepartmentDetails: row.cross_department_details,
    facultyId: row.faculty_id,
    facultyApproval: parseJsonField(row.faculty_approval, {}),
    adminNotes: parseJsonField(row.admin_notes, []),
    submittedAt: row.submitted_at,
    createdAt: row.submitted_at, // Keep for backward compatibility
    updatedAt: row.updated_at
  };
}

// GET all requests (with role-based filtering)
router.get('/', authMiddleware(), async (req, res) => {
  console.log('🚀🚀🚀 GET /api/requests ROUTE HANDLER EXECUTING 🚀🚀🚀');
  let conn = null;
  const requestTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('❌ GET /requests timeout');
      if (conn) {
        try {
          conn.release();
        } catch (e) {
          // Ignore
        }
      }
      res.status(504).json({ message: 'Request timeout - database connection issue' });
    }
  }, 30000); // 30 second timeout

  try {
    console.log('📥 GET /requests - Starting request for user:', req.user?.id, 'role:', req.user?.role);
    
    // Get connection directly
    console.log('⏳ Getting database connection...');
    conn = await getConnection();
    console.log('✅ Database connection obtained');

    let query = `
      SELECT r.*, d.name AS department_name, dd.label AS document_label,
             u.course AS student_course, u.year_level AS student_year_level, u.email AS student_email
      FROM requests r
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
      LEFT JOIN users u ON u.id = r.student_id
    `;

    const params = [];
    const { role, id, departmentId } = req.user || {};

    // Role-based filtering
    if (role === 'student') {
      query += ' WHERE r.student_id = ?';
      params.push(id);
      console.log('📋 Filtering for student ID:', id);
    } else if (role === 'faculty') {
      // Faculty see: requests from their dept (pending_faculty/in_progress) OR assigned to them
      query += ' WHERE (r.department_id = ? AND r.status IN (?, ?)) OR r.faculty_id = ?';
      params.push(departmentId, 'pending_faculty', 'in_progress', id);
      console.log('📋 Filtering for faculty ID:', id, 'department:', departmentId);
    }
    // Admin sees all requests (no WHERE clause)

    query += ' ORDER BY r.submitted_at DESC';

    // Execute query
    console.log('⏳ Executing query...');
    console.log('📋 Query:', query);
    console.log('📋 Params:', params);
    const [rows] = await conn.query(query, params);
    console.log('✅ Query completed, found', rows.length, 'requests');
    
    clearTimeout(requestTimeout);
    conn.release();

    const requests = rows.map(mapRequestRow);
    res.json(requests);
  } catch (error) {
    clearTimeout(requestTimeout);
    if (conn) {
      try {
        conn.release();
      } catch (e) {
        // Ignore
      }
    }
    console.error('Error fetching requests:', error);
    if (!res.headersSent) {
      const errorMessage = error.message || 'Failed to fetch requests';
      let userMessage = 'Failed to fetch requests. ';
      if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
        userMessage += 'Database connection timeout. Please check if MySQL is running.';
      } else if (error.code === 'ECONNREFUSED') {
        userMessage += 'Cannot connect to MySQL server. Please make sure MySQL is running.';
      } else {
        userMessage += errorMessage;
      }
      res.status(500).json({ message: userMessage });
    }
  }
});

// GET document types by department (MUST come before /:id route)
router.get('/document-types/:departmentCode', authMiddleware(), async (req, res) => {
  const { departmentCode } = req.params;
  let conn = null;
  let timeout = null;
  
  // Set timeout for the entire request (3 seconds - faster than client timeout)
  timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('Document types request timeout for:', departmentCode);
      if (conn) {
        try {
          conn.release();
        } catch (e) {
          // Ignore
        }
      }
      res.status(504).json({ message: 'Request timeout - database connection issue' });
    }
  }, 3000); // 3 second timeout (faster than client's 5 second timeout)

  try {
    // Get connection directly
    conn = await getConnection();
    
    const [deptRows] = await conn.query('SELECT id FROM departments WHERE code = ?', [departmentCode]);
    if (deptRows.length === 0) {
      if (timeout) clearTimeout(timeout);
      conn.release();
      return res.status(404).json({ message: 'Department not found' });
    }
    const departmentId = deptRows[0].id;
    const [docRows] = await conn.query(
      'SELECT id, value, label, requires_faculty FROM department_documents WHERE department_id = ? ORDER BY label',
      [departmentId]
    );
    if (timeout) clearTimeout(timeout);
    conn.release();
    const documentTypes = docRows.map(row => ({
      id: row.id,
      value: row.value,
      name: row.label,
      requires_faculty: !!row.requires_faculty
    }));
    res.json(documentTypes);
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    if (conn) {
      try {
        conn.release();
      } catch (e) {
        // Ignore release errors
      }
    }
    console.error('Document types error for', departmentCode, ':', error.message);
    if (!res.headersSent) {
      // Return error quickly so client can use fallback
      res.status(500).json({ 
        message: 'Database connection failed. Using fallback configuration.',
        error: error.message 
      });
    }
  }
});

// GET single request
router.get('/:id', authMiddleware(), async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query(`
      SELECT r.*, d.name AS department_name, dd.label AS document_label,
             u.course AS student_course, u.year_level AS student_year_level, u.email AS student_email
      FROM requests r
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
      LEFT JOIN users u ON u.id = r.student_id
      WHERE r.id = ?
    `, [req.params.id]);
    conn.release();

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(mapRequestRow(rows[0]));
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ message: 'Failed to fetch request' });
  }
});

// POST create new request
router.post('/', authMiddleware(), async (req, res) => {
  const startTime = Date.now();
  console.log('🚀🚀🚀 POST /api/requests ROUTE HANDLER EXECUTING 🚀🚀🚀');
  console.log('📨 POST /api/requests received at', new Date().toISOString());
  console.log('📨 User:', req.user ? { id: req.user.id, role: req.user.role, roleType: typeof req.user.role } : 'NO USER');
  console.log('📨 Full req.user object:', JSON.stringify(req.user, null, 2));
  console.log('📨 Request body keys:', Object.keys(req.body || {}));
  console.log('📨 Request headers:', {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'Bearer ***' : 'MISSING'
  });
  
  if (!req.user) {
    console.error('❌ NO USER IN REQUEST');
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Normalize role comparison (trim whitespace, lowercase)
  const userRole = String(req.user.role || '').trim().toLowerCase();
  console.log('🔍 Role check - raw role:', req.user.role, 'normalized:', userRole, 'expected: student');
  
  if (userRole !== 'student') {
    console.log('❌ User is not a student, role:', req.user.role, 'type:', typeof req.user.role, 'normalized:', userRole);
    return res.status(403).json({ message: 'Only students can submit requests' });
  }
  
  console.log('✅ User is a student, proceeding...');

  const {
    departmentId,
    documentValue,
    documentType,
    quantity,
    purpose,
    crossDepartment,
    crossDepartmentDetails,
    attachments = [],
    requiresFaculty
  } = req.body;

  console.log('📨 Request body received:', {
    departmentId,
    departmentIdType: typeof departmentId,
    documentValue,
    documentType,
    quantity,
    attachmentsCount: attachments.length
  });

  const departmentNumeric = parseInt(departmentId, 10);
  if (Number.isNaN(departmentNumeric) || !documentValue) {
    console.error('❌ Invalid department ID:', departmentId, 'parsed as:', departmentNumeric);
    return res.status(400).json({ message: 'Department and document type required' });
  }

  const initialStatus = requiresFaculty ? 'pending_faculty' : 'pending';
  let conn = null;
  
  // Set overall request timeout (increased to 30 seconds to match client)
  const requestTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('❌ Request POST timeout for user:', req.user.id);
      if (conn) {
        try {
          conn.release();
        } catch (e) {
          // Ignore
        }
      }
      res.status(504).json({ message: 'Request timeout - database connection issue' });
    }
  }, 30000); // 30 second timeout (increased from 10s)

  try {
    console.log('📥 Creating request for user:', req.user.id, 'department:', departmentNumeric);
    console.log('📥 Request data:', JSON.stringify({ departmentId: departmentNumeric, documentValue, documentType, quantity, purpose: purpose?.substring(0, 50) + '...' }, null, 2));
    
    // Get connection directly
    conn = await getConnection();
    console.log('✅ Database connection established');
    
    // Verify the department exists and log it
    console.log('🔍 Verifying department ID:', departmentNumeric);
    const [deptRows] = await conn.query('SELECT id, code, name FROM departments WHERE id = ?', [departmentNumeric]);
    if (deptRows.length === 0) {
      clearTimeout(requestTimeout);
      conn.release();
      console.error('❌ Department ID not found in database:', departmentNumeric);
      return res.status(400).json({ message: 'Invalid department ID' });
    }
    console.log('✅ Verified department:', { id: deptRows[0].id, code: deptRows[0].code, name: deptRows[0].name });
    
    console.log('🔍 Querying student info...');
    const [studentRows] = await conn.query('SELECT full_name, id_number FROM users WHERE id = ?', [req.user.id]);
    
    if (!studentRows || studentRows.length === 0) {
      clearTimeout(requestTimeout);
      conn.release();
      return res.status(404).json({ message: 'Student not found' });
    }
    const student = studentRows[0];
    console.log('✅ Student found:', student.full_name);

    console.log('📝 Ensuring required columns exist in requests table...');
    // Ensure required columns exist (add them if they don't)
    // MySQL doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN, so we catch duplicate errors
    const columnsToAdd = [
      { name: 'student_name', definition: 'VARCHAR(255) NOT NULL DEFAULT \'\'' },
      { name: 'student_id_number', definition: 'VARCHAR(32) NOT NULL DEFAULT \'\'' },
      { name: 'requires_faculty', definition: 'BOOLEAN DEFAULT FALSE' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await conn.query(`ALTER TABLE requests ADD COLUMN ${column.name} ${column.definition}`);
        console.log(`✅ Added column: ${column.name}`);
      } catch (e) {
        if (e.message.includes('Duplicate column name')) {
          console.log(`ℹ️ Column ${column.name} already exists`);
        } else {
          console.warn(`⚠️ Could not add ${column.name} column:`, e.message);
        }
      }
    }

    // Check if document_id column exists and handle it
    let documentId = null;
    try {
      // Try to get document_id from department_documents table
      const [docRows] = await conn.query(
        'SELECT id FROM department_documents WHERE value = ? AND department_id = ?',
        [documentValue, departmentNumeric]
      );
      if (docRows && docRows.length > 0) {
        documentId = docRows[0].id;
        console.log('✅ Found document_id:', documentId);
      }
    } catch (e) {
      console.warn('⚠️ Could not look up document_id:', e.message);
    }

    // Check if document_id column exists in requests table
    let hasDocumentIdColumn = false;
    try {
      const [columnCheck] = await conn.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'requests' 
        AND COLUMN_NAME = 'document_id'
      `);
      hasDocumentIdColumn = columnCheck.length > 0;
      if (hasDocumentIdColumn && !documentId) {
        // Column exists but we don't have a value - make it nullable
        try {
          await conn.query(`ALTER TABLE requests MODIFY COLUMN document_id INT NULL`);
          console.log('✅ Made document_id column nullable');
        } catch (e) {
          if (!e.message.includes('Duplicate') && !e.message.includes('already')) {
            console.warn('⚠️ Could not modify document_id column:', e.message);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not check for document_id column:', e.message);
    }

    console.log('📝 Inserting request into database...');
    let insertQuery, insertParams;
    
    if (hasDocumentIdColumn) {
      // Include document_id in INSERT
      insertQuery = `INSERT INTO requests (student_id, student_name, student_id_number, department_id, document_id, document_value, document_label, status, quantity, purpose, cross_department, cross_department_details, attachments, requires_faculty) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      insertParams = [req.user.id, student.full_name, student.id_number, departmentNumeric, documentId, documentValue, documentType, initialStatus, quantity || 1, purpose || null, !!crossDepartment, crossDepartmentDetails || null, JSON.stringify(attachments), !!requiresFaculty];
    } else {
      // Don't include document_id
      insertQuery = `INSERT INTO requests (student_id, student_name, student_id_number, department_id, document_value, document_label, status, quantity, purpose, cross_department, cross_department_details, attachments, requires_faculty) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      insertParams = [req.user.id, student.full_name, student.id_number, departmentNumeric, documentValue, documentType, initialStatus, quantity || 1, purpose || null, !!crossDepartment, crossDepartmentDetails || null, JSON.stringify(attachments), !!requiresFaculty];
    }
    
    const [result] = await conn.query(insertQuery, insertParams);

    const requestId = result.insertId;
    console.log('✅ Request inserted with ID:', requestId);
    
    const requestCode = `REQ-${new Date().getFullYear()}-${String(requestId).padStart(5, '0')}`;
    console.log('📝 Updating request code...');
    await conn.query('UPDATE requests SET request_code = ? WHERE id = ?', [requestCode, requestId]);
    console.log('✅ Request code assigned:', requestCode);

    console.log('🔍 Fetching created request...');
    const [createdRows] = await conn.query(
      `SELECT r.*, d.name AS department_name, dd.label AS document_label,
              u.course AS student_course, u.year_level AS student_year_level, u.email AS student_email
       FROM requests r 
       LEFT JOIN departments d ON d.id = r.department_id 
       LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
       LEFT JOIN users u ON u.id = r.student_id
       WHERE r.id = ?`,
      [requestId]
    );

    // Notify all admins in the same department about the new request
    console.log('🔔 Notifying admins in department:', departmentNumeric);
    try {
      const [admins] = await conn.query(
        'SELECT id FROM users WHERE role = ? AND department_id = ?',
        ['admin', departmentNumeric]
      );
      
      console.log(`📨 Found ${admins.length} admin(s) to notify`);
      
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          role: 'admin',
          type: 'new_request',
          title: 'New Document Request',
          message: `${student.full_name} submitted a request for ${documentType} (${requestCode})`,
          requestId: requestId
        });
        console.log(`✅ Notification sent to admin ID: ${admin.id}`);
      }
    } catch (notifError) {
      console.warn('⚠️ Failed to notify admins:', notifError.message);
      // Don't fail the request if notification fails
    }

    // Notify all faculty in the same department if request requires faculty approval
    if (requiresFaculty || initialStatus === 'pending_faculty') {
      console.log('🔔 Notifying faculty in department:', departmentNumeric);
      try {
        const [faculty] = await conn.query(
          'SELECT id FROM users WHERE role = ? AND department_id = ?',
          ['faculty', departmentNumeric]
        );
        
        console.log(`📨 Found ${faculty.length} faculty member(s) to notify`);
        
        for (const fac of faculty) {
          await createNotification({
            userId: fac.id,
            role: 'faculty',
            type: 'pending_approval',
            title: 'New Request Pending Approval',
            message: `${student.full_name} submitted a request for ${documentType} (${requestCode}) that requires your approval`,
            requestId: requestId
          });
          console.log(`✅ Notification sent to faculty ID: ${fac.id}`);
        }
      } catch (notifError) {
        console.warn('⚠️ Failed to notify faculty:', notifError.message);
        // Don't fail the request if notification fails
      }
    }

    clearTimeout(requestTimeout);
    conn.release();
    const duration = Date.now() - startTime;
    console.log('✅ Request created successfully in', duration, 'ms');
    res.status(201).json(mapRequestRow(createdRows[0]));
  } catch (error) {
    clearTimeout(requestTimeout);
    if (conn) {
      try {
        conn.release();
      } catch (e) {
        // Ignore release errors
      }
    }
    const duration = Date.now() - startTime;
    console.error('❌ Request create error after', duration, 'ms:', error.message);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    if (!res.headersSent) {
      const errorMessage = error.message || 'Failed to submit request';
      // Provide more specific error messages
      let userMessage = 'Failed to submit request. ';
      if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
        userMessage += 'Database connection timeout. Please check if MySQL is running and your .env file is correct.';
      } else if (error.message.includes('Access denied') || error.code === 'ER_ACCESS_DENIED_ERROR') {
        userMessage += 'Database authentication failed. Please check your MySQL password in .env file.';
      } else if (error.code === 'ECONNREFUSED') {
        userMessage += 'Cannot connect to MySQL server. Please make sure MySQL is running.';
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        userMessage += 'Database does not exist. Please run database/COMPLETE-SETUP.sql in MySQL.';
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        userMessage += 'Database tables missing. Please run database/COMPLETE-SETUP.sql in MySQL.';
      } else {
        userMessage += errorMessage;
      }
      res.status(500).json({ message: userMessage, error: error.code || error.message });
    }
  }
});

// UPDATE request (PATCH - used by admin portal)
router.patch('/:id', authMiddleware(), async (req, res) => {
  console.log('📝 PATCH /api/requests/:id - Updating request', req.params.id);
  console.log('📝 Update payload:', req.body);
  
  try {
    const { id } = req.params;
    const { status, adminNote, facultyApproval, facultyId, priority } = req.body;

    const conn = await getConnection();

    // Get current request
    const [requestRows] = await conn.query(
      `SELECT r.*, d.name AS department_name, dd.label AS document_label,
              u.course AS student_course, u.year_level AS student_year_level, u.email AS student_email
       FROM requests r
       LEFT JOIN departments d ON d.id = r.department_id
       LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
       LEFT JOIN users u ON u.id = r.student_id
       WHERE r.id = ?`,
      [id]
    );

    if (requestRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = mapRequestRow(requestRows[0]);
    const updates = [];
    const params = [];

    // Status update
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    // Priority update
    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }

    // Faculty ID update
    if (facultyId !== undefined) {
      updates.push('faculty_id = ?');
      params.push(facultyId);
    }

    // Admin note update
    if (adminNote && req.user) {
      const updatedAdminNotes = [
        ...(request.adminNotes || []),
        {
          adminId: req.user.id,
          adminName: req.user.fullName || req.user.name || 'Admin',
          note: adminNote,
          timestamp: new Date().toISOString(),
        }
      ];
      updates.push('admin_notes = ?');
      params.push(JSON.stringify(updatedAdminNotes));
    }

    // Faculty approval update
    if (facultyApproval) {
      updates.push('faculty_approval = ?');
      params.push(JSON.stringify(facultyApproval));
    }

    if (!updates.length) {
      conn.release();
      return res.json(request);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE requests SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    console.log('📝 Executing update SQL:', sql);
    console.log('📝 With params:', params);
    
    await conn.query(sql, params);

    // Get updated request
    const [updatedRows] = await conn.query(
      `SELECT r.*, d.name AS department_name, dd.label AS document_label,
              u.course AS student_course, u.year_level AS student_year_level, u.email AS student_email
       FROM requests r
       LEFT JOIN departments d ON d.id = r.department_id
       LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
       LEFT JOIN users u ON u.id = r.student_id
       WHERE r.id = ?`,
      [id]
    );

    const updated = mapRequestRow(updatedRows[0]);

    // Notification updates
    if (status && status !== request.status) {
      try {
        // Notify student of status change
        await createNotification({
          userId: request.studentId,
          role: 'student',
          type: 'status_update',
          title: `Request ${status.replace('_', ' ')}`,
          message: `Your request ${updated.requestCode || ''} status is now ${status}.`,
          requestId: request.id,
        });

        // Notify faculty if status changed to pending_faculty
        if (status === 'pending_faculty') {
          console.log('🔔 Notifying faculty for pending_faculty status');
          const [faculty] = await conn.query(
            'SELECT id FROM users WHERE role = ? AND department_id = ?',
            ['faculty', request.departmentId]
          );
          
          for (const fac of faculty) {
            await createNotification({
              userId: fac.id,
              role: 'faculty',
              type: 'pending_approval',
              title: 'Request Pending Your Approval',
              message: `Request ${updated.requestCode || ''} from ${request.studentName} requires your approval`,
              requestId: request.id,
            });
            console.log(`✅ Notification sent to faculty ID: ${fac.id}`);
          }
        }
      } catch (notifError) {
        console.warn('Failed to create notification:', notifError.message);
      }
    }

    // Notify specific faculty member if assigned
    if (facultyId !== undefined && facultyId !== null && facultyId !== request.facultyId) {
      try {
        console.log('🔔 Notifying assigned faculty member:', facultyId);
        
        // facultyId might be a faculty table ID, so we need to get the user_id
        // But it might also be a user ID directly - check both
        let facultyUserId = facultyId;
        
        // Try to get user_id from faculty table if facultyId is a faculty table ID
        try {
          const [facultyRows] = await conn.query(
            'SELECT user_id FROM faculty WHERE id = ?',
            [facultyId]
          );
          if (facultyRows.length > 0) {
            facultyUserId = facultyRows[0].user_id;
            console.log(`✅ Found faculty user_id: ${facultyUserId} from faculty table ID: ${facultyId}`);
          } else {
            // If not found in faculty table, assume it's already a user_id
            console.log(`ℹ️ facultyId ${facultyId} not found in faculty table, treating as user_id`);
          }
        } catch (e) {
          // If faculty table doesn't exist or error, assume facultyId is user_id
          console.log(`ℹ️ Could not check faculty table, treating facultyId as user_id`);
        }
        
        await createNotification({
          userId: facultyUserId,
          role: 'faculty',
          type: 'request_assigned',
          title: 'Request Assigned to You',
          message: `Request ${updated.requestCode || ''} from ${request.studentName} has been assigned to you`,
          requestId: request.id,
        });
        console.log(`✅ Notification sent to faculty user ID: ${facultyUserId}`);
      } catch (notifError) {
        console.warn('Failed to notify assigned faculty:', notifError.message);
      }
    }

    // Notify student when admin adds a note
    if (adminNote && req.user && req.user.role === 'admin') {
      try {
        const adminName = req.user.fullName || req.user.name || 'Admin';
        await createNotification({
          userId: request.studentId,
          role: 'student',
          type: 'comment',
          title: 'New Comment on Your Request',
          message: `${adminName} sent a comment: ${adminNote.substring(0, 100)}${adminNote.length > 100 ? '...' : ''}`,
          requestId: request.id,
        });
        console.log(`✅ Admin note notification sent to student ID: ${request.studentId} for request ${request.id}`);
      } catch (notifError) {
        console.warn('Failed to notify student of admin note:', notifError.message);
      }
    }

    // Notify faculty if admin added a note - ONLY if the request is assigned to them
    // Faculty don't need to see admin notes on requests they're not assigned to
    if (adminNote && req.user && req.user.role === 'admin' && request.facultyId) {
      try {
        // Only notify the specific faculty member assigned to this request
        // Get user_id from faculty table if facultyId is a faculty table ID
        let facultyUserId = request.facultyId;
        
        try {
          const [facultyRows] = await conn.query(
            'SELECT user_id FROM faculty WHERE id = ?',
            [request.facultyId]
          );
          if (facultyRows.length > 0) {
            facultyUserId = facultyRows[0].user_id;
          }
        } catch (e) {
          // If faculty table doesn't exist or error, assume facultyId is user_id
        }
        
        await createNotification({
          userId: facultyUserId,
          role: 'faculty',
          type: 'admin_note',
          title: 'Admin Note Added',
          message: `Admin added a note to request ${updated.requestCode || ''}`,
          requestId: request.id,
        });
        console.log(`✅ Admin note notification sent to assigned faculty user ID: ${facultyUserId}`);
      } catch (notifError) {
        console.warn('Failed to notify assigned faculty of admin note:', notifError.message);
      }
    }

    conn.release();
    console.log('✅ Request updated successfully');
    res.json(updated);
  } catch (error) {
    console.error('❌ Request PATCH error:', error);
    res.status(500).json({ message: 'Failed to update request.' });
  }
});

// UPDATE request (PUT - legacy)
router.put('/:id', authMiddleware(), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, facultyApproval } = req.body;

    const conn = await getConnection();

    // Get current request
    const [requestRows] = await conn.query(
      `SELECT r.*, d.name AS department_name, dd.label AS document_label,
              u.course AS student_course, u.year_level AS student_year_level, u.email AS student_email
       FROM requests r
       LEFT JOIN departments d ON d.id = r.department_id
       LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
       LEFT JOIN users u ON u.id = r.student_id
       WHERE r.id = ?`,
      [id]
    );

    if (requestRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = mapRequestRow(requestRows[0]);
    const updates = [];
    const params = [];

    // Status update
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    // Admin note update
    if (adminNote && req.user) {
      const updatedAdminNotes = [
        ...(request.adminNotes || []),
        {
          adminId: req.user.id,
          adminName: req.user.fullName || req.user.name || 'Admin',
          note: adminNote,
          timestamp: new Date().toISOString(),
        }
      ];
      updates.push('admin_notes = ?');
      params.push(JSON.stringify(updatedAdminNotes));
    }

    // Faculty approval update
    if (facultyApproval) {
      updates.push('faculty_approval = ?');
      params.push(JSON.stringify(facultyApproval));
    }

    if (!updates.length) {
      conn.release();
      return res.json(request);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE requests SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await conn.query(sql, params);

    // Get updated request
    const [updatedRows] = await conn.query(
      `SELECT r.*, d.name AS department_name, dd.label AS document_label,
              u.course AS student_course, u.year_level AS student_year_level, u.email AS student_email
       FROM requests r
       LEFT JOIN departments d ON d.id = r.department_id
       LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
       LEFT JOIN users u ON u.id = r.student_id
       WHERE r.id = ?`,
      [id]
    );

    const updated = mapRequestRow(updatedRows[0]);

    // Notification updates
    if (status && status !== request.status) {
      await createNotification({
        userId: request.studentId,
        role: 'student',
        type: 'status_update',
        title: `Request ${status.replace('_', ' ')}`,
        message: `Your request ${updated.requestCode || ''} status is now ${status}.`,
        requestId: request.id,
      });
    }

    conn.release();
    res.json(updated);
  } catch (error) {
    console.error('Request update error:', error);
    res.status(500).json({ message: 'Failed to update request.' });
  }
});

console.log('✅ Requests routes loaded - GET / and POST / registered');

module.exports = router;