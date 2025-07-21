// db.js
const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables

// Configure the PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10), // Ensure port is a number
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false // SSL configuration
});

// Test the database connection when the pool is created
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to PostgreSQL database:', err.stack);
  }
  console.log('Successfully connected to PostgreSQL database!');
  client.query('SELECT NOW()', (err, result) => {
    release(); // Release the client back to the pool
    if (err) {
      return console.error('Error executing initial query:', err.stack);
    }
    console.log('PostgreSQL current time:', result.rows[0].now);
  });
});

module.exports = pool; // Export the pool for use in other parts of the application
