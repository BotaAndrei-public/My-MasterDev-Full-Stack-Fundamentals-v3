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
    console.log('Server started on port 3000 -> http://localhost:3000'); 
});

/** Begin database */
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
    console.log('Clients connected:', numClients);

    // Trimite numărul de vizitatori tuturor clienților
    wss.broadcast(JSON.stringify({ type: 'visitors', count: numClients }));

    // Trimite timestamp-ul curent clientului conectat
    if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'time', timestamp: Date.now() }));
    }

    db.run(`INSERT INTO visitors (count, time) VALUES (?, datetime('now'))`, [numClients], (err) => {
        if (err) console.error("DB Error:", err.message);
    });

    ws.on('close', function close() {
        wss.broadcast(JSON.stringify({ type: 'visitors', count: wss.clients.size }));
        console.log('A client has disconnected');
    });
});

function shutdownDB() {
    console.log('Reading final counts before shutdown...');
    db.each("SELECT * FROM visitors", 
        (err, row) => {
            if (err) console.error(err);
            console.log(row);
        }, 
        () => { 
            console.log('Shutting down db...');
            db.close((err) => {
                if (err) console.error(err);
                console.log('Database closed safely.');
                process.exit(0); 
            });
        }
    );
}

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
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
        wss.broadcast(JSON.stringify({ type: 'time', timestamp: Date.now() }));
        pornesteCeasGlobal(); 
    }, milisecundePanaLaMinutulUrmator);
}

pornesteCeasGlobal();