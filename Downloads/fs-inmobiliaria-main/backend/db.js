import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Usamos la DATABASE_URL de tu .env que es la forma correcta para Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Obligatorio para conectar a Supabase desde Render
  }
});

// Verificación de conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ ERROR CONECTANDO A LA BASE DE DATOS:', err.message);
  } else {
    console.log('✅ BASE DE DATOS CONECTADA (PostgreSQL)');
  }
});

export default pool;