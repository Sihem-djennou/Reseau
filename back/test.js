const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAuth() {
  console.log('Testing authentication...');
  console.log('Host:', process.env.DB_HOST);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', process.env.DB_NAME);
  console.log('Port:', process.env.DB_PORT);
  console.log('Password length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
  
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    ssl: {
      rejectUnauthorized: false
    },
    connectTimeout: 30000
  };
  
  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Authentication successful!');
    
    const [rows] = await connection.execute('SELECT USER(), CURRENT_USER(), DATABASE()');
    console.log('Connected as:', rows[0]);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Solutions:');
      console.log('1. Reset password in Aiven Console');
      console.log('2. Make sure you copied the password correctly (no spaces)');
      console.log('3. Check if user "avnadmin" exists');
      console.log('4. Try creating a new database user');
    }
  }
}

testAuth();