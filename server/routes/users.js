const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getConnection } = require('../config/db');

const router = express.Router();

router.get('/faculty', authMiddleware(true), async (req, res) => {
  try {
    const conn = await getConnection();
    try {
      const params = [];
      let sql = 'SELECT id, full_name AS fullName, department_id AS departmentId FROM users WHERE role = "faculty"';

      if (req.user.role === 'faculty') {
        sql += ' AND department_id = ?';
        params.push(req.user.departmentId || 0);
      }

      const [rows] = await conn.query(sql, params);
      res.json(rows);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Faculty list error:', error);
    res.status(500).json({ message: 'Failed to load faculty list.' });
  }
});

router.get('/admins', authMiddleware(true), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admins only.' });
  }

  try {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query('SELECT id, full_name AS fullName FROM users WHERE role = "admin"');
      res.json(rows);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Admin list error:', error);
    res.status(500).json({ message: 'Failed to load admins.' });
  }
});

// Get all students and faculty with full data
router.get('/all', authMiddleware(true), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admins only.' });
  }

  try {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT 
          id, 
          full_name AS fullName, 
          email, 
          role, 
          id_number AS studentIdNumber,
          course,
          year_level AS year,
          department_id AS departmentId,
          created_at AS createdAt
        FROM users 
        WHERE role IN ('student', 'faculty')
        ORDER BY role ASC, full_name ASC
      `);
      res.json(rows);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('All users list error:', error);
    res.status(500).json({ message: 'Failed to load users.' });
  }
});

module.exports = router;

