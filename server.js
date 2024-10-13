const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const users = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('generate code', () => {
        const code = crypto.randomBytes(4).toString('hex');
        const secretPhrase = crypto.randomBytes(4).toString('hex');
        users[code] = { secretPhrase, socketId: socket.id };
        socket.emit('code generated', { code, secretPhrase });
    });

    socket.on('join with code', ({ code, secretPhrase }) => {
        if (users[code] && users[code].secretPhrase === secretPhrase) {
            const targetSocketId = users[code].socketId;
            io.to(targetSocketId).emit('connection request', socket.id);
        } else {
            socket.emit('invalid code');
        }
    });

    socket.on('accept connection', (targetSocketId) => {
        io.to(targetSocketId).emit('connection accepted', socket.id);
        socket.emit('connection accepted', targetSocketId);
    });

    socket.on('chat message', ({ targetSocketId, message }) => {
        io.to(targetSocketId).emit('chat message', message);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        for (const code in users) {
            if (users[code].socketId === socket.id) {
                delete users[code];
                break;
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
