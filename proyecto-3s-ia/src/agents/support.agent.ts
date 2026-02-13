import { databaseService } from '../services/prisma.service';
import { whatsappService } from '../services/whatsapp.service';

// Definimos el número de notificación directamente para eliminar el error de importación
const NOTIFICAR_A = '573508869697@s.whatsapp.net';

export const supportAgent = {
    sessions: {} as Record<string, any>,

    async handle(jid: string, text: string) {
        const input = text.trim();
        
        // 1. Si no hay sesión, iniciamos pidiendo la categoría
        if (!this.sessions[jid]) {
            this.sessions[jid] = { paso: 'categoria' };
            return "🛠️ *Soporte Técnico*\n\nSeleccione el tipo de falla:\n1. PRODUCTOS 3S\n2. Proyecto Externo\n3. Consultoría\n4. Volver al Menú";
        }

        const session = this.sessions[jid];

        // 2. Manejo de pasos de Soporte
        switch (session.paso) {
            case 'categoria':
                if (input === '4') {
                    delete this.sessions[jid];
                    return "Volviendo al menú principal...";
                }
                const categorias = { '1': 'PRODUCTOS_3S', '2': 'Externo', '3': 'Consultoría' };
                session.tipo = categorias[input as keyof typeof categorias];
                
                if (!session.tipo) return "⚠️ Seleccione una opción válida (1-4).";
                
                session.paso = 'descripcion';
                return "📝 Por favor, describe brevemente la falla o el requerimiento:";

            case 'descripcion':
                session.falla = input;
                
                // Buscamos al usuario en la DB para obtener su ID y Nombre
                const user = await databaseService.findUserByWhatsAppId(jid.split('@')[0]);
                
                if (!user) {
                    delete this.sessions[jid];
                    return "❌ Error: Debes estar registrado para reportar una falla. Escribe *Hola* para registrarte.";
                }

                // Creamos el Ticket en la base de datos
                const ticket = await databaseService.crearTicket(user.id, session.falla, session.tipo);
                
                // Generamos el ID visual: TK-NOMBRE-ID
                const primerNombre = user.nombre ? user.nombre.split(' ')[0].toUpperCase() : 'USER';
                const ticketId = `TK-${primerNombre}-${ticket.id}`;

                // Notificamos al administrador usando la constante local
                const reporte = `🛠️ *NUEVO TICKET: #${ticketId}*\n👤 *Usuario:* ${user.nombre}\n📌 *Tipo:* ${session.tipo}\n📝 *Falla:* ${session.falla}`;
                await whatsappService.sendMessage(NOTIFICAR_A, reporte);

                delete this.sessions[jid]; // Finalizamos sesión de soporte
                return `✅ *Ticket Creado: #${ticketId}*\n\nHemos notificado al equipo técnico. Te contactaremos pronto.`;

            default:
                delete this.sessions[jid];
                return "Error en flujo de soporte. Escribe *Menu*.";
        }
    }
};