const express = require('express');
const { getConnection } = require('../config/db');

const router = express.Router();

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
    res.status(500).json({ message: 'Failed to load departments.' });
  }
});

module.exports = router;

