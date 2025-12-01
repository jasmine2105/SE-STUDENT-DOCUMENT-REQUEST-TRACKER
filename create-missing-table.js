/**
 * Quick script to create the missing department_documents table
 * Run: node create-missing-table.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function createMissingTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'recoletos_tracker',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'create-department-documents.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Creating department_documents table...');
    
    // Execute the SQL
    const [results] = await connection.query(sql);
    
    console.log('✅ department_documents table created successfully!');
    
    // Verify
    const [tables] = await connection.query("SHOW TABLES LIKE 'department_documents'");
    if (tables.length > 0) {
      console.log('✅ Table verified: department_documents exists');
    }
    
    const [count] = await connection.query('SELECT COUNT(*) as count FROM department_documents');
    console.log(`📊 Document types in table: ${count[0].count}`);

  } catch (error) {
    console.error('❌ Failed to create table:');
    console.error(error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Check your .env file for correct DB credentials');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist. Run: npm run setup-db');
    } else {
      console.error('\n💡 Full error:', error);
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

createMissingTable();






