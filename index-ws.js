/** Begin websocket */
const wss = new WebSocketServer({ server: server });

function heartbeat() {
    this.isAlive = true;
}

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(data);
        }
    });
};

wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    const numClients = wss.clients.size;
    console.log(`🟢 [SERVER] Client nou conectat! Total clienți: ${numClients}`);

    try {
        // 1. Trimite datele inițiale
        ws.send(JSON.stringify({ type: 'info', message: 'Welcome to my server!' }));
        wss.broadcast(JSON.stringify({ type: 'visitors', count: numClients }));
        ws.send(JSON.stringify({ type: 'time', timestamp: Date.now() }));

        // 2. Salvare în baza de date
        db.run(`INSERT INTO visitors (count, time) VALUES (?, datetime('now'))`, [numClients], (err) => {
            if (err) console.error("❌ [DB Error]:", err.message);
        });
    } catch (err) {
        console.error("❌ [Eroare trimitere date]:", err);
    }

    ws.on('error', (err) => {
        console.error("❌ [WS Client Error]:", err);
    });

    ws.on('close', function close() {
        console.log(`🔴 [SERVER] Client deconectat. Rămași: ${wss.clients.size}`);
        wss.broadcast(JSON.stringify({ type: 'visitors', count: wss.clients.size }));
    });
});

// Trimite un PING la fiecare 20 de secunde pentru a menține socket-ul deschis prin Cloudflare/Nginx
const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) {
            console.log("⚠️ [SERVER] Client inactiv detectat, închidere socket...");
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 20000);

wss.on('close', function close() {
    clearInterval(interval);
});