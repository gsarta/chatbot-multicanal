import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import twilio from 'twilio';

const router = express.Router();

// Configuración de Twilio (SE MANTIENE IGUAL)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const enviarNotificacionWhatsApp = async (datos) => {
  try {
    const numerosALosQueLlega = ["whatsapp:+573204838819", "whatsapp:+573142610308"];
    const fechaCita = datos.cita_agendada ? new Date(datos.cita_agendada).toLocaleString() : 'Pendiente';

    const promesas = numerosALosQueLlega.map(numero => {
      return client.messages.create({
        from: 'whatsapp:+14155238886', 
        body: `📅 *CITA AGENDADA AUTOMÁTICA*\n\n👤 *Cliente:* ${datos.nombre_completo}\n🏗️ *Proyecto:* ${datos.proyecto || 'N/A'}\n🗓️ *Fecha:* ${fechaCita}\n📞 *Teléfono:* ${datos.telefono || 'N/A'}`,
        to: numero
      });
    });

    return await Promise.all(promesas);
  } catch (error) {
    console.error("❌ Error enviando WhatsApp:", error.message);
  }
};

// 1. CREAR LOTE (POST) - ORDEN AJUSTADO SEGÚN TU IMAGEN image_7d6897.png
router.post('/', verifyToken, async (req, res) => {
  try {
    const { 
      nombre_completo, origen_cliente, proyecto, manzana, lote, 
      estado_lote, precio_total, enganche_porcentaje, 
      tasa_interes, cuota_mensual, 
      meses, estado_cliente, telefono, correo, cita_agendada 
    } = req.body;

    if (!nombre_completo || !precio_total) {
      return res.status(400).json({ success: false, message: 'Nombre completo y precio son requeridos' });
    }

    const query = `
      INSERT INTO lotes (
        user_id,             -- $1
        nombre_completo,     -- $2
        origen_cliente,      -- $3
        proyecto,            -- $4
        manzana,             -- $5
        lote,                -- $6
        estado_lote,         -- $7
        precio_total,        -- $8
        enganche_porcentaje, -- $9
        tasa_interes,        -- $10
        cuota_mensual,       -- $11
        meses,               -- $12
        estado_cliente,      -- $13
        telefono,            -- $14
        correo,              -- $15
        cita_agendada        -- $16
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
      RETURNING id`;

    const values = [
      req.user.id,                    // $1
      nombre_completo,                // $2
      origen_cliente || 'Directo',    // $3
      proyecto,                       // $4
      manzana,                        // $5
      lote,                           // $6
      estado_lote,                    // $7
      Number(precio_total),           // $8
      Number(enganche_porcentaje),    // $9
      Number(tasa_interes),           // $10
      Number(cuota_mensual),          // $11
      Number(meses) || 36,            // $12
      estado_cliente || 'llamar',     // $13
      telefono || null,               // $14 (Se agregó || null para evitar strings vacíos)
      correo || null,                 // $15 (Se agregó || null para evitar strings vacíos)
      cita_agendada || null           // $16 (Se agregó || null para evitar strings vacíos)
    ];

    const result = await pool.query(query, values);

    if (cita_agendada) {
      enviarNotificacionWhatsApp(req.body);
    }

    res.status(201).json({
      success: true,
      message: 'Lote guardado exitosamente',
      lote_id: result.rows[0].id 
    });

  } catch (error) {
    console.error('❌ Error al guardar:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. OBTENER TODOS LOS LOTES (MANTENIDO IGUAL)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lotes WHERE user_id = $1 ORDER BY id DESC',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener lotes' });
  }
});

// 3. OBTENER UN LOTE POR ID (MANTENIDO IGUAL)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lotes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lote no encontrado' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener el lote' });
  }
});

// 4. ACTUALIZAR LOTE (PUT) - ORDEN AJUSTADO
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { 
      nombre_completo, origen_cliente, proyecto, manzana, lote, 
      estado_lote, precio_total, enganche_porcentaje, 
      tasa_interes, cuota_mensual, 
      meses, estado_cliente, telefono, correo, cita_agendada 
    } = req.body;

    const query = `
      UPDATE lotes SET 
        nombre_completo = $1, origen_cliente = $2, proyecto = $3, 
        manzana = $4, lote = $5, estado_lote = $6, precio_total = $7, 
        enganche_porcentaje = $8, tasa_interes = $9, cuota_mensual = $10,
        meses = $11, estado_cliente = $12, telefono = $13, 
        correo = $14, cita_agendada = $15
      WHERE id = $16 AND user_id = $17`; 

    const values = [
      nombre_completo, 
      origen_cliente, 
      proyecto, 
      manzana, 
      lote, 
      estado_lote, 
      Number(precio_total), 
      Number(enganche_porcentaje), 
      Number(tasa_interes), 
      Number(cuota_mensual), 
      Number(meses), 
      estado_cliente, 
      telefono || null, 
      correo || null, 
      cita_agendada || null, 
      req.params.id, 
      req.user.id
    ];

    await pool.query(query, values);

    if (cita_agendada) {
      enviarNotificacionWhatsApp(req.body);
    }

    res.json({ success: true, message: 'Lote actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
});

// 5. ELIMINAR LOTE (MANTENIDO IGUAL)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM lotes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Lote eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar' });
  }
});

export default router;