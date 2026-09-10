const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws'); // Import corect WebSocketServer
const sqlite3 = require('sqlite3');

const app = express();
const server = http.createServer(app);

// 1. Baza de date SQLite
const db = new sqlite3.Database('./fsfe.db', (err) => {
    if (err) console.error('❌ [DB Error]:', err.message);
    else console.log('🗄️  [DB] Baza de date ./fsfe.db este conectată.');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS visitors (
            count INTEGER,
            time TEXT
        )
    `);
});

// 2. Ruta Express
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// 3. Server WebSocket pe același server HTTP
const wss = new WebSocketServer({ server });

wss.broadcast = function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

wss.on('connection', (ws) => {
    const numClients = wss.clients.size;
    console.log(`🟢 [SERVER] Client nou conectat! Vizitatori activi: ${numClients}`);

    // Trimitem mesajele inițiale către client
    ws.send(JSON.stringify({ type: 'info', message: 'Welcome to my server!' }));
    wss.broadcast(JSON.stringify({ type: 'visitors', count: numClients }));
    ws.send(JSON.stringify({ type: 'time', timestamp: Date.now() }));

    // Salvare în baza de date
    db.run(`INSERT INTO visitors (count, time) VALUES (?, datetime('now'))`, [numClients], (err) => {
        if (err) console.error("❌ [DB Error]:", err.message);
        else console.log(`💾 [DB] Înregistrare salvată: ${numClients} vizitatori.`);
    });

    ws.on('close', () => {
        console.log(`🔴 [SERVER] Client deconectat. Rămași: ${wss.clients.size}`);
        wss.broadcast(JSON.stringify({ type: 'visitors', count: wss.clients.size }));
    });
});

// 4. Sincronizare timp
function pornesteCeasGlobal() {
    const acum = new Date();
    const milisecundePanaLaMinutulUrmator = 60000 - (acum.getSeconds() * 1000 + acum.getMilliseconds());

    setTimeout(() => {
        console.log('📡 [SYNC] Resincronizare de timp trimisă.');
        wss.broadcast(JSON.stringify({ type: 'time', timestamp: Date.now() }));
        pornesteCeasGlobal();
    }, milisecundePanaLaMinutulUrmator);
}

pornesteCeasGlobal();

// 5. Oprire curată (SIGINT / PM2 restart)
process.on('SIGINT', () => {
    console.log('\n⚠️ [SERVER] Închidere curată...');
    wss.clients.forEach((client) => client.close());
    server.close();
    db.close(() => process.exit(0));
});

server.listen(3000, () => {
    console.log('🚀 [SERVER] Pornește pe portul 3000 -> http://localhost:3000');
});