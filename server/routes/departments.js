const express = require('express');
const { getConnection } = require('../config/db');

const router = express.Router();

// Fallback departments data when database is unavailable
const FALLBACK_DEPARTMENTS = [
  { id: 1, code: 'SCS', name: 'School of Computer Studies (SCS)', documents: [] },
  { id: 2, code: 'SBM', name: 'School of Business Management (SBM)', documents: [] },
  { id: 3, code: 'SOE', name: 'School of Engineering (SOE)', documents: [] },
  { id: 4, code: 'SAS', name: 'School of Arts and Sciences (SAS)', documents: [] },
  { id: 5, code: 'SOEd', name: 'School of Education (SOEd)', documents: [] },
  { id: 6, code: 'SAMS', name: 'School of Allied Medical Sciences (SAMS)', documents: [] },
  { id: 7, code: 'SOL', name: 'School of Law (SOL)', documents: [] },
  { id: 8, code: 'ETEEAP', name: 'ETEEAP (Expanded Tertiary Education Equivalency and Accreditation Program)', documents: [] }
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

module.exports = router;

