import 'dotenv/config';
import express from 'express'; 
import http from 'http';
import { whatsappService } from './services/whatsapp.service';
import { databaseService } from './services/prisma.service';
import { registrationAgent } from './agents/registration.agent';
import { supportAgent } from './agents/support.agent';
import { aiService } from './services/ai.service';
import { MESSAGES } from './config/messages';
// --- NUEVA IMPORTACIÓN ---
import { VtigerService } from './services/vtiger.service';

// --- CONFIGURACIÓN DE SERVIDOR PARA RENDER (OBLIGATORIO) ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Online 🚀'));
app.listen(PORT, () => console.log(`🌍 Servidor web escuchando en puerto ${PORT}`));

const estadoUsuario: Record<string, string> = {}; 
// --- INSTANCIA DEL SERVICIO ---
const vtiger = new VtigerService();

async function main() {
    console.log("🚀 Motor 3S IA Online...");
    const sock = await whatsappService.connect();

    // --- LÓGICA DE PAIRING CODE PARA RENDER ---
    if (!sock.authState.creds.registered) {
        const numeroBot = '573203910334'; 
        setTimeout(async () => {
            const codigo = await sock.requestPairingCode(numeroBot);
            console.log(`\n\n************************************`);
            console.log(`🚀 TU CÓDIGO DE VINCULACIÓN ES: ${codigo}`);
            console.log(`************************************\n\n`);
        }, 10000);
    }

    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
        if (type !== 'notify' && type !== undefined) return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid!;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        const textoLow = texto.toLowerCase();

        try {
            // --- 1. RECONOCIMIENTO DE USUARIO / INICIO ---
            if (!registrationAgent.sessions[jid] && (!estadoUsuario[jid] || ['hola', 'menu', 'inicio'].includes(textoLow))) {
                const idWhatsApp = jid.split('@')[0];
                const usuarioExistente = await databaseService.findUserByWhatsAppId(idWhatsApp);
                
                estadoUsuario[jid] = 'MAIN';
                if (usuarioExistente) {
                    return await whatsappService.sendMessage(jid, `¡Hola de nuevo, *${usuarioExistente.nombre}*! 👋\n\n${MESSAGES.menuPrincipal}`);
                } else {
                    return await whatsappService.sendMessage(jid, MESSAGES.menuPrincipal);
                }
            }

            // --- 2. FLUJO DE REGISTRO ACTIVO ---
            if (registrationAgent.sessions[jid]) {
                const res = await registrationAgent.handle(jid, texto);
                return await whatsappService.sendMessage(jid, res);
            }

            // --- 3. FLUJO DE SOPORTE ACTIVO ---
            if (supportAgent.sessions[jid] || (estadoUsuario[jid] === 'MAIN' && texto === '3')) {
                estadoUsuario[jid] = 'SOPORTE';
                const res = await supportAgent.handle(jid, texto);
                return await whatsappService.sendMessage(jid, res);
            }

            const est = estadoUsuario[jid] || 'MAIN';

            // --- 4. MENÚ PRINCIPAL ---
            if (est === 'MAIN') {
                if (texto === '1') {
                    estadoUsuario[jid] = 'DESARROLLO';
                    return await whatsappService.sendMessage(jid, MESSAGES.detalleDesarrolloMedida);
                }
                if (texto === '2') {
                    estadoUsuario[jid] = 'PORTAFOLIO';
                    return await whatsappService.sendMessage(jid, MESSAGES.detallePortafolio);
                }
                if (texto === '4') {
                    return await whatsappService.sendMessage(jid, MESSAGES.iaPreguntasAbiertas);
                }
                if (texto === '5') {
                    return await whatsappService.sendMessage(jid, MESSAGES.contactanos);
                }
            }

            // --- 5. MENÚ DESARROLLO A LA MEDIDA ---
            if (est === 'DESARROLLO') {
                const mapeo: Record<string, any> = { 
                    '1': { estado: 'INFO_CHATBOT', msg: MESSAGES.infoDesarrolloChatbot },
                    '2': { estado: 'INFO_APPS', msg: MESSAGES.infoDesarrolloApps },
                    '3': { estado: 'INFO_WEB', msg: MESSAGES.infoDesarrolloWeb },
                    '4': { estado: 'INFO_IA', msg: MESSAGES.infoDesarrolloAuto },
                    '5': { estado: 'REGISTRO_OTROS', msg: MESSAGES.infoNoEstoySeguro }
                };

                if (mapeo[texto]) {
                    estadoUsuario[jid] = mapeo[texto].estado;
                    if (texto === '5') {
                        registrationAgent.sessions[jid] = { paso: 'nombre', interes: 'Otros / No estoy seguro' };
                    }
                    return await whatsappService.sendMessage(jid, mapeo[texto].msg);
                }
                if (texto === '7') {
                    estadoUsuario[jid] = 'MAIN';
                    return await whatsappService.sendMessage(jid, MESSAGES.menuPrincipal);
                }
            }

            // --- 6. MENÚ PORTAFOLIO DE PRODUCTOS ---
            if (est === 'PORTAFOLIO') {
                const productos: Record<string, any> = {
                    '1': { estado: 'INFO_SIE', msg: MESSAGES.infoSie },
                    '2': { estado: 'INFO_NOTARIA', msg: MESSAGES.infoNotaria },
                    '3': { estado: 'INFO_MINDLY', msg: MESSAGES.infoMindly },
                    '4': { estado: 'INFO_ABBY', msg: MESSAGES.infoAbby },
                    '5': { estado: 'INFO_CONTRACTUAL', msg: MESSAGES.infoContractual }
                };

                if (productos[texto]) {
                    estadoUsuario[jid] = productos[texto].estado;
                    return await whatsappService.sendMessage(jid, productos[texto].msg);
                }
                if (texto === '6') {
                    estadoUsuario[jid] = 'MAIN';
                    return await whatsappService.sendMessage(jid, MESSAGES.menuPrincipal);
                }
            }

            // --- 7. LÓGICA DE SOLICITUD DE REPORTE (CON SALTO DE REGISTRO) ---
            if (est.startsWith('INFO_')) {
                if (texto === '1') {
                    const servicios: Record<string, string> = {
                        'INFO_CHATBOT': 'Chatbots Inteligentes',
                        'INFO_APPS': 'Apps Móviles',
                        'INFO_WEB': 'Web & Desktop',
                        'INFO_IA': 'IA & Automatización',
                        'INFO_SIE': 'SIE Analytics',
                        'INFO_NOTARIA': 'NotarIA',
                        'INFO_MINDLY': 'Mindly',
                        'INFO_ABBY': 'Abby',
                        'INFO_CONTRACTUAL': 'Contractual'
                    };

                    const interesActual = servicios[est] || 'Consultoría';
                    const idWhatsApp = jid.split('@')[0];

                    const usuarioExistente = await databaseService.findUserByWhatsAppId(idWhatsApp);

                    if (usuarioExistente) {
                        await databaseService.crearTicket(
                            usuarioExistente.id, 
                            "Solicitud de Reporte (Usuario Existente)", 
                            interesActual
                        );

                        // --- SOLUCIÓN CRM VTIGER ---
                        await vtiger.createLead(usuarioExistente.nombre ?? 'Cliente', 'Usuario WA', idWhatsApp);

                        const reporteAdmin = `🚀 *SOLICITUD DE REPORTE (CLIENTE)*\n👤 *Nombre:* ${usuarioExistente.nombre}\n🎯 *Interés:* ${interesActual}\n📧 *Email:* ${usuarioExistente.email}`;
                        await whatsappService.sendMessage('573508869697@s.whatsapp.net', reporteAdmin);

                        return await whatsappService.sendMessage(jid, `✅ ¡Listo, *${usuarioExistente.nombre}*!\n\nYa hemos generado tu solicitud de **Reporte de Viabilidad** para **${interesActual}**. Un consultor senior revisará tu perfil y te escribirá a este número.`);
                    } else {
                        registrationAgent.sessions[jid] = { paso: 'nombre', interes: interesActual };
                        return await whatsappService.sendMessage(jid, `¡Excelente! Para procesar tu reporte de *${interesActual}*, ¿cuál es tu *nombre completo*?`);
                    }
                }
                
                if (texto === '2') {
                    const esPortafolio = ['INFO_SIE', 'INFO_NOTARIA', 'INFO_MINDLY', 'INFO_ABBY', 'INFO_CONTRACTUAL'].includes(est);
                    estadoUsuario[jid] = esPortafolio ? 'PORTAFOLIO' : 'DESARROLLO';
                    return await whatsappService.sendMessage(jid, esPortafolio ? MESSAGES.detallePortafolio : MESSAGES.detalleDesarrolloMedida);
                }
            }

            // --- 8. IA Y PREGUNTAS ABIERTAS ---
            if (!/^\d+$/.test(texto)) {
                await sock.sendPresenceUpdate('composing', jid);
                await databaseService.saveMessage(jid, texto, 'user');
                
                const respuestaIA = await aiService.getSimpleResponse(texto);
                const textoFinal = respuestaIA || "Lo siento, no pude procesar tu solicitud.";

                await databaseService.saveMessage(jid, textoFinal, 'assistant');
                return await whatsappService.sendMessage(jid, textoFinal);
            }

        } catch (error) {
            console.error("❌ Error:", error);
        }
    });
}

// --- MANTENIMIENTO DE ACTIVIDAD (KEEP-ALIVE) ---
setInterval(() => {
    http.get(`http://localhost:${PORT}/`, (res) => {
        // Genera tráfico interno para que Render no suspenda el proceso
    }).on('error', () => { /* Silenciar error de red interna */ });
}, 60000);

main().catch(err => console.error("🚨 Error Crítico:", err));