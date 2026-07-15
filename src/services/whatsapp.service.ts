import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Mutex } from 'async-mutex';

const sendMutex = new Mutex();

export const whatsappService = {
    socket: null as any,
    isConnected: false,
    _messageHandler: null as ((data: any) => void) | null,

    setMessageHandler(handler: (data: any) => void) {
        this._messageHandler = handler;
        if (this.socket) {
            this.socket.ev.on('messages.upsert', handler);
        }
    },

    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { version } = await fetchLatestBaileysVersion();

        this.socket = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            syncFullHistory: false,
            defaultQueryTimeoutMs: 60000
        });

        this.socket.ev.on('creds.update', saveCreds);

        if (this._messageHandler) {
            this.socket.ev.on('messages.upsert', this._messageHandler);
        }

        this.socket.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                this.isConnected = false;
                const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
                console.log('Conexión cerrada por:', reason);
                if (reason !== DisconnectReason.loggedOut) {
                    console.log('Intentando reconectar...');
                    setTimeout(() => this.connect(), 5000);
                }
            } else if (connection === 'open') {
                this.isConnected = true;
                console.log('✅ BOT CONECTADO Y LISTO');
            }
        });

        return this.socket;
    },

    async sendMessage(to: string, text: string) {
        if (!this.socket || !this.isConnected) {
            console.error("No se puede enviar mensaje: bot desconectado");
            return;
        }
        try {
            await sendMutex.runExclusive(() => this.socket.sendMessage(to, { text }));
        } catch (err: any) {
            console.error(`❌ Error enviando a ${to}:`, err?.message || err);
        }
    }
};
