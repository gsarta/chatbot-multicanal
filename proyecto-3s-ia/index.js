const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const dns = require('dns').promises; // Librería para validar existencia real de emails
const msgs = require('./messages'); 
const prisma = require('./lib/prisma'); 
const Groq = require("groq-sdk");
const axios = require('axios'); 

const groq = new Groq({ apiKey: "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" });
const NOTIFICAR_A = '573508869697@s.whatsapp.net'; 
const usuariosEnRegistro = {}; 
const estadoUsuario = {}; 
const timers = {}; // Para el manejo de inactividad

// --- LISTA DE PAÍSES PARA VALIDACIÓN ---
const listaPaises = [
    "argentina", "bolivia", "brasil", "chile", "colombia", "costa rica", "cuba", "ecuador", "el salvador", 
    "españa", "guatemala", "honduras", "mexico", "méxico", "nicaragua", "panama", "panamá", "paraguay", 
    "peru", "perú", "puerto rico", "republica dominicana", "uruguay", "venezuela", "estados unidos", "usa"
];

// --- GESTIÓN DE TIEMPO DE ESPERA ---
function resetTimer(sock, remoteJid) {
    if (timers[remoteJid]) clearTimeout(timers[remoteJid]);
    timers[remoteJid] = setTimeout(async () => {
        await sock.sendMessage(remoteJid, { text: msgs.timeoutCierre });
        delete estadoUsuario[remoteJid];
        delete usuariosEnRegistro[remoteJid];
    }, 600000); // 10 minutos
}

// --- PERSISTENCIA ---
async function guardarLeadEnPostgres(registro) {
    try {
        const usuario = await prisma.user.upsert({
            where: { whatsapp_id: registro.telefono }, 
            update: { nombre: registro.nombre, email: registro.email, pais: registro.pais },
            create: { whatsapp_id: registro.telefono, nombre: registro.nombre, email: registro.email, pais: registro.pais }
        });
        await prisma.interaction.create({
            data: { user_id: usuario.id, mensaje_usuario: "Registro Finalizado", respuesta_bot: "Confirmado", intencion: registro.interes }
        });
        console.log(`✅ Lead guardado: ${registro.nombre}`);
    } catch (e) { console.error("❌ Error DB:", e); }
}

// --- WHATSAPP ---
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) });

    sock.ev.on('connection.update', (u) => {
        if (u.qr) qrcode.generate(u.qr, { small: true });
        if (u.connection === 'open') console.log('✅ Bot Online - Validaciones y Reconocimiento Activos');
        if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) connectToWhatsApp();
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const remoteJid = msg.key.remoteJid;
            const texto = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
            const textoLow = texto.toLowerCase();

            resetTimer(sock, remoteJid); // Reiniciar timer con cada mensaje

            // --- MIDDLEWARE DE RECONOCIMIENTO (CORREGIDO) ---
            // Solo se activa si el usuario NO está en medio de un registro y NO tiene un estado activo (es el primer mensaje)
            if (!usuariosEnRegistro[remoteJid] && (!estadoUsuario[remoteJid] || ['hola', 'menu', 'inicio'].includes(textoLow))) {
                try {
                    const idWhatsApp = remoteJid.split('@')[0];
                    const usuarioExistente = await prisma.user.findUnique({
                        where: { whatsapp_id: idWhatsApp }
                    });

                    if (usuarioExistente) {
                        estadoUsuario[remoteJid] = 'MAIN';
                        const saludoRec = `¡Hola de nuevo, *${usuarioExistente.nombre}*! 👋\n\n¿En qué puedo apoyarte hoy?`;
                        // Usamos return para que no procese el resto de la lógica de "nuevo usuario" en este mensaje
                        return sock.sendMessage(remoteJid, { text: saludoRec + "\n\n" + msgs.menuPrincipal });
                    }
                } catch (e) { console.error("❌ Error en Middleware:", e); }
            }

            // --- 1. LÓGICA DE REGISTRO CON VALIDACIONES ---
            if (usuariosEnRegistro[remoteJid]) {
                const reg = usuariosEnRegistro[remoteJid];
                const input = texto.trim();

                if (['cancelar', 'salir', 'reiniciar'].includes(textoLow)) {
                    delete usuariosEnRegistro[remoteJid];
                    return sock.sendMessage(remoteJid, { text: "❌ *Proceso cancelado.* He borrado tus datos temporales. Escribe *Menu* cuando gustes volver." });
                }

                if (reg.paso === 'describir_falla') {
                    if (input === '0') {
                        delete usuariosEnRegistro[remoteJid];
                        estadoUsuario[remoteJid] = 'SOPORTE_CATEGORIA';
                        return sock.sendMessage(remoteJid, { text: msgs.detalleSoporte });
                    }

                    try {
                        const nombreParaBuscar = reg.interes.replace('Soporte: ', '').trim();
                        
                        const usuarioCheck = await prisma.user.findUnique({
                            where: { whatsapp_id: reg.telefono }
                        });

                        if (!usuarioCheck) throw new Error(`Usuario no encontrado`);

                        const userActualizado = await prisma.user.update({
                            where: { whatsapp_id: reg.telefono },
                            data: { ticketCount: { increment: 1 } }
                        });

                        const primerNombre = reg.nombre.split(' ')[0].toUpperCase();
                        const ticketId = `TK-${primerNombre}-${userActualizado.ticketCount}`; 

                        const nuevoTicket = await prisma.ticket.create({
                            data: {
                                user_id: userActualizado.id,
                                descripcion: input,
                                estado: "abierto",
                                producto: nombreParaBuscar 
                            }
                        });

                        console.log("✅ TICKET CREADO:", nuevoTicket.id);

                        const reporteTecnico = `🛠️ *TICKET: #${ticketId}*\n👤 *User:* ${reg.nombre}\n📌 *Origen:* ${reg.interes}\n📝 *Falla:* ${input}`;
                        await sock.sendMessage(NOTIFICAR_A, { text: reporteTecnico });
                        await sock.sendMessage(remoteJid, { text: msgs.confirmacionTicketApp(ticketId, nombreParaBuscar) });
                        
                        // Agregar Despedida tras Ticket
                        await sock.sendMessage(remoteJid, { text: msgs.despedida });

                        delete usuariosEnRegistro[remoteJid];
                        estadoUsuario[remoteJid] = 'MAIN';

                    } catch (error) {
                        console.error("--- 🚨 ERROR DE BASE DE DATOS 🚨 ---");
                        await sock.sendMessage(remoteJid, { text: "⚠️ Error al guardar el ticket. Intenta de nuevo." });
                    }
                    return;
                }

                if (reg.paso === 'nombre') {
                    const nombreValido = /^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$/.test(input);
                    if (!nombreValido || input.length < 7) {
                        return sock.sendMessage(remoteJid, { text: "⚠️ *Nombre no válido.* Por favor, ingresa tu nombre completo (mínimo 7 letras, sin números)." });
                    }
                    reg.nombre = input;
                    reg.paso = 'pais';
                    return sock.sendMessage(remoteJid, { text: `✅ Gusto en conocerte, *${reg.nombre}*.\n\n🌍 ¿En qué *país* se encuentra tu operación o proyecto?` });
                }

                if (reg.paso === 'pais') {
                    const paisNormalizado = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const esPaisValido = listaPaises.some(p => p.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === paisNormalizado);

                    if (!esPaisValido) {
                        return sock.sendMessage(remoteJid, { text: "⚠️ *País no reconocido.* Por favor, escribe el nombre completo de tu país (ej: Colombia, México, España)." });
                    }
                    reg.pais = input;
                    reg.paso = 'email';
                    return sock.sendMessage(remoteJid, { text: "📧 ¡Perfecto! Para enviarte el reporte detallado, ¿cuál es tu *correo electrónico*?" });
                }

                if (reg.paso === 'email') {
                    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    if (!emailRegex.test(input.toLowerCase())) {
                        return sock.sendMessage(remoteJid, { text: "⚠️ *Formato de correo inválido.* Ejemplo: nombre@gmail.com. Por favor, verifícalo." });
                    }

                    const dominio = input.toLowerCase().split('@')[1];
                    try {
                        const mx = await dns.resolveMx(dominio);
                        if (!mx || mx.length === 0) throw new Error();
                        
                        reg.email = input.toLowerCase();
                        reg.telefono = remoteJid.split('@')[0];

                        if (reg.interes.includes("Soporte")) {
                            await guardarLeadEnPostgres(reg);
                            delete usuariosEnRegistro[remoteJid];
                            estadoUsuario[remoteJid] = 'SOPORTE_CATEGORIA';
                            return sock.sendMessage(remoteJid, { text: msgs.detalleSoporte });
                        }

                        reg.paso = 'confirmacion';
                        const resumen = `✨ *RESUMEN DE TU SOLICITUD* ✨\n\n👤 *Nombre:* ${reg.nombre}\n🌍 *País:* ${reg.pais}\n📧 *Email:* ${reg.email}\n📌 *Interés:* ${reg.interes}\n\n¿La información es correcta?\n1. ✅ *Sí*\n2. ❌ *No*`;
                        return sock.sendMessage(remoteJid, { text: resumen });
                    } catch {
                        return sock.sendMessage(remoteJid, { text: `❌ El dominio *@${dominio}* no es válido. Intenta con otro correo.` });
                    }
                }

                if (reg.paso === 'confirmacion') {
                    if (texto === '1') {
                        try {
                            await guardarLeadEnPostgres(reg);
                            await sock.sendMessage(NOTIFICAR_A, { text: `🚀 *NUEVO LEAD:* ${reg.nombre}\n📌 ${reg.interes}\n📱 ${reg.telefono}\n📧 ${reg.email}` });
                            await sock.sendMessage(remoteJid, { text: "🎉 *¡Solicitud Procesada!* Tus datos han sido guardados." });
                            await sock.sendMessage(remoteJid, { text: msgs.despedida }); // Despedida tras registro
                            delete usuariosEnRegistro[remoteJid];
                            return;
                        } catch (e) {
                            return sock.sendMessage(remoteJid, { text: "❌ *Error de conexión.* Reintenta en un momento." });
                        }
                    }
                    reg.paso = 'nombre';
                    return sock.sendMessage(remoteJid, { text: "🔄 Vamos a corregirlo. ¿Cuál es tu *nombre completo*?" });
                }
                return;
            }

            // --- 2. NAVEGACIÓN DE MENÚS ---
            if (['hola', 'menu', 'inicio'].includes(textoLow)) {
                estadoUsuario[remoteJid] = 'MAIN';
                return sock.sendMessage(remoteJid, { text: msgs.menuPrincipal });
            }

            const est = estadoUsuario[remoteJid] || 'MAIN';

            if (est === 'MAIN') {
                const opcionesMain = ['1', '2', '3', '4', '5'];
                if (!opcionesMain.includes(texto) && /^\d+$/.test(texto)) {
                    return sock.sendMessage(remoteJid, { text: "⚠️ *Opción no válida.* Por favor, selecciona un número del 1 al 5." });
                }

                if (texto === '1') { estadoUsuario[remoteJid] = 'DESARROLLO'; return sock.sendMessage(remoteJid, { text: msgs.detalleDesarrolloMedida }); }
                if (texto === '2') { estadoUsuario[remoteJid] = 'PORTAFOLIO'; return sock.sendMessage(remoteJid, { text: msgs.detallePortafolio }); }
                
                if (texto === '3') {
                    const userDB = await prisma.user.findUnique({ where: { whatsapp_id: remoteJid.split('@')[0] } });
                    if (userDB) {
                        estadoUsuario[remoteJid] = 'SOPORTE_CATEGORIA';
                        return sock.sendMessage(remoteJid, { text: msgs.detalleSoporte });
                    } else {
                        usuariosEnRegistro[remoteJid] = { paso: 'nombre', interes: 'Soporte Técnico' };
                        return sock.sendMessage(remoteJid, { text: "🛠️ *Soporte Técnico*\n\nPara brindarte asistencia técnica, primero necesitamos registrar tus datos básicos. ¿Cuál es tu *nombre completo*?" });
                    }
                }
                if (texto === '4') return sock.sendMessage(remoteJid, { text: msgs.iaPreguntasAbiertas });
                if (texto === '5') {
                    await sock.sendMessage(remoteJid, { text: msgs.contactanos });
                    return sock.sendMessage(remoteJid, { text: msgs.despedida }); // Despedida tras contacto
                }
            }

            if (est === 'SOPORTE_CATEGORIA') {
                const opcionesSoporte = { '1': 'PRODUCTOS_3S', '2': 'Proyecto Externo', '3': 'Consultoría Técnica' };
                if (texto === '4') { estadoUsuario[remoteJid] = 'MAIN'; return sock.sendMessage(remoteJid, { text: msgs.menuPrincipal }); }
                
                if (opcionesSoporte[texto]) {
                    if (texto === '1') {
                        estadoUsuario[remoteJid] = 'SOPORTE_PRODUCTOS_3S';
                        return sock.sendMessage(remoteJid, { text: msgs.seleccionProductoSoporte });
                    }
                    const userDB = await prisma.user.findUnique({ where: { whatsapp_id: remoteJid.split('@')[0] } });
                    usuariosEnRegistro[remoteJid] = { 
                        paso: 'describir_falla', 
                        nombre: userDB.nombre, 
                        email: userDB.email, 
                        telefono: userDB.whatsapp_id, 
                        interes: `Soporte: ${opcionesSoporte[texto]}` 
                    };
                    const mensajeRespuesta = (texto === '2') ? msgs.registroSoporteExterno : msgs.registroSoporteConsultoria;
                    return sock.sendMessage(remoteJid, { text: mensajeRespuesta });
                }
                return sock.sendMessage(remoteJid, { text: "⚠️ Selecciona una opción del 1 al 4." });
            }

            if (est === 'SOPORTE_PRODUCTOS_3S') {
                const productos = { '1': 'SIE Analytics', '2': 'NotarIA', '3': 'Mindly', '4': 'Abby', '5': 'Contractual' };
                if (texto === '6') { estadoUsuario[remoteJid] = 'SOPORTE_CATEGORIA'; return sock.sendMessage(remoteJid, { text: msgs.detalleSoporte }); }
                if (productos[texto]) {
                    const userDB = await prisma.user.findUnique({ where: { whatsapp_id: remoteJid.split('@')[0] } });
                    usuariosEnRegistro[remoteJid] = { paso: 'describir_falla', nombre: userDB.nombre, email: userDB.email, telefono: userDB.whatsapp_id, interes: `Soporte: ${productos[texto]}` };
                    return sock.sendMessage(remoteJid, { text: msgs.registroSoporteApp }); 
                }
                return sock.sendMessage(remoteJid, { text: "⚠️ Selecciona un producto del 1 al 5, o 6 para volver." });
            }

            if (est === 'DESARROLLO') {
                const opcionesDesarrollo = ['1', '2', '3', '4', '5', '6', '7'];
                if (!opcionesDesarrollo.includes(texto) && /^\d+$/.test(texto)) {
                    return sock.sendMessage(remoteJid, { text: "⚠️ *Opción no válida.* Selecciona un número del 1 al 5, 6 para reporte o 7 para volver." });
                }
                if (texto === '1') { estadoUsuario[remoteJid] = 'INFO_CHATBOT'; return sock.sendMessage(remoteJid, { text: msgs.infoDesarrolloChatbot }); }
                if (texto === '2') { estadoUsuario[remoteJid] = 'INFO_APPS'; return sock.sendMessage(remoteJid, { text: msgs.infoDesarrolloApps }); }
                if (texto === '3') { estadoUsuario[remoteJid] = 'INFO_WEB'; return sock.sendMessage(remoteJid, { text: msgs.infoDesarrolloWeb }); }
                if (texto === '4') { estadoUsuario[remoteJid] = 'INFO_AUTO'; return sock.sendMessage(remoteJid, { text: msgs.infoDesarrolloAuto }); }
                if (texto === '5') {
                    usuariosEnRegistro[remoteJid] = { paso: 'nombre', interes: 'No estoy seguro (Otros)' };
                    return sock.sendMessage(remoteJid, { text: msgs.infoNoEstoySeguro });
                }
                if (texto === '6') { 
                    usuariosEnRegistro[remoteJid] = { paso: 'nombre', interes: 'Reporte Viabilidad (Desarrollo)' };
                    return sock.sendMessage(remoteJid, { text: msgs.infoNoEstoySeguro });
                }
                if (texto === '7') { estadoUsuario[remoteJid] = 'MAIN'; return sock.sendMessage(remoteJid, { text: msgs.menuPrincipal }); }
            }

            if (est === 'PORTAFOLIO') {
                const opcionesPortafolio = ['1', '2', '3', '4', '5', '6'];
                if (!opcionesPortafolio.includes(texto) && /^\d+$/.test(texto)) {
                    return sock.sendMessage(remoteJid, { text: "⚠️ *Opción no válida.* Selecciona una solución del 1 al 5, o 6 para volver al inicio." });
                }
                if (texto === '1') { estadoUsuario[remoteJid] = 'INFO_SIE'; return sock.sendMessage(remoteJid, { text: msgs.infoSie }); }
                if (texto === '2') { estadoUsuario[remoteJid] = 'INFO_NOTARIA'; return sock.sendMessage(remoteJid, { text: msgs.infoNotaria }); }
                if (texto === '3') { estadoUsuario[remoteJid] = 'INFO_MINDLY'; return sock.sendMessage(remoteJid, { text: msgs.infoMindly }); }
                if (texto === '4') { estadoUsuario[remoteJid] = 'INFO_ABBY'; return sock.sendMessage(remoteJid, { text: msgs.infoAbby }); }
                if (texto === '5') { estadoUsuario[remoteJid] = 'INFO_CONTRACTUAL'; return sock.sendMessage(remoteJid, { text: msgs.infoContractual }); }
                if (texto === '6') { estadoUsuario[remoteJid] = 'MAIN'; return sock.sendMessage(remoteJid, { text: msgs.menuPrincipal }); }
            }

            if (est.startsWith('INFO_')) {
                if (texto === '1') {
                    usuariosEnRegistro[remoteJid] = { paso: 'nombre', interes: `Interés en ${est.replace('INFO_', '')}` };
                    return sock.sendMessage(remoteJid, { text: msgs.infoNoEstoySeguro });
                }
                if (texto === '2') {
                    estadoUsuario[remoteJid] = est.includes('DESARROLLO') || est.includes('CHATBOT') || est.includes('APPS') || est.includes('WEB') || est.includes('AUTO') ? 'DESARROLLO' : 'PORTAFOLIO';
                    const volverMsg = (estadoUsuario[remoteJid] === 'DESARROLLO') ? msgs.detalleDesarrolloMedida : msgs.detallePortafolio;
                    return sock.sendMessage(remoteJid, { text: volverMsg });
                }
                if (/^\d+$/.test(texto)) {
                    return sock.sendMessage(remoteJid, { text: "⚠️ Selecciona *1* para reporte o *2* para volver." });
                }
            }

            // --- IA PARA PREGUNTAS ABIERTAS ---
            if (!/^\d+$/.test(texto)) {
                await sock.sendPresenceUpdate('composing', remoteJid);
                const chat = await groq.chat.completions.create({
                    messages: [{ role: "system", content: "Eres el experto de 3S IA. Responde breve y profesional." }, { role: "user", content: texto }],
                    model: "llama-3.3-70b-versatile",
                });
                return sock.sendMessage(remoteJid, { text: chat.choices[0].message.content });
            }
        }
    });
}
connectToWhatsApp(); 