import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Mutex } from 'async-mutex';
import { promises as fs } from 'fs';

const sendMutex = new Mutex();
const AUTH_DIR = 'auth_info_baileys';
const PAIRING_DELAY_MS = 20000;
const RECONNECT_DELAY_MS = 5000;

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

    // Solo se invoca ante un loggedOut: esas credenciales ya no sirven y
    // conservarlas hace que cada reintento vuelva a fallar con 401 en vez de
    // pedir una vinculación nueva.
    async clearAuthState() {
        try {
            await fs.rm(AUTH_DIR, { recursive: true, force: true });
            console.warn('🧹 Credenciales inválidas descartadas.');
        } catch (err: any) {
            console.error('No se pudieron descartar las credenciales:', err?.message || err);
        }
    },

    // Vive aquí y no en index.ts para que CADA reconexión sin sesión pida un
    // código nuevo. Cuando esto se hacía una sola vez al arrancar, un código
    // sin usar dejaba al bot sin forma de pedir otro.
    schedulePairingCode() {
        const phone = process.env.BOT_PHONE_NUMBER;
        if (!phone) {
            console.error('⚠️ BOT_PHONE_NUMBER sin definir: imposible pedir código de vinculación.');
            return;
        }
        const target = this.socket;
        setTimeout(async () => {
            if (target !== this.socket) return;                 // ya hubo otra reconexión
            if (target?.authState?.creds?.registered) return;
            try {
                const code = await target.requestPairingCode(phone);
                console.log('\n************************************');
                console.log(`🚀 CÓDIGO DE VINCULACIÓN (${phone}): ${code}`);
                console.log('   Válido ~60s — WhatsApp > Dispositivos vinculados');
                console.log('************************************\n');
            } catch (err: any) {
                console.error('❌ No se pudo generar el código de vinculación:', err?.message || err);
            }
        }, PAIRING_DELAY_MS);
    },

    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        this.socket = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            syncFullHistory: false,
            defaultQueryTimeoutMs: 60000
        });
        const sock = this.socket;

        sock.ev.on('creds.update', saveCreds);

        if (this._messageHandler) {
            sock.ev.on('messages.upsert', this._messageHandler);
        }

        if (!sock.authState.creds.registered) {
            this.schedulePairingCode();
        }

        sock.ev.on('connection.update', async (update: any) => {
            if (sock !== this.socket) return; // socket viejo: su cierre no debe disparar reconexiones

            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                this.isConnected = false;
                const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
                console.log('Conexión cerrada por:', reason);

                if (reason === DisconnectReason.loggedOut) {
                    // 401. Antes se salía sin reintentar y el bot quedaba zombie:
                    // contenedor "Up", Express respondiendo, Baileys muerto y sin
                    // un solo aviso. Descartar la sesión lo deja esperando pareo.
                    console.warn('⚠️ WhatsApp cerró la sesión (401). Se descarta y se pedirá vinculación nueva.');
                    await this.clearAuthState();
                }

                console.log('Intentando reconectar...');
                setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
            } else if (connection === 'open') {
                this.isConnected = true;
                console.log('✅ BOT CONECTADO Y LISTO');
            }
        });

        return sock;
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
