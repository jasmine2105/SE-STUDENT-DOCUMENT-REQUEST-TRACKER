const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getConnection } = require('../config/db');
const { createNotification } = require('../services/notifications');

const router = express.Router();

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
    facultyApproval: parseJsonField(row.faculty_approval, null),
    adminNotes: parseJsonField(row.admin_notes, []),
    attachments: parseJsonField(row.attachments, []),
    requiresFaculty: !!row.requires_faculty,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  };
}

// Fallback document types by department code
const FALLBACK_DOCUMENT_TYPES = {
  'SCS': [
    { id: 'tor', value: 'Transcript of Records', name: 'Transcript of Records', requires_faculty: true },
    { id: 'good_moral', value: 'Good Moral Certificate', name: 'Certificate of Good Moral Character', requires_faculty: true },
    { id: 'syllabus', value: 'Course Syllabus', name: 'Course Syllabus', requires_faculty: true },
    { id: 'clearance', value: 'Clearance', name: 'Clearance', requires_faculty: false },
    { id: 'enrollment', value: 'Enrollment Certification', name: 'Enrollment Certification', requires_faculty: false }
  ],
  'SBM': [
    { id: 'tor_sbm', value: 'Transcript of Records - SBM', name: 'Transcript of Records', requires_faculty: true },
    { id: 'good_moral_sbm', value: 'Good Moral Certificate - SBM', name: 'Certificate of Good Moral Character', requires_faculty: true },
    { id: 'internship', value: 'Internship Certification', name: 'Internship Certification', requires_faculty: true },
    { id: 'clearance_sbm', value: 'Clearance - SBM', name: 'Clearance', requires_faculty: false }
  ],
  'SAS': [
    { id: 'tor_sas', value: 'Transcript of Records - SAS', name: 'Transcript of Records', requires_faculty: true },
    { id: 'program', value: 'Program Certification', name: 'Program Certification', requires_faculty: true },
    { id: 'clearance_sas', value: 'Clearance - SAS', name: 'Clearance', requires_faculty: false }
  ],
  'SOE': [
    { id: 'tor_soe', value: 'Transcript of Records - SOE', name: 'Transcript of Records', requires_faculty: true },
    { id: 'board_exam', value: 'Board Exam Endorsement', name: 'Board Exam Endorsement', requires_faculty: true },
    { id: 'clearance_soe', value: 'Clearance - SOE', name: 'Clearance', requires_faculty: false }
  ],
  'SAMS': [
    { id: 'tor_sams', value: 'Transcript of Records - SAMS', name: 'Transcript of Records', requires_faculty: true },
    { id: 'clinical', value: 'Clinical Rotation Certification', name: 'Clinical Rotation Certification', requires_faculty: true },
    { id: 'good_moral_sams', value: 'Good Moral Certificate - SAMS', name: 'Certificate of Good Moral Character', requires_faculty: true }
  ],
  'SOL': [
    { id: 'tor_sol', value: 'Transcript of Records - SOL', name: 'Transcript of Records', requires_faculty: true },
    { id: 'bar', value: 'BAR Endorsement', name: 'BAR Endorsement', requires_faculty: true },
    { id: 'grades', value: 'Certification of Grades', name: 'Certification of Grades', requires_faculty: true }
  ],
  'ETEEAP': [
    { id: 'tor_eteeap', value: 'ETEEAP TOR', name: 'Transcript of Records', requires_faculty: true },
    { id: 'competency', value: 'Competency Certificate', name: 'Competency Certificate', requires_faculty: true }
  ],
  'SOEd': [
    { id: 'tor_soed', value: 'Transcript of Records - SOEd', name: 'Transcript of Records', requires_faculty: true },
    { id: 'practice', value: 'Practice Teaching Certification', name: 'Practice Teaching Certification', requires_faculty: true },
    { id: 'good_moral_soed', value: 'Good Moral Certificate - SOEd', name: 'Certificate of Good Moral Character', requires_faculty: true }
  ]
};

// NEW ENDPOINT: Get document types by department
router.get('/document-types/:departmentCode', authMiddleware(true), async (req, res) => {
  const { departmentCode } = req.params;

  try {
    const conn = await getConnection();
    try {
      // First, get department ID from code
      const [deptRows] = await conn.query(
        'SELECT id FROM departments WHERE code = ? OR name LIKE ?', 
        [departmentCode, `%${departmentCode}%`]
      );

      if (deptRows.length === 0) {
        // Department not found in DB, try fallback
        console.warn(`Department ${departmentCode} not found in database, using fallback`);
        const fallbackDocs = FALLBACK_DOCUMENT_TYPES[departmentCode] || [];
        if (fallbackDocs.length > 0) {
          return res.json(fallbackDocs);
        }
        return res.status(404).json({ message: 'Department not found.' });
      }

      const departmentId = deptRows[0].id;

      // Get document types for this department (use `department_documents` table present in DB)
      const [docRows] = await conn.query(
        `SELECT id, value, label, requires_faculty 
         FROM department_documents 
         WHERE department_id = ? 
         ORDER BY label`,
        [departmentId]
      );

      const documentTypes = docRows.map(row => ({
        id: row.id,
        value: row.value,
        name: row.label,
        requires_faculty: !!row.requires_faculty
      }));

      // If no document types in DB, use fallback
      if (documentTypes.length === 0) {
        console.warn(`No document types found in DB for ${departmentCode}, using fallback`);
        const fallbackDocs = FALLBACK_DOCUMENT_TYPES[departmentCode] || [];
        if (fallbackDocs.length > 0) {
          return res.json(fallbackDocs);
        }
      }

      res.json(documentTypes);
    } finally {
      if (conn) conn.release();
    }
  } catch (error) {
    console.error('Document types get error:', error);
    
    // On error, try to return fallback data
    const fallbackDocs = FALLBACK_DOCUMENT_TYPES[departmentCode] || [];
    if (fallbackDocs.length > 0) {
      console.warn(`Database error, using fallback document types for ${departmentCode}`);
      return res.json(fallbackDocs);
    }
    
    res.status(500).json({ message: 'Failed to load document types.' });
  }
});

// EXISTING ENDPOINTS - NO CHANGES
router.get('/', authMiddleware(true), async (req, res) => {
  const { role, id } = req.user;
  const departmentId = req.user.departmentId !== undefined && req.user.departmentId !== null
    ? Number(req.user.departmentId)
    : null;
  const filters = [];
  const params = [];

  if (role === 'student') {
    filters.push('r.student_id = ?');
    params.push(id);
  } else if (role === 'faculty') {
    if (departmentId) {
      filters.push('(r.department_id = ? AND (r.status IN ("pending_faculty", "in_progress") OR r.faculty_id = ?))');
      params.push(departmentId, id);
    } else {
      filters.push('(r.status IN ("pending_faculty", "in_progress") OR r.faculty_id = ?)');
      params.push(id);
    }
  } // admin sees all

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT r.*, d.name AS department_name, dd.label AS document_label
         FROM requests r
         LEFT JOIN departments d ON d.id = r.department_id
         LEFT JOIN department_documents dd ON dd.value = r.document_value
         ${whereClause}
         ORDER BY r.submitted_at DESC`, params
      );

      res.json(rows.map(mapRequestRow));
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Requests get error:', error);
    res.status(500).json({ message: 'Failed to load requests.' });
  }
});

router.post('/', authMiddleware(true), async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can submit requests.' });
  }

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

  const departmentNumeric = parseInt(departmentId, 10);
  if (Number.isNaN(departmentNumeric) || !documentValue) {
    return res.status(400).json({ message: 'Department and document type are required.' });
  }

  const initialStatus = requiresFaculty ? 'pending_faculty' : 'pending';

  try {
    const conn = await getConnection();
    try {
      const [studentRows] = await conn.query('SELECT full_name, id_number FROM users WHERE id = ?', [req.user.id]);
      const student = studentRows[0];

      const [result] = await conn.query(
        `INSERT INTO requests
         (student_id, student_name, student_id_number, department_id, document_value, document_label, status,
          quantity, purpose, cross_department, cross_department_details, attachments, requires_faculty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          req.user.id,
          student.full_name,
          student.id_number,
          departmentNumeric,
          documentValue,
          documentType,
          initialStatus,
          quantity || 1,
          purpose || null,
          !!crossDepartment,
          crossDepartmentDetails || null,
          JSON.stringify(attachments),
          !!requiresFaculty
        ]
      );

      const requestId = result.insertId;
      const requestCode = `REQ-${new Date().getFullYear()}-${String(requestId).padStart(5, '0')}`;
      await conn.query('UPDATE requests SET request_code = ? WHERE id = ?', [requestCode, requestId]);

      // Notify admins
      const [admins] = await conn.query('SELECT id FROM users WHERE role = "admin"');
      await Promise.all(admins.map((admin) => createNotification({
        userId: admin.id,
        role: 'admin',
        type: 'new_request',
        title: 'New Document Request',
        message: `${student.full_name} submitted ${documentType}`,
        requestId,
      })));

      // Notify faculty if needed
      if (requiresFaculty) {
        const [faculty] = await conn.query('SELECT id FROM users WHERE role = "faculty" AND department_id = ?', [departmentId]);
        await Promise.all(faculty.map((fac) => createNotification({
          userId: fac.id,
          role: 'faculty',
          type: 'approval_needed',
          title: 'Approval Required',
          message: `${student.full_name} needs approval for ${documentType}`,
          requestId,
        })));
      }

      await createNotification({
        userId: req.user.id,
        role: 'student',
        type: 'status_update',
        title: 'Request Submitted',
        message: `Your request for ${documentType} has been submitted`,
        requestId,
      });

      const [createdRows] = await conn.query(
        `SELECT r.*, d.name AS department_name, dd.label AS document_label
         FROM requests r
         LEFT JOIN departments d ON d.id = r.department_id
         LEFT JOIN department_documents dd ON dd.value = r.document_value
         WHERE r.id = ?`,
        [requestId]
      );

      res.status(201).json(mapRequestRow(createdRows[0]));
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Request create error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to submit request.';
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Database table not found. Please check database setup.';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Database schema error. Please check database setup.';
    } else if (error.sqlMessage) {
      errorMessage = `Database error: ${error.sqlMessage}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ message: errorMessage });
  }
});

router.patch('/:id', authMiddleware(true), async (req, res) => {
  const { id } = req.params;
  const {
    status,
    priority,
    facultyId,
    adminNote,
    attachments,
    facultyApproval,
  } = req.body;

  try {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query('SELECT * FROM requests WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Request not found.' });
      }

      const request = rows[0];
      const updates = [];
      const params = [];

      if (status && status !== request.status) {
        updates.push('status = ?');
        params.push(status);
        if (status === 'completed') {
          updates.push('completed_at = CURRENT_TIMESTAMP');
        } else if (request.status === 'completed') {
          updates.push('completed_at = NULL');
        }
      }
      if (priority && priority !== request.priority) {
        updates.push('priority = ?');
        params.push(priority);
      }
      if (facultyId !== undefined) {
        updates.push('faculty_id = ?');
        params.push(facultyId || null);
      }
      if (attachments) {
        updates.push('attachments = ?');
        params.push(JSON.stringify(attachments));
      }

      // admin notes
      let updatedAdminNotes = parseJsonField(request.admin_notes, []);
      if (adminNote) {
        updatedAdminNotes.push({
          adminId: req.user.id,
          adminName: req.user.fullName || req.user.name || 'Admin',
          note: adminNote,
          timestamp: new Date().toISOString(),
        });
        updates.push('admin_notes = ?');
        params.push(JSON.stringify(updatedAdminNotes));
      }

      // faculty approval update
      if (facultyApproval) {
        updates.push('faculty_approval = ?');
        params.push(JSON.stringify(facultyApproval));
      }

      if (!updates.length) {
        return res.json(mapRequestRow(request));
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      const sql = `UPDATE requests SET ${updates.join(', ')} WHERE id = ?`;
      params.push(id);
      await conn.query(sql, params);

      const [updatedRows] = await conn.query(
        `SELECT r.*, d.name AS department_name, dd.label AS document_label
         FROM requests r
         LEFT JOIN departments d ON d.id = r.department_id
         LEFT JOIN department_documents dd ON dd.value = r.document_value
         WHERE r.id = ?`, [id]
      );
      const updated = mapRequestRow(updatedRows[0]);

      // Notification updates
      if (status && status !== request.status) {
        await createNotification({
          userId: request.student_id,
          role: 'student',
          type: 'status_update',
          title: `Request ${status.replace('_', ' ')}`,
          message: `Your request ${updated.requestCode || ''} status is now ${status}.`,
          requestId: request.id,
        });
      }

      res.json(updated);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Request update error:', error);
    res.status(500).json({ message: 'Failed to update request.' });
  }
});

module.exports = router;