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

const sanitizeRoomForPlayer = (room, playerId) => {
    const cleanRoom = JSON.parse(JSON.stringify(room));
    if (cleanRoom.phase === 'game_over') return cleanRoom;

    const requestingPlayer = cleanRoom.players.find(p => p.id === playerId);
    if (!requestingPlayer) return cleanRoom;

    // Anonymous Voting Logic
    if (cleanRoom.phase === 'voting' && cleanRoom.settings.anonymousVoting) {
        // Hide WHO voted for WHOM in specific votes map
        // We still keep the 'votes' count on players so people know who is winning
        if (cleanRoom.gameData && cleanRoom.gameData.votes) {
            // We can just nullify the votes map for clients, 
            // but we must preserve the VOTE COUNTS on the player objects themselves (which are already safe-ish)
            delete cleanRoom.gameData.votes;
        }
    }

    cleanRoom.players = cleanRoom.players.map(p => {
        if (p.id === playerId) return p;
        if (!p.role) return p;
        if (requestingPlayer.role === 'impostor' && p.role === 'impostor') return p;
        return { ...p, role: 'civilian' };
    });
    return cleanRoom;
};

const broadcastRoomUpdate = (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.players.forEach(player => {
        io.to(player.id).emit('update_room', sanitizeRoomForPlayer(room, player.id));
    });
};

const broadcastGameStarted = (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.players.forEach(player => {
        const data = sanitizeRoomForPlayer(room, player.id);
        io.to(player.id).emit('game_started', {
            players: data.players,
            phase: 'distribution',
            gameData: room.gameData,
            playedWords: room.playedWords
        });
    });
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
                votes: 0,
                connected: true
            }],
            phase: 'lobby', // lobby, playing, voting, result, game_over
            settings: {
                impostorCount: 1,
                showHint: false,
                showCategory: false,
                category: 'Aleatorio',
                anonymousVoting: false
            },
            gameData: {
                secretWord: '',
                activeCategory: '',
                impostorHint: '',
                startingPlayerIndex: 0,
                timer: 0,
                lastEliminated: null,
                winnerTeam: null
            },
            playedWords: [],
            lastImpostorIds: []
        };

        socket.join(roomCode);
        socket.emit('room_joined', { roomCode, isHost: true, playerId: socket.id });
        broadcastRoomUpdate(roomCode);
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
                // Reconnection Logic
                if (!existingPlayer.connected) {
                    existingPlayer.connected = true;
                    existingPlayer.id = socket.id; // Update socket ID
                    socket.join(roomCode);

                    socket.emit('room_joined', { roomCode, isHost: existingPlayer.isHost, playerId: socket.id });
                    broadcastRoomUpdate(roomCode);
                    console.log(`${playerName} reconnected to room ${roomCode}`);
                    return;
                }

                socket.emit('error', { message: 'Nombre ya en uso' });
                return;
            }

            const newPlayer = {
                id: socket.id,
                name: playerName,
                isHost: false,
                role: null,
                alive: true,
                votes: 0,
                connected: true
            };

            room.players.push(newPlayer);
            socket.join(roomCode);

            socket.emit('room_joined', { roomCode, isHost: false, playerId: socket.id });
            broadcastRoomUpdate(roomCode);
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
            broadcastRoomUpdate(roomCode);
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

            // Smart impostor selection (avoid repeating same players)
            let availableIndices = players.map((_, i) => i);

            // Prioritize players who weren't impostors last time
            const priorityIndices = availableIndices.filter(idx =>
                !room.lastImpostorIds.includes(players[idx].id)
            );

            // Use priority list if it has enough candidates, otherwise use all
            let candidates = priorityIndices.length >= impostorCount ? priorityIndices : availableIndices;

            // Shuffle candidates
            candidates = candidates.sort(() => Math.random() - 0.5);

            // Select impostors from shuffled candidates
            const selectedIndices = candidates.slice(0, impostorCount);
            selectedIndices.forEach(idx => {
                players[idx].role = 'impostor';
            });

            // Update lastImpostorIds for next round
            room.lastImpostorIds = selectedIndices.map(idx => players[idx].id);

            // Set Game Data
            room.gameData = { ...room.gameData, ...gameData };
            room.phase = 'distribution'; // Although effectively everyone gets it instantly

            // Track played words
            if (gameData.secretWord) {
                room.playedWords.push(gameData.secretWord);
            }

            broadcastGameStarted(roomCode);
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

                broadcastRoomUpdate(roomCode);
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
                    broadcastRoomUpdate(roomCode);
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
                gameData: room.gameData,
                players: room.players // Include full player data for game_over reveal
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
            // We keep playedWords to maintain history until session ends or intentional clear

            room.players.forEach(p => {
                p.role = null;
                p.alive = true;
                p.votes = 0;
            });
            io.to(roomCode).emit('game_reset', room);
        }
    });

    // Kick Player (Host only)
    socket.on('kick_player', ({ roomCode, playerId }) => {
        const room = rooms[roomCode];
        if (room && room.hostId === socket.id) {
            const playerIndex = room.players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1 && !room.players[playerIndex].isHost) {
                const kickedSocketId = room.players[playerIndex].id;
                room.players.splice(playerIndex, 1);

                // Notify kicked player
                io.to(kickedSocketId).emit('error', { message: 'Has sido expulsado de la sala.' });
                io.sockets.sockets.get(kickedSocketId)?.leave(roomCode);

                broadcastRoomUpdate(roomCode);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        for (const code in rooms) {
            const room = rooms[code];
            const player = room.players.find(p => p.id === socket.id);

            if (player) {
                player.connected = false;

                // If it's lobby, maybe we remove them? For now, let's keep them 'ghosted' 
                // but if we want to support reconnection we shouldn't delete immediately.
                // However, infinite ghosts is bad. 
                // Compromise: Mark as disconnected. If host disconnects, maybe complex handling needed.

                // For MVP Reconnection: Just mark disconnected and update room
                broadcastRoomUpdate(code);

                // Cleanup logic could be here (e.g. set timeout to delete player if not back in 5 mins)
                // But for now we leave them in the list so they can rejoin.

                // Wait... if they are in lobby and disconnect, maybe we should remove them to free up the name/slot?
                // If game in progress -> Keep them. If Lobby -> Remove them?
                if (room.phase === 'lobby') {
                    // Remove from lobby to keep it clean, unless we want persistence there too.
                    // Let's remove in lobby for cleaner experience, Reconnect is mostly for "Oops I refreshed mid-game"
                    const index = room.players.indexOf(player);
                    room.players.splice(index, 1);
                    if (room.players.length === 0) {
                        delete rooms[code];
                    } else {
                        if (player.isHost) {
                            room.players[0].isHost = true;
                            room.hostId = room.players[0].id;
                        }
                        broadcastRoomUpdate(code);
                    }
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
