const express = require('express');
const server = require('http').createServer();
const app = express();
const sqlite = require('sqlite3');
const WebSocketServer = require('ws').Server;

app.get('/', function(req, res) {
    res.sendFile('index.html', { root: __dirname });
});

server.on('request', app);
server.listen(3000, function() { 
    console.log('🚀 [SERVER] Serverul a pornit pe portul 3000 -> http://localhost:3000'); 
});

/** Begin database */
const db = new sqlite.Database('./fsfe.db'); 

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS visitors (
            count INTEGER,
            time TEXT
        )
    `, (err) => {
        if (!err) console.log('🗄️  [DB] Tabela "visitors" este pregătită.');
    });
});

/** Begin websocket */
const wss = new WebSocketServer({ server: server });

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(data);
        }
    });
};

wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;
    console.log(`🟢 [SERVER] Client nou conectat! Total clienți conectați: ${numClients}`);

    // 1. Mesaj de bun venit
    ws.send(JSON.stringify({ type: 'info', message: 'Welcome to my server!' }));

    // 2. Trimitem numărul actualizat de vizitatori tuturor clienților
    wss.broadcast(JSON.stringify({ type: 'visitors', count: numClients }));

    // 3. Trimitem ora curentă (timestamp)
    ws.send(JSON.stringify({ type: 'time', timestamp: Date.now() }));

    // 4. Salvare în baza de date
    db.run(`INSERT INTO visitors (count, time) VALUES (?, datetime('now'))`, [numClients], (err) => {
        if (err) {
            console.error("❌ [DB Error]:", err.message);
        } else {
            console.log(`💾 [DB] Înregistrare salvată în baza de date: ${numClients} vizitatori.`);
        }
    });

    ws.on('close', function close() {
        console.log(`🔴 [SERVER] Un client s-a deconectat. Rămași: ${wss.clients.size}`);
        wss.broadcast(JSON.stringify({ type: 'visitors', count: wss.clients.size }));
    });
});

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

function pornesteCeasGlobal() {
    const acum = new Date();
    const milisecundePanaLaMinutulUrmator = 60000 - (acum.getSeconds() * 1000 + acum.getMilliseconds());

    setTimeout(function() {
        console.log('📡 [SYNC] Se trimite resincronizarea de timp către toți clienții...');
        wss.broadcast(JSON.stringify({ type: 'time', timestamp: Date.now() }));
        pornesteCeasGlobal(); 
    }, milisecundePanaLaMinutulUrmator);
}

pornesteCeasGlobal();