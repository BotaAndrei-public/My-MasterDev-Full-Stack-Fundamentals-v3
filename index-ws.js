const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sqlite = require('sqlite3');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 1. Initalizare Baza de date LA ÎNCEPUT (rezolvă erorile de crash)
const db = new sqlite.Database('./fsfe.db', (err) => {
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

// Servește pagina index.html
app.get('/', function(req, res) {
    res.sendFile('index.html', { root: __dirname });
});

// Funcție broadcast pentru toți clienții
wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

/** WebSocket Handlers */
wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;
    console.log(`🟢 [SERVER] Client nou conectat! Total vizitatori activi: ${numClients}`);

    // Trimitem datele inițiale către browser (JSON structurat)
    ws.send(JSON.stringify({ type: 'info', message: 'Welcome to my server!' }));
    wss.broadcast(JSON.stringify({ type: 'visitors', count: numClients }));
    ws.send(JSON.stringify({ type: 'time', timestamp: Date.now() }));

    // Salvare în baza de date
    db.run(`INSERT INTO visitors (count, time) VALUES (?, datetime('now'))`, [numClients], (err) => {
        if (err) {
            console.error("❌ [DB Error]:", err.message);
        } else {
            console.log(`💾 [DB] Înregistrare salvată: ${numClients} vizitatori.`);
        }
    });

    ws.on('close', function close() {
        console.log(`🔴 [SERVER] Un client s-a deconectat. Rămași: ${wss.clients.size}`);
        wss.broadcast(JSON.stringify({ type: 'visitors', count: wss.clients.size }));
    });
});

/** Sincronizare periodică a timpului */
function pornesteCeasGlobal() {
    const acum = new Date();
    const milisecundePanaLaMinutulUrmator = 60000 - (acum.getSeconds() * 1000 + acum.getMilliseconds());

    setTimeout(function() {
        console.log('📡 [SYNC] Resincronizare de timp trimisă către toți clienții.');
        wss.broadcast(JSON.stringify({ type: 'time', timestamp: Date.now() }));
        pornesteCeasGlobal();
    }, milisecundePanaLaMinutulUrmator);
}

pornesteCeasGlobal();

/** Oprire curată (SIGINT / Ctrl+C) */
function shutdownDB() {
    console.log('📊 [DB] Citire numărători finale înainte de oprire...');
    db.each("SELECT * FROM visitors", 
        (err, row) => {
            if (err) console.error(err);
            console.log("   ROW:", row);
        }, 
        () => { 
            console.log('🛑 [DB] Închidere bază de date...');
            db.close((err) => {
                if (err) console.error(err);
                console.log('✅ [DB] Baza de date a fost închisă în siguranță.');
                process.exit(0); 
            });
        }
    );
}

process.on('SIGINT', () => {
    console.log('\n⚠️ [SERVER] Semnal SIGINT primit. Închidere curată...');
    wss.clients.forEach(function each(client) {
        client.close();
    });
    server.close();
    shutdownDB();
});

server.listen(3000, function() { 
    console.log('🚀 [SERVER] Pornește pe portul 3000 -> http://localhost:3000'); 
});