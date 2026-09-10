const express = require('express');
const server = require('http').createServer();
const app = express();

app.get('/', function(req, res) {
    res.sendFile('index.html', {root: __dirname});
});

server.on('request', app);
server.listen(3000, function() { console.log('server started on port 3000'); });

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

    wss.broadcast(`Current visitors: ${numClients}`);

    if (ws.readyState === ws.OPEN) {
        ws.send('Welcome to my server');
    }

    db.run(`INSERT INTO visitors (count, time)
        VALUES (${numClients}, datetime('now'))
    `);

    ws.on('close', function close() {
    
        wss.broadcast(`Current visitors: ${wss.clients.size}`);
        console.log('A client has disconnected');
    });
});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        client.send(data);
    });
};
/** end websockets */

/** begin database */
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


