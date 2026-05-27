import { databaseService } from '../services/prisma.service';
import { whatsappService } from '../services/whatsapp.service';
import { validationService } from '../services/validation.service';

const NOTIFICAR_A = `${process.env.ADMIN_PHONE_NUMBER}@s.whatsapp.net`;

export const registrationAgent = {
    sessions: {} as Record<string, any>,

    async handle(jid: string, text: string) {
        const input = text.trim();
        
        // 1. Iniciar sesión de registro si no existe
        if (!this.sessions[jid]) {
            this.sessions[jid] = { paso: 'nombre' };
            return "¡Hola! Para procesar tu solicitud, ¿cuál es tu *nombre completo*?";
        }

        const session = this.sessions[jid];

        switch (session.paso) {
            case 'nombre':
                if (!validationService.isValidName(input)) {
                    return "⚠️ El nombre debe ser completo (mínimo 7 letras y sin números). Inténtalo de nuevo:";
                }
                session.nombre = input;
                session.paso = 'pais';
                return `Gusto en conocerte, *${session.nombre}*. 🌎 ¿En qué **país** se encuentra tu proyecto?`;

            case 'pais':
                if (!validationService.isValidCountry(input)) {
                    return "⚠️ Por ahora solo operamos en: Argentina, Bolivia, Brasil, Chile, Colombia, Costa Rica, Ecuador, España, México, Panamá, Perú y USA. ¿En cuál estás?";
                }
                session.pais = input;
                session.paso = 'email';
                return "Perfecto. Por último, ¿cuál es tu **correo electrónico** institucional o personal?";

            case 'email':
                const emailValido = await validationService.isValidEmail(input);
                if (!emailValido) {
                    return "⚠️ El correo no parece válido o el dominio no existe. Por favor, verifica e ingrésalo de nuevo:";
                }
                session.email = input;

                // --- GUARDAR EN BASE DE DATOS ---
                const idWhatsApp = jid.split('@')[0];
                const user = await databaseService.saveUser({
                    whatsapp_id: idWhatsApp,
                    nombre: session.nombre,
                    pais: session.pais,
                    email: session.email
                });

                // --- CREACIÓN AUTOMÁTICA DEL TICKET DE VIABILIDAD ---
                // Si session.interes no existe, usamos un valor por defecto
                const servicioInteres = session.interes || "Desarrollo a Medida";
                
                // Creamos el ticket usando el ID del usuario recién guardado
                await databaseService.crearTicket(
                    user.id, 
                    "Solicitud automática de Reporte de Viabilidad", 
                    servicioInteres // Esto se guarda en la columna 'producto' de tu tabla Ticket
                );

                // --- NOTIFICAR AL ADMIN ---
                const reporte = `🆕 *NUEVO LEAD Y SOLICITUD*\n👤 *Nombre:* ${session.nombre}\n🚀 *Interés:* ${servicioInteres}\n🌎 *País:* ${session.pais}\n📧 *Email:* ${session.email}\n📱 *WA:* ${idWhatsApp}`;
                await whatsappService.sendMessage(NOTIFICAR_A, reporte);

                delete this.sessions[jid]; // Finalizar registro
                return `✅ ¡Registro completado, *${session.nombre}*!\n\nHemos generado tu solicitud de **Reporte de Viabilidad** para **${servicioInteres}**. Un asesor te contactará pronto.`;

            default:
                delete this.sessions[jid];
                return "Hubo un error en el registro. Escribe *Hola* para empezar de nuevo.";
        }
    }
};