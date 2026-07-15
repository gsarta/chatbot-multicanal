import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export { prisma }; // Esto permitirá que otros archivos lo usen

export const databaseService = {
    // Buscar usuario para saber su ID interno
    async findUserByWhatsAppId(whatsappId: string) {
        return await prisma.user.findUnique({
            where: { whatsapp_id: whatsappId }
        });
    },

    // Igual que findUserByWhatsAppId, pero degrada a null si la DB no responde.
    // El menú principal es idéntico para usuario conocido o desconocido: la base
    // solo aporta el saludo por nombre, así que un fallo aquí no debe dejar mudo al bot.
    async findUserByWhatsAppIdSafe(whatsappId: string) {
        try {
            return await this.findUserByWhatsAppId(whatsappId);
        } catch (err: any) {
            console.error(`⚠️ DB no disponible buscando "${whatsappId}" — se continúa sin personalizar:`, err?.message || err);
            return null;
        }
    },

    // GUARDAR MENSAJES (Ahora usa el modelo Interaction)
    // Es telemetría: si falla, se registra y se sigue. Nunca debe interrumpir la respuesta.
    async saveMessage(whatsappId: string, texto: string, role: 'user' | 'assistant') {
        try {
            const user = await this.findUserByWhatsAppId(whatsappId.split('@')[0]);
            if (!user) return;

            return await prisma.interaction.create({
                data: {
                    user_id: user.id,
                    mensaje_usuario: role === 'user' ? texto : "Respuesta del sistema",
                    respuesta_bot: role === 'assistant' ? texto : "Consulta del usuario",
                    intencion: "Chat general",
                    resolucion_automatica: true
                }
            });
        } catch (err: any) {
            console.error(`⚠️ No se pudo registrar la interacción de "${whatsappId}":`, err?.message || err);
            return;
        }
    },

    // --- ESTA ES LA FUNCIÓN QUE TE PEDÍA EL ERROR ---
    // Usamos 'userData' para que coincida con lo que envía tu agente
    async saveUser(userData: any) {
        return await prisma.user.upsert({
            where: { whatsapp_id: userData.whatsapp_id },
            update: {
                nombre: userData.nombre,
                pais: userData.pais,
                email: userData.email
            },
            create: {
                whatsapp_id: userData.whatsapp_id,
                nombre: userData.nombre,
                pais: userData.pais,
                email: userData.email
            }
        });
    },

    // CREAR TICKETS
    async crearTicket(userId: number, falla: string, tipo: string) {
        return await prisma.ticket.create({
            data: {
                user_id: userId,
                producto: tipo,
                descripcion: falla,
                estado: "abierto"
            }
        });
    }
};