require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'recoletos_tracker',
            multipleStatements: true
        });

        console.log('🔌 Connected to database...');

        // 1. Create request_conversations table
        console.log('📝 Creating request_conversations table...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS request_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

        // 2. Add columns to requests table
        console.log('📝 Adding new columns to requests table...');

        // Helper to check if column exists
        const addColumnIfNotExists = async (table, column, definition) => {
            try {
                const [rows] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
                if (rows.length === 0) {
                    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                    console.log(`   ✅ Added ${column} to ${table}`);
                } else {
                    console.log(`   ℹ️  ${column} already exists in ${table}`);
                }
            } catch (err) {
                console.error(`   ❌ Failed to add ${column}:`, err.message);
            }
        };

        await addColumnIfNotExists('requests', 'deadline', 'DATE');
        await addColumnIfNotExists('requests', 'is_resubmission', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNotExists('requests', 'has_deficiency', 'BOOLEAN DEFAULT FALSE');

        console.log('✅ Database schema update completed!');

    } catch (error) {
        console.error('❌ Update failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
