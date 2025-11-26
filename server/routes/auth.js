// server/routes/auth.js - Updated Signup Endpoint

const express = require('express');
const router = express.Router();
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (err) {
  // Fallback to bcryptjs (pure JS) if native bcrypt isn't installed or fails to build
  console.warn('⚠️ bcrypt not found or failed to load, falling back to bcryptjs. For better performance, run `npm install bcrypt`.');
  bcrypt = require('bcryptjs');
}
const jwt = require('jsonwebtoken');
const { initPool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper function to detect role from ID number
function detectRoleFromId(idNumber) {
  const id = idNumber.trim();
  
  // Student: 10 digits starting with 20 (e.g., 2022011084)
  if (/^20\d{8}$/.test(id)) {
    return 'student';
  }
  
  // Faculty: Starts with FAC- or F followed by digits
  if (/^FAC-?\d+$/i.test(id) || /^F\d{4,}$/i.test(id)) {
    return 'faculty';
  }
  
  // Admin: Starts with ADM- or A followed by digits
  if (/^ADM-?\d+$/i.test(id) || /^A\d{4,}$/i.test(id)) {
    return 'admin';
  }
  
  return null;
}

// Signup endpoint
router.post('/signup', async (req, res) => {
  console.log('📝 Signup request received:', { ...req.body, password: '[HIDDEN]' });

  try {
    const { 
      fullName, 
      email, 
      idNumber, 
      password,
      role,
      departmentId,
      course,
      yearLevel,
      position
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !idNumber || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Full name, email, ID number, and password are required.' 
      });
    }

    // Auto-detect role from ID number
    const detectedRole = detectRoleFromId(idNumber);
    console.log('🔎 Detected role from ID on server:', { idNumber, detectedRole });
    
    if (!detectedRole) {
      return res.status(400).json({ 
        error: 'Invalid ID format',
        message: 'ID number format not recognized. Use: Student (2022011084), Faculty (FAC-001), or Admin (ADM-001)' 
      });
    }

    // If client sent a role but it doesn't match the detected role,
    // don't fail the request — override with the detected role and log a warning.
    if (role && role !== detectedRole) {
      console.warn('⚠️ Role mismatch on signup request - overriding client role', { clientRole: role, detectedRole });
    }

    // Use the detected role from the ID for all server-side logic
    const finalRole = detectedRole;

    // Get DB pool and check if user already exists
    const pool = await initPool();
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE id_number = ? OR email = ?',
      [idNumber, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'An account with this ID number or email already exists.' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email',
        message: 'Please provide a valid email address.' 
      });
    }

    // Validate password length
    if (password.length < 3) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: 'Password must be at least 3 characters long.' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user based on role
    let insertQuery;
    let insertParams;

    if (finalRole === 'student') {
      if (!departmentId || !course || !yearLevel) {
        return res.status(400).json({ 
          error: 'Missing student fields',
          message: 'Department, course, and year level are required for students.' 
        });
      }

      insertQuery = `
        INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      insertParams = [finalRole, idNumber, fullName, email, hashedPassword, departmentId, course, yearLevel];

    } else if (finalRole === 'faculty') {
      if (!departmentId) {
        return res.status(400).json({ 
          error: 'Missing faculty fields',
          message: 'Department is required for faculty.' 
        });
      }

      insertQuery = `
        INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      insertParams = [finalRole, idNumber, fullName, email, hashedPassword, departmentId, position || null];

    } else if (finalRole === 'admin') {
      if (!departmentId) {
        return res.status(400).json({ 
          error: 'Missing admin fields',
          message: 'Department is required for administrators.' 
        });
      }

      insertQuery = `
        INSERT INTO users (role, id_number, full_name, email, password_hash, department_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      insertParams = [finalRole, idNumber, fullName, email, hashedPassword, departmentId];
    }

    // Insert user into database
    const [result] = await pool.query(insertQuery, insertParams);
    const userId = result.insertId;

    // Get the complete user data with department info
    const [users] = await pool.query(`
      SELECT 
        u.id, 
        u.role, 
        u.id_number AS idNumber, 
        u.full_name AS fullName, 
        u.email, 
        u.password_hash AS password,
        u.department_id AS departmentId,
        d.name as department,
        d.code as departmentCode,
        u.course,
        u.year_level AS yearLevel,
        u.position
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `, [userId]);

    const user = users[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department,
        fullName: user.fullName,
        idNumber: user.idNumber
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    console.log('✅ User created successfully:', { 
      id: user.id, 
      role: user.role, 
      idNumber: user.idNumber 
    });

    // Return user data and token
    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        role: user.role,
        idNumber: user.idNumber,
        fullName: user.fullName,
        email: user.email,
        departmentId: user.departmentId,
        department: user.department,
        departmentCode: user.departmentCode,
        course: user.course || null,
        yearLevel: user.yearLevel || null,
        position: user.position || null
      },
      token
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ 
      error: 'Signup failed',
      message: 'An error occurred while creating your account. Please try again.' 
    });
  }
});

// Login endpoint - Auto route based on database role
router.post('/login', async (req, res) => {
  console.log('🔐 Login request received');

  try {
    const { idNumber, password } = req.body;

    if (!idNumber || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'ID number and password are required.' 
      });
    }

    // Find user by ID number (role is determined from database)
    const pool = await initPool();
    const [users] = await pool.query(`
      SELECT 
        u.id, 
        u.role, 
        u.id_number AS idNumber, 
        u.full_name AS fullName, 
        u.email, 
        u.password_hash AS password,
        u.department_id AS departmentId,
        d.name as department,
        d.code as departmentCode,
        u.course,
        u.year_level AS yearLevel,
        u.position
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id_number = ?
    `, [idNumber]);

    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'ID number or password is incorrect.' 
      });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'ID number or password is incorrect.' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department,
        fullName: user.fullName,
        idNumber: user.idNumber
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    console.log('✅ Login successful:', { 
      id: user.id, 
      role: user.role, 
      idNumber: user.idNumber 
    });

    // Return user data (without password) and token
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        role: user.role,
        idNumber: user.idNumber,
        fullName: user.fullName,
        email: user.email,
        departmentId: user.departmentId,
        department: user.department,
        departmentCode: user.departmentCode,
        course: user.course || null,
        yearLevel: user.yearLevel || null,
        position: user.position || null
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An error occurred during login. Please try again.' 
    });
  }
});

module.exports = router;