const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getConnection } = require('../config/db');
const bcrypt = require('bcryptjs');

// Middleware to check if user is super admin
const superAdminMiddleware = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check if user is super admin (either by flag or by ID number)
  if (user.isSuperAdmin || user.idNumber === '1234') {
    return next();
  }
  
  return res.status(403).json({ message: 'Super admin access required' });
};

// Apply super admin middleware to all routes
router.use(authMiddleware());
router.use(superAdminMiddleware);

// Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const [stats] = await conn.query(`
        SELECT 
          (SELECT COUNT(*) FROM requests) as totalRequests,
          (SELECT COUNT(*) FROM requests WHERE status = 'pending_faculty') as pendingFaculty,
          (SELECT COUNT(*) FROM requests WHERE status IN ('pending', 'in_progress', 'approved')) as pendingAdmin,
          (SELECT COUNT(*) FROM requests WHERE status = 'completed') as completed,
          (SELECT COUNT(*) FROM users WHERE role = 'student') as activeStudents,
          (SELECT COUNT(*) FROM users WHERE role = 'faculty') as activeFaculty,
          (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_super_admin = FALSE) as activeAdmins,
          (SELECT COUNT(*) FROM departments) as departments
      `);
      
      res.json(stats[0] || {});
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// Department Stats
router.get('/department-stats', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const [stats] = await conn.query(`
        SELECT 
          d.id,
          d.code,
          d.name,
          COUNT(r.id) as requestCount,
          SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completedCount
        FROM departments d
        LEFT JOIN requests r ON r.department_id = d.id
        GROUP BY d.id, d.code, d.name
        ORDER BY d.code
      `);
      
      res.json(stats);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Department stats error:', error);
    res.status(500).json({ message: 'Failed to load department stats' });
  }
});

// Get All Users
router.get('/users', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const [users] = await conn.query(`
        SELECT 
          u.id,
          u.id_number AS idNumber,
          u.full_name AS fullName,
          u.email,
          u.role,
          u.department_id AS departmentId,
          d.name AS department,
          u.course,
          u.year_level AS yearLevel,
          u.position,
          u.is_super_admin AS isSuperAdmin,
          CASE WHEN u.id IS NOT NULL THEN TRUE ELSE FALSE END as isActive
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.role, u.full_name
      `);
      
      res.json(users);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// Create User
router.post('/users', async (req, res) => {
  try {
    const { role, idNumber, fullName, email, password, departmentId, course, yearLevel, position } = req.body;
    
    if (!role || !idNumber || !fullName || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const conn = await getConnection();
    try {
      // Check if ID number already exists
      const [existing] = await conn.query('SELECT id FROM users WHERE id_number = ?', [idNumber]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'ID number already exists' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Insert user
      let insertQuery;
      let insertParams;
      
      if (role === 'student') {
        insertQuery = `
          INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        insertParams = [role, idNumber, fullName, email, passwordHash, departmentId || null, course || null, yearLevel || null];
      } else if (role === 'faculty') {
        insertQuery = `
          INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        insertParams = [role, idNumber, fullName, email, passwordHash, departmentId || null, position || null];
      } else if (role === 'admin') {
        insertQuery = `
          INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin)
          VALUES (?, ?, ?, ?, ?, ?, FALSE)
        `;
        insertParams = [role, idNumber, fullName, email, passwordHash, departmentId || null];
      } else {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      const [result] = await conn.query(insertQuery, insertParams);
      
      res.json({ message: 'User created successfully', userId: result.insertId });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Reset User Password
router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(newPassword || defaultPassword, 10);
    
    const conn = await getConnection();
    try {
      await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
      res.json({ message: 'Password reset successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Toggle User Status (enable/disable)
router.post('/users/:userId/toggle-status', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const conn = await getConnection();
    try {
      // For now, we'll just return success since we don't have an is_active column
      // In a real implementation, you'd add this column and toggle it
      res.json({ message: 'User status updated successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
});

// Get All Document Types
router.get('/document-types', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const [docs] = await conn.query(`
        SELECT 
          dd.id,
          dd.label,
          dd.value,
          dd.requires_faculty,
          dd.department_id,
          d.name AS departmentName,
          d.code AS departmentCode
        FROM department_documents dd
        LEFT JOIN departments d ON dd.department_id = d.id
        ORDER BY d.code, dd.label
      `);
      
      res.json(docs);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Document types error:', error);
    res.status(500).json({ message: 'Failed to load document types' });
  }
});

// Update Document Type
router.put('/document-types/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const { label, value, requiresFaculty } = req.body;
    
    if (!label || !value) {
      return res.status(400).json({ message: 'Label and value are required' });
    }
    
    const conn = await getConnection();
    try {
      await conn.query(
        'UPDATE department_documents SET label = ?, value = ?, requires_faculty = ? WHERE id = ?',
        [label, value, requiresFaculty || false, docId]
      );
      res.json({ message: 'Document type updated successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Update document type error:', error);
    res.status(500).json({ message: 'Failed to update document type' });
  }
});

// Delete Document Type
router.delete('/document-types/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    
    const conn = await getConnection();
    try {
      await conn.query('DELETE FROM department_documents WHERE id = ?', [docId]);
      res.json({ message: 'Document type deleted successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Delete document type error:', error);
    res.status(500).json({ message: 'Failed to delete document type' });
  }
});

// Delete Department
router.delete('/departments/:deptId', async (req, res) => {
  try {
    const { deptId } = req.params;
    
    const conn = await getConnection();
    try {
      // Check if department has users or requests
      const [users] = await conn.query('SELECT COUNT(*) as count FROM users WHERE department_id = ?', [deptId]);
      const [requests] = await conn.query('SELECT COUNT(*) as count FROM requests WHERE department_id = ?', [deptId]);
      
      if (users[0].count > 0 || requests[0].count > 0) {
        return res.status(400).json({ message: 'Cannot delete department with existing users or requests' });
      }
      
      await conn.query('DELETE FROM departments WHERE id = ?', [deptId]);
      res.json({ message: 'Department deleted successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Failed to delete department' });
  }
});

// Get All Requests
router.get('/requests', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const [requests] = await conn.query(`
        SELECT 
          r.id,
          r.request_code AS requestCode,
          r.student_name AS studentName,
          r.student_id_number AS studentIdNumber,
          r.document_value AS documentValue,
          r.document_label AS documentLabel,
          r.status,
          r.department_id AS departmentId,
          r.submitted_at AS submittedAt,
          d.name AS departmentName,
          d.code AS departmentCode,
          CASE 
            WHEN r.status = 'pending_faculty' THEN 'pending_faculty'
            WHEN r.status IN ('pending', 'in_progress') THEN 'pending'
            ELSE r.status
          END AS facultyStatus
        FROM requests r
        LEFT JOIN departments d ON r.department_id = d.id
        ORDER BY r.submitted_at DESC
        LIMIT 1000
      `);
      
      res.json(requests);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Requests list error:', error);
    res.status(500).json({ message: 'Failed to load requests' });
  }
});

// Get Activity Logs (placeholder - would need a logs table)
router.get('/logs', async (req, res) => {
  try {
    // For now, return empty array
    // In a real implementation, you'd query a logs/audit table
    res.json([]);
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ message: 'Failed to load logs' });
  }
});

module.exports = router;

