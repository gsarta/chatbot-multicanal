import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

export const whatsappService = {
    socket: null as any,

    async connect() {
        // --- LA SOLUCIÓN TEMPORAL PARA RENDER ---
        // Usamos una carpeta fija, pero en Render esto se borra al reiniciar
        // Para que sea real en producción, deberías usar un "Mount Service" de Render
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { version } = await fetchLatestBaileysVersion();

        this.socket = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false, // Ya usamos Pairing Code en index.ts
            // Añadimos estas opciones para mejorar la estabilidad en Render
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            syncFullHistory: false
        });

        this.socket.ev.on('creds.update', saveCreds);

        this.socket.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
                console.log('Conexión cerrada por:', reason);

                // Si no es un cierre voluntario, reconectamos
                if (reason !== DisconnectReason.loggedOut) {
                    console.log('Intentando reconectar...');
                    setTimeout(() => this.connect(), 5000); // Esperamos 5 seg para no saturar
                }
            } else if (connection === 'open') {
                console.log('✅ BOT CONECTADO Y LISTO');
            }
        });

        return this.socket;
    },

    async sendMessage(to: string, text: string) {
        if (!this.socket) {
            console.error("No se puede enviar mensaje: Socket no inicializado");
            return;
        }
        await this.socket.sendMessage(to, { text });
    }
};