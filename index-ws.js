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

// FIX #1: Keep the DB setup completely synchronous and stable before accepting traffic
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS visitors (
            count INTEGER,
            time TEXT
        )
    `);
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

/** Begin websocket */
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({server: server});

process.on('SIGINT', () => {
    console.log('sigint');
    wss.clients.forEach(function each(client) {
        client.close();
    });
    server.close();
    shutdownDB();
});

wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;
    console.log('Clients connected', numClients);

    // Broadcast updated attendee tally safely
    wss.broadcast(`Current visitors: ${numClients}`);

    if (ws.readyState === 1) { // 1 means OPEN
        ws.send('Welcome to my server');
        ws.send(`TIMESTAMP:${Date.now()}`);
    }

    // Wrapped in a safe try-catch wrapper block
    try {
        db.run(`INSERT INTO visitors (count, time) VALUES (?, datetime('now'))`, [numClients], (err) => {
            if (err) console.error("Database Insert Error: ", err.message);
        });
    } catch (e) {
        console.error("Database connection fault handled:", e);
    }

    ws.on('close', function close() {
        wss.broadcast(`Current visitors: ${wss.clients.size}`);
        console.log('A client has disconnected');
    });
});

// FIX #2: Safely broadcast ONLY to actively connected open clients
wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === 1) { // 1 means WebSocket.OPEN
            client.send(data);
        }
    });
};

function pornesteCeasGlobal() {
    const acum = new Date();
    const milisecundePanaLaMinutulUrmator = 60000 - (acum.getSeconds() * 1000 + acum.getMilliseconds());

    setTimeout(function() {
        wss.broadcast(`TIMESTAMP:${Date.now()}`);
        pornesteCeasGlobal(); 
    }, milisecundePanaLaMinutulUrmator);
}

pornesteCeasGlobal();
/** end websockets */

