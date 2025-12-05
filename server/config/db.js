const mysql = require('mysql2/promise');

let pool;

async function initPool() {
  if (pool) return pool;

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recoletos_tracker',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 20), // Increased to 20
    queueLimit: 0,
    connectTimeout: 10000 // 10 second connection timeout
    // Note: acquireTimeout and timeout are not valid for mysql2 pools
  };

  console.log('🔌 Initializing database pool with config:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    password: config.password ? '***SET***' : 'NOT SET'
  });

  pool = mysql.createPool(config);

  // Test the pool immediately
  try {
    const testConn = await pool.getConnection();
    await testConn.query('SELECT 1');
    testConn.release();
    console.log('✅ Database pool initialized and tested successfully');
  } catch (error) {
    console.error('❌ Database pool test failed:', error.message);
    console.error('❌ Error code:', error.code);
    throw error;
  }

  return pool;
}

async function getConnection() {
  const startTime = Date.now();
  try {
    console.log('🔌 getConnection() called at', new Date().toISOString());
    const db = await initPool();
    console.log('🔌 Pool ready, requesting connection... (took', Date.now() - startTime, 'ms)');
    
    // Add a timeout wrapper to prevent infinite hanging
    const connectionPromise = db.getConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('getConnection() timed out after 5 seconds - pool may be exhausted'));
      }, 5000);
    });
    
    const conn = await Promise.race([connectionPromise, timeoutPromise]);
    console.log('✅ Connection obtained from pool (took', Date.now() - startTime, 'ms total)');
    return conn;
  } catch (error) {
    console.error('❌ Database connection error after', Date.now() - startTime, 'ms:', error.message);
    console.error('❌ Error code:', error.code);
    if (error.stack) {
      console.error('❌ Error stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    throw error;
  }
}

module.exports = {
  initPool,
  getConnection,
};

