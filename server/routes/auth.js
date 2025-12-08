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
const authMiddleware = require('../middleware/auth');

// JWT_SECRET: Use .env value if set, otherwise fallback to default
// NOTE: In production, JWT_SECRET should ALWAYS be set in .env for security
const JWT_SECRET = process.env.JWT_SECRET || 'recoletos-secret';

// Helper function to detect role from ID number length
function detectRoleFromId(idNumber) {
  const id = idNumber.trim();
  
  // Must be numeric only
  if (!/^\d+$/.test(id)) {
    return null;
  }
  
  // Student: exactly 10 digits
  if (id.length === 10) {
    return 'student';
  }
  
  // Faculty: exactly 5 digits
  if (id.length === 5) {
    return 'faculty';
  }
  
  // Super Admin: exactly 4 digits
  if (id.length === 4) {
    return 'admin'; // Super admin is still role 'admin' but with is_super_admin flag
  }
  
  // Regular Admin: exactly 3 digits
  if (id.length === 3) {
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
      const idLength = idNumber.trim().length;
      let errorMessage = 'Invalid ID length. ';
      if (idLength < 3) {
        errorMessage = 'Invalid ID Number';
      } else if (idLength > 10) {
        errorMessage = 'ID number must be 10 digits or less. ';
      }
      errorMessage += '';
      return res.status(400).json({ 
        error: 'Invalid ID length',
        message: errorMessage
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
    let pool;
    try {
      pool = await initPool();
    } catch (dbError) {
      console.error('❌ Database connection failed during signup:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: 'Unable to connect to database. Please check your database configuration or contact support.' 
      });
    }

    let existingUsers;
    try {
      [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE id_number = ? OR email = ?',
        [idNumber, email]
      );
    } catch (queryError) {
      console.error('❌ Database query failed during signup:', queryError);
      return res.status(500).json({ 
        error: 'Database query failed',
        message: 'Unable to check existing users. Please try again later.' 
      });
    }

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
    let result;
    try {
      [result] = await pool.query(insertQuery, insertParams);
    } catch (insertError) {
      console.error('❌ Database insert failed during signup:', insertError);
      return res.status(500).json({ 
        error: 'Database insert failed',
        message: 'Unable to create account. Please try again later or contact support.' 
      });
    }
    
    const userId = result.insertId;
    if (!userId) {
      console.error('❌ No user ID returned from insert');
      return res.status(500).json({ 
        error: 'Account creation failed',
        message: 'Unable to create account. Please try again.' 
      });
    }

    // Get the complete user data with department info
    let users;
    try {
      [users] = await pool.query(`
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
    } catch (queryError) {
      console.error('❌ Failed to fetch created user:', queryError);
      return res.status(500).json({ 
        error: 'Account created but failed to retrieve user data',
        message: 'Your account may have been created. Please try logging in.' 
      });
    }

    if (!users || users.length === 0) {
      console.error('❌ User not found after creation');
      return res.status(500).json({ 
        error: 'User not found',
        message: 'Account may have been created. Please try logging in.' 
      });
    }

    const user = users[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department,
        fullName: user.fullName,
        idNumber: user.idNumber,
        isSuperAdmin: false
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
        position: user.position || null,
        isSuperAdmin: false
      },
      token
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more helpful error messages
    let errorMessage = 'An error occurred while creating your account. Please try again.';
    
    if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = 'An account with this ID number or email already exists.';
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Database tables not found. Please ensure the database is properly set up.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = 'Database connection failed. Please check your database configuration.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: 'Signup failed',
      message: errorMessage 
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

    // Validate ID number format (must be numeric)
    if (!/^\d+$/.test(idNumber.trim())) {
      return res.status(400).json({ 
        error: 'Invalid ID format',
        message: 'ID number must contain only digits.' 
      });
    }

    // Validate ID number length for role detection
    const detectedRole = detectRoleFromId(idNumber);
    if (!detectedRole) {
      const idLength = idNumber.trim().length;
      let errorMessage = 'Invalid ID length. ';
      if (idLength < 3) {
        errorMessage = 'Invalid ID Number ';
      } else if (idLength > 10) {
        errorMessage = 'ID number must be 10 digits or less. ';
      }
      errorMessage += '';
      return res.status(400).json({ 
        error: 'Invalid ID length',
        message: errorMessage
      });
    }

    // Find user by ID number (role is determined from database)
    const pool = await initPool();
    
    // Check if is_super_admin column exists
    let isSuperAdminSelect = 'FALSE AS isSuperAdmin';
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'is_super_admin'
      `);
      if (columns.length > 0) {
        isSuperAdminSelect = 'COALESCE(u.is_super_admin, FALSE) AS isSuperAdmin';
      }
    } catch (colError) {
      console.warn('⚠️ Could not check for is_super_admin column, using default FALSE');
    }
    
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
        u.position,
        ${isSuperAdminSelect}
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
        idNumber: user.idNumber,
        isSuperAdmin: !!user.isSuperAdmin
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
        position: user.position || null,
        isSuperAdmin: !!user.isSuperAdmin
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Login error stack:', error.stack);
    console.error('❌ Login error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An error occurred during login. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update profile endpoint
router.put('/update-profile', authMiddleware(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, email, contactNumber, birthdate, address, gender } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Full name and email are required.' 
      });
    }

    const pool = await initPool();
    
    // Ensure optional columns exist (add them if they don't)
    const columnsToAdd = [
      { name: 'contact_number', definition: 'VARCHAR(32) NULL' },
      { name: 'birthdate', definition: 'DATE NULL' },
      { name: 'address', definition: 'TEXT NULL' },
      { name: 'gender', definition: 'VARCHAR(32) NULL' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`);
        console.log(`✅ Added column to users table: ${column.name}`);
      } catch (e) {
        if (e.message.includes('Duplicate column name')) {
          // Column already exists, that's fine
        } else {
          console.warn(`⚠️ Could not add ${column.name} column:`, e.message);
        }
      }
    }
    
    // Check which columns exist in the database
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('contact_number', 'birthdate', 'address', 'gender')
    `);
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Build update query dynamically
    const updates = [];
    const params = [];

    if (fullName) {
      updates.push('full_name = ?');
      params.push(fullName);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (contactNumber !== undefined && existingColumns.includes('contact_number')) {
      updates.push('contact_number = ?');
      params.push(contactNumber || null);
    }
    if (birthdate !== undefined && existingColumns.includes('birthdate')) {
      updates.push('birthdate = ?');
      params.push(birthdate || null);
    }
    if (address !== undefined && existingColumns.includes('address')) {
      updates.push('address = ?');
      params.push(address || null);
    }
    if (gender !== undefined && existingColumns.includes('gender')) {
      updates.push('gender = ?');
      params.push(gender || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        error: 'No updates provided',
        message: 'Please provide at least one field to update.' 
      });
    }

    params.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    await pool.query(query, params);

    // Fetch updated user data
    let selectQuery = `
      SELECT 
        u.id, 
        u.role, 
        u.id_number AS idNumber, 
        u.full_name AS fullName, 
        u.email, 
        u.department_id AS departmentId,
        d.name as department,
        d.code as departmentCode,
        u.course,
        u.year_level AS yearLevel,
        u.position
    `;
    
    // Add optional columns if they exist
    if (existingColumns.includes('contact_number')) {
      selectQuery += ', u.contact_number AS contactNumber';
    }
    if (existingColumns.includes('birthdate')) {
      selectQuery += ', u.birthdate';
    }
    if (existingColumns.includes('address')) {
      selectQuery += ', u.address';
    }
    if (existingColumns.includes('gender')) {
      selectQuery += ', u.gender';
    }
    
    selectQuery += `
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `;
    
    const [updatedUsers] = await pool.query(selectQuery, [userId]);

    if (updatedUsers.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User not found after update.' 
      });
    }

    const updatedUser = updatedUsers[0];

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      error: 'Update failed',
      message: error.message || 'An error occurred while updating your profile.' 
    });
  }
});

module.exports = router;