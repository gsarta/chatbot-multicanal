import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, // Temporalmente mientras migramos el store completo
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { prisma } from '../services/prisma.service';
export const whatsappService = {
    socket: null as any,

    async connect() {
        // El audio pide investigar el servicio más adecuado
        // En la nube, 'auth_info_baileys' desaparece. 
        // Por ahora mantenemos la función, pero los tokens irán a la DB.
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { version } = await fetchLatestBaileysVersion();

        this.socket = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
        });

        this.socket.ev.on('creds.update', saveCreds);

        this.socket.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) this.connect();
            } else if (connection === 'open') {
                console.log('✅ Conexión a WhatsApp establecida y persistida');
            }
        });

        return this.socket;
    },

    async sendMessage(to: string, text: string) {
        if (!this.socket) return;
        await this.socket.sendMessage(to, { text });
    }
};