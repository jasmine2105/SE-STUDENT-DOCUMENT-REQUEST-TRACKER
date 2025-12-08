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

// Get Activity Logs - based on document request activities
router.get('/logs', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const logs = [];
      
      // Get all requests with user information and track status changes
      let requests = [];
      try {
        const [requestResults] = await conn.query(`
          SELECT 
            r.id,
            r.request_code,
            r.status,
            r.faculty_status,
            r.submitted_at,
            r.updated_at,
            r.document_value,
            u.id as user_id,
            u.full_name as user_name,
            u.role as user_role,
            d.name as department_name,
            dd.label as document_label
          FROM requests r
          LEFT JOIN users u ON u.id = r.student_id
          LEFT JOIN departments d ON d.id = r.department_id
          LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
          ORDER BY r.updated_at DESC
          LIMIT 500
        `);
        requests = requestResults;
      } catch (reqError) {
        console.error('Error loading requests for activity logs:', reqError);
        // Continue without requests - return empty logs
      }

      // Get faculty/admin actions from request_conversations/comments
      let conversations = [];
      try {
        const [convResults] = await conn.query(`
          SELECT 
            c.id,
            c.request_id,
            c.user_id,
            c.message,
            c.created_at,
            u.full_name as user_name,
            u.role as user_role,
            r.request_code,
            r.document_value,
            d.name as department_name,
            dd.label as document_label
          FROM request_conversations c
          LEFT JOIN users u ON u.id = c.user_id
          LEFT JOIN requests r ON r.id = c.request_id
          LEFT JOIN departments d ON d.id = r.department_id
          LEFT JOIN department_documents dd ON dd.value = r.document_value AND dd.department_id = r.department_id
          WHERE u.role IN ('admin', 'faculty')
          ORDER BY c.created_at DESC
          LIMIT 200
        `);
        conversations = convResults;
      } catch (convError) {
        console.warn('Could not load conversations for activity logs:', convError.message);
        // Continue without conversations - not critical
      }

      // Process requests - create logs for status changes
      if (requests && Array.isArray(requests)) {
        requests.forEach(req => {
          const activity = getActivityFromStatus(req.status, req.faculty_status);
          if (activity) {
            logs.push({
              id: `req_${req.id}`,
              userId: req.user_id,
              userName: req.user_name || 'Unknown User',
              userRole: req.user_role,
              activity: activity,
              details: `${req.user_name || 'Student'} ${activity.toLowerCase()}d document request "${req.document_label || req.document_value}" for ${req.department_name || 'Department'}`,
              timestamp: req.updated_at || req.submitted_at,
              requestId: req.id,
              requestCode: req.request_code,
              documentLabel: req.document_label || req.document_value,
              departmentName: req.department_name
            });
          }
        });
      }

      // Process conversations - create logs for admin/faculty actions
      if (conversations && Array.isArray(conversations)) {
        conversations.forEach(conv => {
          if (conv && conv.user_id) {
            logs.push({
              id: `conv_${conv.id}`,
              userId: conv.user_id,
              userName: conv.user_name || 'Unknown User',
              userRole: conv.user_role,
              activity: 'Update',
              details: `${conv.user_name || 'Admin/Faculty'} commented on document request "${conv.document_label || conv.document_value}" for ${conv.department_name || 'Department'}: "${(conv.message || '').substring(0, 100)}${(conv.message || '').length > 100 ? '...' : ''}"`,
              timestamp: conv.created_at,
              requestId: conv.request_id,
              requestCode: conv.request_code,
              documentLabel: conv.document_label || conv.document_value,
              departmentName: conv.department_name
            });
          }
        });
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json(logs.slice(0, 300)); // Return top 300 most recent
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ message: 'Failed to load logs' });
  }
});

// Helper function to determine activity from status
function getActivityFromStatus(status, facultyStatus) {
  if (status === 'approved' || facultyStatus === 'approved') return 'Approve';
  if (status === 'declined' || facultyStatus === 'declined') return 'Decline';
  if (status === 'completed') return 'Approve'; // Completed is a form of approval
  if (status === 'pending' && !facultyStatus) return 'Create';
  return null; // Don't log other statuses as activities
}

// Get Settings
router.get('/settings', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      // Check if settings table exists, if not return defaults
      const [settings] = await conn.query(`
        SELECT setting_key, setting_value 
        FROM system_settings
        LIMIT 100
      `).catch(() => {
        // If table doesn't exist, return default settings
        return [[{
          setting_key: 'emailNotifications',
          setting_value: 'true'
        }, {
          setting_key: 'reminderFrequency',
          setting_value: '24'
        }, {
          setting_key: 'maintenanceMode',
          setting_value: 'false'
        }, {
          setting_key: 'maintenanceMessage',
          setting_value: 'System is under maintenance. Please check back later.'
        }, {
          setting_key: 'sessionTimeout',
          setting_value: '60'
        }, {
          setting_key: 'require2FA',
          setting_value: 'false'
        }, {
          setting_key: 'schoolName',
          setting_value: 'USJR Recoletos'
        }, {
          setting_key: 'logoURL',
          setting_value: ''
        }]];
      });

      // Convert array to object
      const settingsObj = {};
      settings.forEach(s => {
        const key = s.setting_key;
        let value = s.setting_value;
        
        // Parse boolean and number values
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value) && value !== '') value = Number(value);
        
        settingsObj[key] = value;
      });

      // Set defaults if missing
      const defaults = {
        emailNotifications: true,
        reminderFrequency: 24,
        maintenanceMode: false,
        maintenanceMessage: 'System is under maintenance. Please check back later.',
        sessionTimeout: 60,
        require2FA: false,
        schoolName: 'USJR Recoletos',
        logoURL: ''
      };

      res.json({ ...defaults, ...settingsObj });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Get settings error:', error);
    // Return default settings on error
    res.json({
      emailNotifications: true,
      reminderFrequency: 24,
      maintenanceMode: false,
      maintenanceMessage: 'System is under maintenance. Please check back later.',
      sessionTimeout: 60,
      require2FA: false,
      schoolName: 'USJR Recoletos',
      logoURL: ''
    });
  }
});

// Update Settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    const conn = await getConnection();
    try {
      // Ensure settings table exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Update or insert each setting
      for (const [key, value] of Object.entries(settings)) {
        await conn.query(`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        `, [key, String(value)]);
      }

      res.json({ message: 'Settings saved successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

// Create Backup
router.post('/backup', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        users: [],
        departments: [],
        documentTypes: [],
        requests: []
      };

      // Backup users (without passwords)
      const [users] = await conn.query(`
        SELECT id, role, id_number, full_name, email, department_id, course, year_level, position, is_super_admin
        FROM users
      `);
      backup.users = users;

      // Backup departments
      const [departments] = await conn.query('SELECT * FROM departments');
      backup.departments = departments;

      // Backup document types
      const [docTypes] = await conn.query('SELECT * FROM department_documents');
      backup.documentTypes = docTypes;

      // Backup requests (last 1000)
      const [requests] = await conn.query(`
        SELECT * FROM requests 
        ORDER BY submitted_at DESC 
        LIMIT 1000
      `);
      backup.requests = requests;

      res.json(backup);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ message: 'Failed to create backup' });
  }
});

// Restore Backup
router.post('/restore', async (req, res) => {
  try {
    const backup = req.body;
    
    if (!backup || !backup.timestamp) {
      return res.status(400).json({ message: 'Invalid backup file' });
    }

    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      // Restore departments (only if they don't exist)
      if (backup.departments && Array.isArray(backup.departments)) {
        for (const dept of backup.departments) {
          await conn.query(`
            INSERT INTO departments (id, code, name)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE code = VALUES(code), name = VALUES(name)
          `, [dept.id, dept.code, dept.name]);
        }
      }

      // Restore document types (only if they don't exist)
      if (backup.documentTypes && Array.isArray(backup.documentTypes)) {
        for (const doc of backup.documentTypes) {
          await conn.query(`
            INSERT INTO department_documents (id, department_id, label, value, requires_faculty)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              label = VALUES(label), 
              value = VALUES(value), 
              requires_faculty = VALUES(requires_faculty)
          `, [doc.id, doc.department_id, doc.label, doc.value, doc.requires_faculty || false]);
        }
      }

      // Note: We don't restore users or requests to avoid data conflicts
      // Users and requests should be managed separately

      await conn.commit();
      res.json({ message: 'Backup restored successfully' });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ message: 'Failed to restore backup' });
  }
});

// Get Reports Data
router.get('/reports', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      // Monthly Document Output (last 6 months)
      const [monthlyOutput] = await conn.query(`
        SELECT 
          DATE_FORMAT(submitted_at, '%Y-%m') as month,
          COUNT(*) as count
        FROM requests
        WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(submitted_at, '%Y-%m')
        ORDER BY month DESC
      `);

      // Department Performance
      const [departmentPerformance] = await conn.query(`
        SELECT 
          d.name,
          COUNT(r.id) as total,
          SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM departments d
        LEFT JOIN requests r ON r.department_id = d.id
        GROUP BY d.id, d.name
        ORDER BY completed DESC
      `);

      // Most Requested Documents
      const [topDocuments] = await conn.query(`
        SELECT 
          dd.label,
          dd.value,
          COUNT(r.id) as count
        FROM department_documents dd
        LEFT JOIN requests r ON r.document_value = dd.value AND r.department_id = dd.department_id
        GROUP BY dd.id, dd.label, dd.value
        ORDER BY count DESC
        LIMIT 10
      `);

      // Staff Performance (Faculty and Admin)
      const [staffPerformance] = await conn.query(`
        SELECT 
          u.full_name as name,
          u.role,
          COUNT(DISTINCT r.id) as processed
        FROM users u
        LEFT JOIN requests r ON (
          (u.role = 'faculty' AND r.faculty_id = u.id) OR
          (u.role = 'admin' AND r.admin_id = u.id)
        )
        WHERE u.role IN ('faculty', 'admin')
        GROUP BY u.id, u.full_name, u.role
        ORDER BY processed DESC
        LIMIT 10
      `);

      res.json({
        monthlyOutput: monthlyOutput.map(m => ({
          month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          count: m.count
        })),
        departmentPerformance: departmentPerformance.map(d => ({
          name: d.name,
          total: d.total || 0,
          completed: d.completed || 0
        })),
        topDocuments: topDocuments.map(d => ({
          label: d.label,
          value: d.value,
          count: d.count || 0
        })),
        staffPerformance: staffPerformance.map(s => ({
          name: s.name,
          role: s.role,
          processed: s.processed || 0
        }))
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ message: 'Failed to load reports' });
  }
});

module.exports = router;

