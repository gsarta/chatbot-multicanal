// src/controllers/whatsappController.js
// ... (imports anteriores)
import { procesarMensaje } from '../services/aiService.js';

// Dentro de sock.ev.on('messages.upsert'...)
const m = messages[0];
if (!m.message || m.key.fromMe) return;

const texto = m.message.conversation || m.message.extendedTextMessage?.text;
const user = await identificarUsuario(m.key.remoteJid);

// Ejecutamos la lógica del PDF
const respuestaFinal = await procesarMensaje(user, texto);

await sock.sendMessage(m.key.remoteJid, { text: respuestaFinal });