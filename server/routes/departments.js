const express = require('express');
const { getConnection } = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Fallback departments data when database is unavailable
const FALLBACK_DEPARTMENTS = [
  { id: 1, code: 'SBM', name: 'School of Business Management (SBM)', documents: [] },
  { id: 2, code: 'SAS', name: 'School of Arts and Sciences (SAS)', documents: [] },
  { id: 3, code: 'SDPC', name: 'Student Development and Programs Center (SDPC)', documents: [] },
  { id: 4, code: 'SASO', name: 'Student Affairs and Services Office (SASO)', documents: [] },
  { id: 5, code: 'SSD', name: 'Security Services Department (SSD)', documents: [] },
  { id: 6, code: 'CLINIC', name: 'Clinic', documents: [] },
  { id: 7, code: 'SCS', name: 'School of Computer Studies (SCS)', documents: [] },
  { id: 8, code: 'SCHOLARSHIP', name: 'Scholarship Office', documents: [] },
  { id: 9, code: 'LIBRARY', name: 'Library', documents: [] },
  { id: 10, code: 'CMO', name: 'Campus Management Office (CMO)', documents: [] }
];

router.get('/', async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const [departments] = await conn.query('SELECT id, code, name FROM departments ORDER BY name');
      const [documents] = await conn.query('SELECT id, department_id, label, value, requires_faculty FROM department_documents ORDER BY label');

      const docsByDepartment = documents.reduce((acc, doc) => {
        acc[doc.department_id] = acc[doc.department_id] || [];
        acc[doc.department_id].push({
          id: doc.id,
          label: doc.label,
          value: doc.value,
          requiresFaculty: !!doc.requires_faculty,
        });
        return acc;
      }, {});

      const payload = departments.map((dept) => ({
        id: dept.id,
        code: dept.code,
        name: dept.name,
        documents: docsByDepartment[dept.id] || [],
      }));

      res.json(payload);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Departments error:', error);
    console.warn('Using fallback departments data due to database connection failure');
    // Return fallback data instead of error - allows app to work without database
    res.json(FALLBACK_DEPARTMENTS);
  }
});

// Get documents for a specific department
router.get('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await getConnection();
    try {
      const [documents] = await conn.query(
        'SELECT id, label, value, requires_faculty FROM department_documents WHERE department_id = ?',
        [id]
      );
      res.json(documents);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Department documents error:', error);
    res.status(500).json({ message: 'Failed to load department documents' });
  }
});

// Update department (requires authentication)
router.put('/:id', authMiddleware(), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }
    
    const conn = await getConnection();
    try {
      await conn.query(
        'UPDATE departments SET name = ?, code = ? WHERE id = ?',
        [name, code, id]
      );
      res.json({ message: 'Department updated successfully' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Failed to update department' });
  }
});

module.exports = router;

