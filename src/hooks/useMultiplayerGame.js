import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

export function useMultiplayerGame() {
    const { socket, isConnected, connect } = useSocket();

    // UI State
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

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
        category: 'Aleatorio'
    });
    const [gameData, setGameData] = useState({});

    useEffect(() => {
        if (!socket) return;

        socket.on('room_joined', (data) => {
            setRoomCode(data.roomCode);
            setIsHost(data.isHost);
            setMyPlayerId(data.playerId);
            setIsLoading(false);
            setError(null);
        });

        socket.on('update_room', (room) => {
            setPlayers(room.players);
            setSettings(room.settings);
            setPhase(room.phase);
            setGameData(room.gameData);
        });

        socket.on('game_started', (data) => {
            setPlayers(data.players);
            setPhase(data.phase);
            setGameData(data.gameData);
        });

        socket.on('phase_change', (newPhase) => {
            setPhase(newPhase);
        });

        socket.on('player_eliminated', (data) => {
            // Can show animation here if needed
            setPhase(data.nextPhase);
            setGameData(data.gameData);
        });

        socket.on('game_reset', (room) => {
            setPlayers(room.players);
            setPhase(room.phase);
            setGameData({});
        });

        socket.on('error', (data) => {
            setError(data.message);
            setIsLoading(false);
        });

        return () => {
            socket.off('room_joined');
            socket.off('update_room');
            socket.off('game_started');
            socket.off('phase_change');
            socket.off('player_eliminated');
            socket.off('game_reset');
            socket.off('error');
        };
    }, [socket]);

    const joinRoom = (code, name) => {
        if (!isConnected) connect();
        setIsLoading(true);
        // If socket is not yet connected, we might need to wait or the emit will buffer.
        // But since we call connect(), it might take a moment. 
        // A better pattern is to emit in useEffect when connected, but for simplicity:
        if (socket) {
            socket.emit('join_room', { roomCode: code.toUpperCase(), playerName: name });
        } else {
            // Retry once connected logic or just show error
            setTimeout(() => {
                if (socket) socket.emit('join_room', { roomCode: code.toUpperCase(), playerName: name });
            }, 500);
        }
    };

    const createRoom = (name) => {
        if (!isConnected) connect();
        setIsLoading(true);
        if (socket) {
            socket.emit('create_room', { playerName: name });
        } else {
            setTimeout(() => {
                // Accessing the *current* socket from context might require refetching context or depend on it being set
            }, 500);
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
            socket.emit('vote_player', { roomCode, targetId });
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

    return {
        // State
        isConnected, isLoading, error, setError,
        roomCode, isHost, myPlayerId, players,
        phase, settings, gameData,

        // Actions
        connect,
        joinRoom, createRoom,
        updateSettings, startGame,
        nextPhase, votePlayer, eliminatePlayer, resetGame
    };
}
