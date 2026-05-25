import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.db_host || 'localhost',
  port: parseInt(process.env.db_port || '3306'),
  user: process.env.db_user || 'root',
  password: process.env.db_password || '',
  database: process.env.db_name || 'dibas_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
