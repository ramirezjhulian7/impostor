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
    socket.on('vote_player', ({ roomCode, targetId, voterId }) => {
        const room = rooms[roomCode];
        if (room) {
            // Find voter and target
            const voter = room.players.find(p => p.id === voterId);
            const target = room.players.find(p => p.id === targetId);

            if (voter && target && target.alive) {
                // Remove previous vote if any
                const previousVoteTargetId = room.gameData.votes?.[voterId];
                if (previousVoteTargetId) {
                    const previousTarget = room.players.find(p => p.id === previousVoteTargetId);
                    if (previousTarget) previousTarget.votes--;
                }

                // Register new vote
                if (!room.gameData.votes) room.gameData.votes = {};
                room.gameData.votes[voterId] = targetId;
                target.votes++;

                io.to(roomCode).emit('update_room', room);
            }
        }
    });

    // End Voting (Host only)
    socket.on('end_voting', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.hostId === socket.id) {

            // Calculate max votes
            let maxVotes = -1;
            let candidates = [];

            // Only consider alive players and players eligible for voting (in case of tie breaker)
            const eligibleTargets = room.gameData.tieCandidates
                ? room.players.filter(p => room.gameData.tieCandidates.includes(p.id))
                : room.players.filter(p => p.alive);

            eligibleTargets.forEach(p => {
                if (p.votes > maxVotes) {
                    maxVotes = p.votes;
                    candidates = [p];
                } else if (p.votes === maxVotes) {
                    candidates.push(p);
                }
            });

            // Logic for Elimination vs Tie
            if (candidates.length === 1) {
                // Clear winner
                const victim = candidates[0];
                eliminatePlayer(roomCode, victim.id, false); // false = not random
            } else {
                // TIE DETECTED
                if (room.gameData.isTieBreaker) {
                    // Second tie -> Random elimination
                    const victim = candidates[Math.floor(Math.random() * candidates.length)];
                    eliminatePlayer(roomCode, victim.id, true); // true = random
                } else {
                    // First tie -> Tie Breaker Round
                    room.phase = 'voting'; // Stay in voting but filtered
                    room.gameData.isTieBreaker = true;
                    room.gameData.tieCandidates = candidates.map(c => c.id);

                    // Reset votes for next round
                    room.players.forEach(p => p.votes = 0);
                    room.gameData.votes = {};

                    io.to(roomCode).emit('tie_breaker', { candidates: room.gameData.tieCandidates });
                    io.to(roomCode).emit('update_room', room);
                }
            }
        }
    });

    // Helper for elimination to reuse in both scenarios
    const eliminatePlayer = (roomCode, playerId, isRandom) => {
        const room = rooms[roomCode];
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.alive = false;
            room.gameData.lastEliminated = player;
            room.gameData.eliminationReason = isRandom ? 'Azar (Empate)' : 'Votación';

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
            // Clear tie breaker state
            room.gameData.isTieBreaker = false;
            room.gameData.tieCandidates = null;
            room.players.forEach(p => p.votes = 0);
            room.gameData.votes = {};

            io.to(roomCode).emit('player_eliminated', {
                eliminatedId: playerId,
                nextPhase: nextPhase,
                gameData: room.gameData
            });
        }
    };

    // Eliminate Player (Manual/Forced) - kept for legacy or if needed, but end_voting is preferred
    socket.on('eliminate_player', ({ roomCode, playerId }) => {
        const room = rooms[roomCode];
        if (room && room.hostId === socket.id) {
            eliminatePlayer(roomCode, playerId, false);
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
