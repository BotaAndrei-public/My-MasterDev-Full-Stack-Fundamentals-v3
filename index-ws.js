const express = require('express');
const http = require('http');
const { Server } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new Server({ server });

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

wss.on('connection', (ws) => {
    console.log('Client conectat');

    // Trimite ora din secunda în secundă
    const interval = setInterval(() => {
        if (ws.readyState === 1) { // 1 = OPEN
            const ora = new Date().toLocaleTimeString('ro-RO');
            ws.send(ora);
        }
    }, 1000);

    ws.on('close', () => clearInterval(interval));
});

server.listen(3000, () => {
    console.log('Server pornit pe portul 3000');
});