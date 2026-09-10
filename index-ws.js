const express = require('express');
const server = require('http').createServer();
const app = express();

app.get('/', function(req, res) {
    res.sendFile('index.html', {root: __dirname});
});

server.on('request', app);
server.listen(3000, function() { console.log('Server started on port 3000'); });

/** Begin database */
const sqlite = require('sqlite3');
const db = new sqlite.Database('./fsfe.db'); 

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS visitors (
            count INTEGER,
            time TEXT
        )
    `);
});

/** Begin websocket */
const WebSocketServer = require('ws').Server;

// Configured with /ws path restriction for secure reverse-proxy mapping
const wss = new WebSocketServer({
    server: server,
    path: '/ws'
});

wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;
    console.log('Clients connected', numClients);

    wss.broadcast(JSON.stringify({ type: 'visitors', count: numClients }));

    if (ws.readyState === 1) { 
        ws.send(JSON.stringify({ type: 'info', message: 'Welcome to my server' }));
        ws.send(JSON.stringify({ type: 'time', timestamp: Date.now() }));
    }

    db.run(`INSERT INTO visitors (count, time) VALUES (?, datetime('now'))`, [numClients], (err) => {
        if (err) console.error("DB Error ignored:", err.message);
    });

    ws.on('close', function close() {
        wss.broadcast(JSON.stringify({ type: 'visitors', count: wss.clients.size }));
        console.log('A client has disconnected');
    });
});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === 1) { 
            client.send(data);
        }
    });
};

function pornesteCeasGlobal() {
    const acum = new Date();
    const milisecundePanaLaMinutulUrmator = 60000 - (acum.getSeconds() * 1000 + acum.getMilliseconds());

    setTimeout(function() {
        wss.broadcast(JSON.stringify({ type: 'time', timestamp: Date.now() }));
        pornesteCeasGlobal(); 
    }, milisecundePanaLaMinutulUrmator);
}

pornesteCeasGlobal();

