import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export function useMultiplayerGame() {
    const { socket, isConnected, connect } = useSocket();

    // UI State
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [hasSavedSession, setHasSavedSession] = useState(false);
    const [savedSessionRoom, setSavedSessionRoom] = useState(null);

    // Game State (Synced from Server)
    const [roomCode, setRoomCode] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [myPlayerId, setMyPlayerId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [phase, setPhase] = useState('lobby'); // lobby, distribution, playing, voting, round_result, game_over
    const [settings, setSettings] = useState({
        impostorCount: 1,
        showHint: false,
        showCategory: false,
        category: 'Aleatorio',
        anonymousVoting: false
    });
    const [gameData, setGameData] = useState({});
    const [playedWords, setPlayedWords] = useState([]);
    const [ranking, setRanking] = useState({});

    useEffect(() => {
        if (!socket) return;

        socket.on('room_joined', (data) => {
            setRoomCode(data.roomCode);
            setIsHost(data.isHost);
            setMyPlayerId(data.playerId);
            localStorage.setItem('impostor_room', data.roomCode);
            setIsLoading(false);
            setIsReconnecting(false);
            setError(null);
        });

        socket.on('room_state', (room) => {
            // Full state sync for reconnection
            setPlayers(room.players);
            setSettings(room.settings);
            setPhase(room.phase);
            setGameData(room.gameData || {});
            if (room.playedWords) setPlayedWords(room.playedWords);
            if (room.ranking) setRanking(room.ranking);
            setIsReconnecting(false);
        });

        socket.on('update_room', (room) => {
            setPlayers(room.players);
            setSettings(room.settings);
            setPhase(room.phase);
            setGameData(room.gameData);
            if (room.playedWords) setPlayedWords(room.playedWords);
            if (room.ranking) setRanking(room.ranking);
        });

        socket.on('game_started', (data) => {
            setPlayers(data.players);
            setPhase(data.phase);
            setGameData(data.gameData);
            if (data.playedWords) setPlayedWords(data.playedWords);
        });

        socket.on('phase_change', (newPhase) => {
            setPhase(newPhase);
        });

        socket.on('player_eliminated', (data) => {
            setPhase(data.nextPhase);
            setGameData(data.gameData);
            if (data.players) {
                setPlayers(data.players);
            }
            if (data.ranking) {
                setRanking(data.ranking);
            }
        });

        socket.on('game_reset', (room) => {
            setPlayers(room.players);
            setPhase(room.phase);
            setGameData({});
        });

        socket.on('error', (data) => {
            setError(data.message);
            setIsLoading(false);
            setIsReconnecting(false);
        });

        socket.on('rejoin_failed', (data) => {
            // Clear saved session if rejoin fails
            localStorage.removeItem('impostor_room');
            setRoomCode(null);
            setIsReconnecting(false);
            setError(data.message);
        });

        socket.on('game_draw', (data) => {
            setPhase('game_over');
            setGameData(data.gameData);
            setPlayers(data.players);
        });

        return () => {
            socket.off('room_joined');
            socket.off('room_state');
            socket.off('update_room');
            socket.off('game_started');
            socket.off('phase_change');
            socket.off('player_eliminated');
            socket.off('game_reset');
            socket.off('error');
            socket.off('rejoin_failed');
            socket.off('game_draw');
        };
    }, [socket]);

    // Check for saved session on page load (runs once)
    const hasCheckedSession = useRef(false);

    useEffect(() => {
        if (hasCheckedSession.current) return;
        hasCheckedSession.current = true;

        const savedRoom = localStorage.getItem('impostor_room');
        const savedName = localStorage.getItem('impostor_name');

        if (savedRoom && savedName && !roomCode) {
            console.log('Detected saved session:', savedRoom);
            setHasSavedSession(true);
            setSavedSessionRoom(savedRoom);
        }
    }, []);

    // Function to attempt reconnection (user chose to reconnect)
    const attemptReconnect = useCallback(() => {
        const savedRoom = localStorage.getItem('impostor_room');
        const savedName = localStorage.getItem('impostor_name');

        if (savedRoom && savedName) {
            setHasSavedSession(false);
            setIsReconnecting(true);

            if (!isConnected) {
                connect();
                setPendingAction({ type: 'rejoin', payload: { code: savedRoom, name: savedName } });
            } else if (socket) {
                socket.emit('rejoin_room', { roomCode: savedRoom, playerName: savedName });
            }
        }
    }, [isConnected, socket, connect]);

    // Function to clear saved session (user chose new game)
    const clearSavedSession = useCallback(() => {
        localStorage.removeItem('impostor_room');
        setHasSavedSession(false);
        setSavedSessionRoom(null);
    }, []);

    // Handle socket reconnection (when socket.io auto-reconnects after disconnect)
    // This only fires on REAL reconnections, not initial connection
    useEffect(() => {
        if (!socket) return;

        const handleReconnect = () => {
            const savedRoom = localStorage.getItem('impostor_room');
            const savedName = localStorage.getItem('impostor_name');

            // Only auto-rejoin if we have saved session AND we already had a roomCode
            // (meaning we were in a game before disconnecting)
            if (savedRoom && savedName && roomCode) {
                console.log('Socket reconnected, attempting to rejoin room...');
                setIsReconnecting(true);
                socket.emit('rejoin_room', { roomCode: savedRoom, playerName: savedName });
            }
        };

        // 'reconnect' event only fires when socket.io reconnects after a disconnect
        // It does NOT fire on initial connection
        socket.io.on('reconnect', handleReconnect);

        return () => {
            socket.io.off('reconnect', handleReconnect);
        };
    }, [socket, roomCode]);

    // Pending Actions (to handle race condition where socket isn't ready yet)
    const [pendingAction, setPendingAction] = useState(null); // { type: 'create' | 'join', payload: any }

    useEffect(() => {
        if (socket && isConnected && pendingAction) {
            if (pendingAction.type === 'create') {
                socket.emit('create_room', { playerName: pendingAction.payload.name });
            } else if (pendingAction.type === 'join') {
                socket.emit('join_room', { roomCode: pendingAction.payload.code, playerName: pendingAction.payload.name });
            } else if (pendingAction.type === 'rejoin') {
                socket.emit('rejoin_room', { roomCode: pendingAction.payload.code, playerName: pendingAction.payload.name });
            }
            setPendingAction(null);
        }
    }, [socket, isConnected, pendingAction]);

    const joinRoom = (code, name) => {
        if (!isConnected) {
            connect();
            setPendingAction({ type: 'join', payload: { code: code.toUpperCase(), name } });
            setIsLoading(true);
        } else if (socket) {
            setIsLoading(true);
            socket.emit('join_room', { roomCode: code.toUpperCase(), playerName: name });
        }
    };

    const createRoom = (name) => {
        if (!isConnected) {
            connect();
            setPendingAction({ type: 'create', payload: { name } });
            setIsLoading(true);
        } else if (socket) {
            setIsLoading(true);
            socket.emit('create_room', { playerName: name });
        }
    };

    // Host Actions
    const updateSettings = (newSettings) => {
        if (socket && isHost) {
            socket.emit('update_settings', { roomCode, settings: newSettings });
        }
    };

    const startGame = (initialGameData) => {
        if (socket && isHost) {
            socket.emit('start_game', { roomCode, gameData: initialGameData });
        }
    };

    const nextPhase = (nextPhaseName) => {
        if (socket && isHost) {
            socket.emit('set_phase', { roomCode, phase: nextPhaseName });
        }
    };

    const votePlayer = (targetId) => {
        if (socket) {
            socket.emit('vote_player', { roomCode, targetId, voterId: myPlayerId });
        }
    };

    const endVoting = () => {
        if (socket && isHost) {
            socket.emit('end_voting', { roomCode });
        }
    };

    const eliminatePlayer = (targetId) => {
        if (socket && isHost) {
            socket.emit('eliminate_player', { roomCode, playerId: targetId });
        }
    };

    const resetGame = () => {
        if (socket && isHost) {
            socket.emit('reset_game', { roomCode });
        }
    };

    const kickPlayer = (targetId) => {
        if (socket && isHost) {
            socket.emit('kick_player', { roomCode, playerId: targetId });
        }
    };

    const voteUnknownWord = () => {
        if (socket) {
            socket.emit('vote_unknown_word', { roomCode, playerId: myPlayerId });
        }
    };

    return {
        // State
        isConnected, isLoading, isReconnecting, error, setError,
        roomCode, isHost, myPlayerId, players,
        phase, settings, gameData, playedWords, ranking,
        hasSavedSession, savedSessionRoom,

        // Actions
        connect,
        joinRoom, createRoom,
        updateSettings, startGame,
        nextPhase, votePlayer, endVoting, eliminatePlayer, resetGame, kickPlayer, voteUnknownWord,
        attemptReconnect, clearSavedSession
    };
}
