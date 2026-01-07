const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ip = require('ip');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for LAN play
        methods: ["GET", "POST"]
    }
});

// Game State
const rooms = {};

// Helpers
const generateRoomCode = () => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create Room
    socket.on('create_room', ({ playerName }) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            id: roomCode,
            hostId: socket.id,
            players: [{
                id: socket.id,
                name: playerName,
                isHost: true,
                role: null, // 'impostor' or 'civilian'
                alive: true,
                votes: 0
            }],
            phase: 'lobby', // lobby, playing, voting, result, game_over
            settings: {
                impostorCount: 1,
                showHint: false,
                showCategory: false,
                category: 'Aleatorio'
            },
            gameData: {
                secretWord: '',
                activeCategory: '',
                impostorHint: '',
                startingPlayerIndex: 0,
                timer: 0,
                lastEliminated: null,
                winnerTeam: null
            }
        };

        socket.join(roomCode);
        socket.emit('room_joined', { roomCode, isHost: true, playerId: socket.id });
        io.to(roomCode).emit('update_room', rooms[roomCode]);
        console.log(`Room ${roomCode} created by ${playerName}`);
    });

    // Join Room
    socket.on('join_room', ({ roomCode, playerName }) => {
        const room = rooms[roomCode];
        if (room) {
            if (room.phase !== 'lobby') {
                socket.emit('error', { message: 'El juego ya ha comenzado' });
                return;
            }

            const existingPlayer = room.players.find(p => p.name === playerName);
            if (existingPlayer) {
                socket.emit('error', { message: 'Nombre ya en uso' });
                return;
            }

            const newPlayer = {
                id: socket.id,
                name: playerName,
                isHost: false,
                role: null,
                alive: true,
                votes: 0
            };

            room.players.push(newPlayer);
            socket.join(roomCode);

            socket.emit('room_joined', { roomCode, isHost: false, playerId: socket.id });
            io.to(roomCode).emit('update_room', room);
            console.log(`${playerName} joined room ${roomCode}`);
        } else {
            socket.emit('error', { message: 'Sala no encontrada' });
        }
    });

    // Update Settings (Host only)
    socket.on('update_settings', ({ roomCode, settings }) => {
        const room = rooms[roomCode];
        if (room && room.hostId === socket.id) {
            room.settings = { ...room.settings, ...settings };
            io.to(roomCode).emit('update_room', room);
        }
    });

    // Start Game
    socket.on('start_game', ({ roomCode, gameData }) => {
        const room = rooms[roomCode];
        if (room && room.hostId === socket.id) {
            // Assign roles
            const players = room.players;
            const impostorCount = room.settings.impostorCount;

            // Reset state
            players.forEach(p => {
                p.role = 'civilian';
                p.alive = true;
                p.votes = 0;
            });

            // Randomly select impostors
            let assignedImpostors = 0;
            while (assignedImpostors < impostorCount) {
                const randIndex = Math.floor(Math.random() * players.length);
                if (players[randIndex].role !== 'impostor') {
                    players[randIndex].role = 'impostor';
                    assignedImpostors++;
                }
            }

            // Set Game Data
            room.gameData = { ...room.gameData, ...gameData };
            room.phase = 'distribution'; // Although effectively everyone gets it instantly

            io.to(roomCode).emit('game_started', {
                players: room.players,
                phase: 'distribution',
                gameData: room.gameData
            });
        }
    });

    // Change Phase
    socket.on('set_phase', ({ roomCode, phase }) => {
        const room = rooms[roomCode];
        if (room && room.hostId === socket.id) {
            room.phase = phase;
            io.to(roomCode).emit('phase_change', phase);
        }
    });


    // Vote
    socket.on('vote_player', ({ roomCode, targetId }) => {
        const room = rooms[roomCode];
        if (room) {
            // In a real implementation we might track who voted for whom to prevent double voting
            // For simplicity, just increment count for now or broadcast the vote
            // A better way for this app:
            // 1. Host controls the flow. 
            // 2. Or, we collect votes and Host reveals.

            // Let's implement real-time vote updates if everyone can see them, 
            // or just send to everyone "someone voted"

            io.to(roomCode).emit('vote_cast', { targetId });
        }
    });

    // Eliminate Player
    socket.on('eliminate_player', ({ roomCode, playerId }) => {
        const room = rooms[roomCode];
        if (room && room.hostId === socket.id) {
            const player = room.players.find(p => p.id === playerId);
            if (player) {
                player.alive = false;
                room.gameData.lastEliminated = player;

                // Check win condition
                const aliveImpostors = room.players.filter(p => p.role === 'impostor' && p.alive).length;
                const aliveCivilians = room.players.filter(p => p.role === 'civilian' && p.alive).length;

                let nextPhase = 'round_result';

                if (aliveImpostors === 0) {
                    room.gameData.winnerTeam = 'civilian';
                    nextPhase = 'game_over';
                } else if (aliveImpostors >= aliveCivilians) {
                    room.gameData.winnerTeam = 'impostor';
                    nextPhase = 'game_over';
                }

                room.phase = nextPhase;

                io.to(roomCode).emit('player_eliminated', {
                    eliminatedId: playerId,
                    nextPhase: nextPhase,
                    gameData: room.gameData
                });
            }
        }
    });

    // Reset Game
    socket.on('reset_game', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.hostId === socket.id) {
            room.phase = 'lobby';
            room.gameData = {}; // Clear game data
            room.players.forEach(p => {
                p.role = null;
                p.alive = true;
                p.votes = 0;
            });
            io.to(roomCode).emit('game_reset', room);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up rooms if empty or handle player drop (reconnect logic is complex, skipping for MVP)
        for (const code in rooms) {
            const room = rooms[code];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                room.players.splice(playerIndex, 1);

                if (room.players.length === 0) {
                    delete rooms[code];
                } else {
                    // Update room for others
                    if (player.isHost) {
                        // Assign new host
                        room.players[0].isHost = true;
                        room.hostId = room.players[0].id;
                    }
                    io.to(code).emit('update_room', room);
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    // Only try to read IP if not in production/cloud environment to avoid errors if interface differs
    try {
        console.log(`Local Access: http://localhost:${PORT}`);
        console.log(`LAN Access: http://${ip.address()}:${PORT}`);
    } catch (e) {
        console.log('Server is running (IP lookup failed or in cloud env)');
    }
});
