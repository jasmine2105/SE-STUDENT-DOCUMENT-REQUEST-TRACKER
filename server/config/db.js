const mysql = require('mysql2/promise');

let pool;

async function initPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recoletos_tracker',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0
  });

  return pool;
}

async function getConnection() {
  const db = await initPool();
  return db.getConnection();
}

module.exports = {
  initPool,
  getConnection,
};

