import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ EN POSTGRES: No existe pool.getConnection(). Se usa pool.query directamente.
    // ✅ EN POSTGRES: No se usa '?', se usa '$1'.
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    // ✅ EN POSTGRES: Los datos vienen en .rows
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      user: { id: user.id, name: user.nombre, email: user.email },
      token
    });

  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ success: false, message: 'Error interno en el servidor' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insert con sintaxis Postgres ($1, $2, $3)
    await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
      [nombre, email, hashedPassword]
    );

    res.status(201).json({ success: true, message: 'Usuario registrado' });
  } catch (error) {
    if (error.code === '23505') { // Error de duplicado en Postgres
      return res.status(400).json({ success: false, message: 'El email ya existe' });
    }
    res.status(500).json({ success: false, message: 'Error al registrar' });
  }
});

export default router;