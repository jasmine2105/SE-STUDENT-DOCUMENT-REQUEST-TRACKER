/**
 * Database Setup Script
 * Run this script to create the database and tables
 * Usage: node setup-database.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let connection;
  
  try {
    // Connect to MySQL (without specifying database first)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL');

    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    console.log('📝 Creating database and tables...');
    await connection.query(schema);
    
    console.log('✅ Database setup completed successfully!');
    console.log('📊 Database: recoletos_tracker');
    console.log('📋 Tables created:');
    console.log('   - departments');
    console.log('   - department_documents');
    console.log('   - users');
    console.log('   - faculty');
    console.log('   - requests');
    console.log('   - notifications');

  } catch (error) {
    console.error('❌ Database setup failed:');
    console.error(error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Tip: Check your .env file for correct DB_USER and DB_PASSWORD');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure MySQL server is running');
    } else if (error.code === 'ER_DB_CREATE_EXISTS') {
      console.log('⚠️  Database already exists, continuing...');
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

// Run setup
setupDatabase();






