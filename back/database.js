const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

console.log('📡 Connecting to Aiven MySQL...');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Database: ${process.env.DB_NAME}`);

// Try to load CA certificate
let sslConfig = { rejectUnauthorized: false };
try {
  if (fs.existsSync('./ca.pem')) {
    sslConfig = {
      ca: fs.readFileSync('./ca.pem'),
      rejectUnauthorized: true
    };
    console.log('✅ Using CA certificate');
  } else {
    console.log('⚠️  CA certificate not found, using SSL without verification');
  }
} catch (err) {
  console.log('⚠️  Error loading CA cert, using SSL without verification');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: sslConfig,
  connectTimeout: 30000
});

const promisePool = pool.promise();

// Initialize database
async function initializeDatabase() {
  try {
    // Simple test query
    const [result] = await promisePool.query('SELECT 1 as test, VERSION() as version, NOW() as time');
    console.log('✅ Connected to Aiven MySQL!');
    console.log(`📦 Version: ${result[0].version}`);
    console.log(`🕐 Server time: ${result[0].time}`);
    
    // Create users table
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar TEXT,
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');
    
    // Create messages table
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Messages table ready');
    
    const [tables] = await promisePool.query('SHOW TABLES');
    console.log('📋 Tables:', tables.map(t => Object.values(t)[0]).join(', '));
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Password is incorrect. Reset it in Aiven Console');
      console.log('2. Make sure you copied the exact password (no spaces)');
      console.log('3. Check if user exists: avnadmin');
      console.log('4. Try creating a new user in Aiven Console');
    }
  }
}

initializeDatabase();

module.exports = promisePool;