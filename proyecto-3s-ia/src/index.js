import 'dotenv/config';
import { iniciarWhatsApp } from './controllers/whatsappController.js';

console.log("🤖 Iniciando Agente...");
iniciarWhatsApp().catch(console.error);