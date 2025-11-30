const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pino = require('pino');

// Catatan: FS (File System) untuk database lokal dihapus karena data sekarang ada di Firebase (Cloud).
// Server ini sekarang murni berfungsi sebagai "Engine Pengirim Pesan".

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
// Mengizinkan koneksi Socket.io dari mana saja agar teman beda jaringan bisa terhubung statusnya (via Ngrok)
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "DELETE"] } });

let sock;

// --- KONEKSI WHATSAPP ---
async function connectToWhatsApp() {
    // Auth tetap disimpan lokal di server ini agar sesi WA tidak hilang saat restart
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // Tampilkan di terminal juga untuk debugging mudah
        auth: state,
        // Browser config untuk menyamar agar tidak mudah terdeteksi bot
        browser: ['7unoBLAST Cloud', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('⚡ QR Code baru diterima, silakan scan di Web Dashboard.');
            io.emit('qr', qr);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Koneksi terputus. Mencoba reconnect...', shouldReconnect);
            io.emit('status', 'disconnected');
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ TERHUBUNG KE WHATSAPP! Server Siap.');
            io.emit('status', 'connected');
            io.emit('qr', null);
        }
    });

    // Monitor Pesan Masuk (Realtime Forwarding ke Web Dashboard)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    const sender = msg.pushName || msg.key.remoteJid.split('@')[0];
                    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
                    if (!text) continue;

                    console.log(`📩 Pesan Masuk: ${sender} - ${text}`);
                    
                    // Kirim event ke Web Dashboard (App.jsx)
                    // App.jsx yang akan memutuskan apakah perlu notifikasi atau update UI
                    io.emit('new_message', {
                        id: msg.key.id,
                        name: sender,
                        phone: msg.key.remoteJid.replace('@s.whatsapp.net', ''),
                        lastMsg: text,
                        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        unread: 1
                    });

                    // Auto Reply Sederhana (Server Side)
                    // Bisa dipindah ke Firebase jika ingin config dynamic, tapi ini bagus untuk testing
                    if (text.toLowerCase() === 'ping') {
                        await sock.sendMessage(msg.key.remoteJid, { text: '🤖 Pong! Server 7unoBLAST Online.' });
                    }
                }
            }
        }
    });
}

connectToWhatsApp();

// --- API ENDPOINTS ---

// 1. Endpoint Kirim Pesan (Dipanggil oleh App.jsx saat broadcast)
app.post('/send-message', async (req, res) => {
    try {
        const { number, message, image } = req.body;
        
        if (!sock) {
            return res.status(500).json({ status: 'error', message: 'WA Belum Terhubung di Server' });
        }

        let formatted = number.replace(/\D/g, '');
        if (formatted.startsWith('0')) formatted = '62' + formatted.slice(1);
        if (!formatted.endsWith('@s.whatsapp.net')) formatted += '@s.whatsapp.net';

        // Cek validitas nomor di WA (Optional, biar tidak error)
        const [result] = await sock.onWhatsApp(formatted);
        if (!result?.exists) {
            return res.status(404).json({ status: 'error', message: 'Nomor tidak terdaftar di WA' });
        }

        if (image) {
            const buffer = Buffer.from(image.split(',')[1], 'base64');
            await sock.sendMessage(formatted, { image: buffer, caption: message || '' });
        } else {
            await sock.sendMessage(formatted, { text: message || '' });
        }
        
        console.log(`✅ Terkirim ke: ${formatted}`);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Gagal kirim:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. System Status
app.get('/status', (req, res) => {
    res.json({ status: sock ? 'connected' : 'disconnected' });
});

// 3. Logout / Reset Sesi
app.post('/logout', async (req, res) => {
    try {
        if (sock) { 
            await sock.logout(); 
            sock = null; 
            console.log('🔒 Sesi diputus oleh user.');
        }
        res.json({ status: 'success' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Port tetap 3001. Jalankan ngrok di port ini: "ngrok http 3001"
server.listen(3001, () => console.log('🚀 Server Gateway WhatsApp berjalan di port 3001'));