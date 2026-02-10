import prisma from '../database/client.js';

export const identificarUsuario = async (whatsappId) => {
    try {
        let user = await prisma.user.findUnique({ where: { whatsappId } });
        if (!user) {
            user = await prisma.user.create({
                data: { whatsappId, nombre: 'Prospecto Nuevo' }
            });
            console.log("🆕 Lead registrado en DB");
        }
        return user;
    } catch (e) { console.error("Error DB:", e); }
};