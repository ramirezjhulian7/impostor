import { useState, useEffect } from 'react';
import { generateId, shuffleArray } from '../utils/helpers';
import { WORD_DATA } from '../data/words';

export const useImpostorGame = () => {
    const [phase, setPhase] = useState('setup');
    const [players, setPlayers] = useState([
        { id: generateId(), name: 'Jugador 1', role: 'civil', alive: true },
        { id: generateId(), name: 'Jugador 2', role: 'civil', alive: true },
        { id: generateId(), name: 'Jugador 3', role: 'civil', alive: true },
        { id: generateId(), name: 'Jugador 4', role: 'civil', alive: true }
    ]);
    const [sessionStats, setSessionStats] = useState({});
    const [impostorCount, setImpostorCount] = useState(1);
    const [showCategoryToImpostor, setShowCategoryToImpostor] = useState(false);
    const [showHintToImpostor, setShowHintToImpostor] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Aleatorio');
    const [playedWords, setPlayedWords] = useState([]);
    const [noWordsError, setNoWordsError] = useState(false);

    // Game State
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [secretWord, setSecretWord] = useState(null);
    const [activeCategory, setActiveCategory] = useState('');
    const [impostorHint, setImpostorHint] = useState('');
    const [lastEliminated, setLastEliminated] = useState(null);
    const [winnerTeam, setWinnerTeam] = useState(null);
    const [lastImpostorIds, setLastImpostorIds] = useState([]);

    // Timer & Turn State
    const [startingPlayerName, setStartingPlayerName] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    useEffect(() => {
        let interval = null;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    const addPlayer = () => {
        const newId = generateId();
        setPlayers([...players, { id: newId, name: `Jugador ${players.length + 1}`, role: 'civil', alive: true }]);
        setSessionStats(prev => ({
            ...prev,
            [newId]: prev[newId] || { wins: 0, losses: 0, games: 0, impostorGames: 0 }
        }));
    };

    const removePlayer = (id) => {
        if (players.length > 3) {
            setPlayers(players.filter(p => p.id !== id));
        }
    };

    const updateName = (id, newName) => {
        setPlayers(players.map(p => p.id === id ? { ...p, name: newName } : p));
    };

    const clearHistory = () => {
        setPlayedWords([]);
        setNoWordsError(false);
        setSessionStats({});
        alert("Historial y estadísticas reiniciadas.");
    };

    const selectRoles = (currentPlayers, count) => {
        let availableIndices = currentPlayers.map((_, i) => i);
        const priorityIndices = availableIndices.filter(idx =>
            !lastImpostorIds.includes(currentPlayers[idx].id)
        );
        let candidates = priorityIndices.length >= count ? priorityIndices : availableIndices;
        const shuffledCandidates = shuffleArray(candidates);
        return shuffledCandidates.slice(0, count);
    };

    const startTimerForRound = () => {
        const activeCount = players.filter(p => p.alive).length;
        setTimeLeft(activeCount * 30);
        setIsTimerRunning(true);
    };

    const pickStartingPlayer = (currentPlayers) => {
        const alivePlayers = currentPlayers.filter(p => p.alive);
        if (alivePlayers.length > 0) {
            const randomStarter = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
            setStartingPlayerName(randomStarter.name);
        }
    };

    const startGame = () => {
        setNoWordsError(false);

        let candidates = [];
        if (selectedCategory === 'Aleatorio') {
            Object.keys(WORD_DATA).forEach(cat => {
                WORD_DATA[cat].forEach(item => {
                    const uniqueId = `${cat}:${item.word}`;
                    if (!playedWords.includes(uniqueId)) {
                        candidates.push({ ...item, category: cat, uniqueId });
                    }
                });
            });
        } else {
            if (WORD_DATA[selectedCategory]) {
                WORD_DATA[selectedCategory].forEach(item => {
                    const uniqueId = `${selectedCategory}:${item.word}`;
                    if (!playedWords.includes(uniqueId)) {
                        candidates.push({ ...item, category: selectedCategory, uniqueId });
                    }
                });
            }
        }

        if (candidates.length === 0) {
            setNoWordsError(true);
            return;
        }

        const selection = candidates[Math.floor(Math.random() * candidates.length)];

        setActiveCategory(selection.category);
        setSecretWord(selection.word);
        setImpostorHint(selection.hint);
        setPlayedWords([...playedWords, selection.uniqueId]);

        const impostorIndices = selectRoles(players, impostorCount);
        const newPlayers = players.map((p, index) => ({
            ...p,
            role: impostorIndices.includes(index) ? 'impostor' : 'civil',
            alive: true
        }));

        const currentImpostorIds = newPlayers.filter(p => p.role === 'impostor').map(p => p.id);
        setLastImpostorIds(currentImpostorIds);

        setPlayers(newPlayers);
        setCurrentTurnIndex(0);
        setIsRevealed(false);
        setLastEliminated(null);
        setWinnerTeam(null);
        setStartingPlayerName(null);
        setPhase('distribution');
    };

    const handleNextTurn = () => {
        if (currentTurnIndex < players.length - 1) {
            setIsRevealed(false);
            setCurrentTurnIndex(currentTurnIndex + 1);
        } else {
            pickStartingPlayer(players);
            setPhase('playing');
            startTimerForRound();
        }
    };

    const updateSessionStats = (winner, currentPlayers) => {
        const newStats = { ...sessionStats };
        currentPlayers.forEach(p => {
            if (!newStats[p.id]) newStats[p.id] = { wins: 0, losses: 0, games: 0, impostorGames: 0 };
            newStats[p.id].games += 1;
            if (p.role === 'impostor') newStats[p.id].impostorGames += 1;
            const isWinner = (winner === 'civil' && p.role === 'civil') || (winner === 'impostor' && p.role === 'impostor');
            if (isWinner) newStats[p.id].wins += 1;
            else newStats[p.id].losses += 1;
        });
        setSessionStats(newStats);
    };

    const checkWinCondition = (currentPlayers) => {
        const aliveImpostors = currentPlayers.filter(p => p.alive && p.role === 'impostor').length;
        const aliveCivilians = currentPlayers.filter(p => p.alive && p.role === 'civil').length;

        if (aliveImpostors === 0) {
            setWinnerTeam('civil');
            updateSessionStats('civil', currentPlayers);
            return true;
        }
        if (aliveImpostors >= aliveCivilians) {
            setWinnerTeam('impostor');
            updateSessionStats('impostor', currentPlayers);
            return true;
        }
        return false;
    };

    const handleVote = (playerToEliminate) => {
        if (!playerToEliminate) return;
        setIsTimerRunning(false);

        const updatedPlayers = players.map(p =>
            p.id === playerToEliminate.id ? { ...p, alive: false } : p
        );
        setPlayers(updatedPlayers);
        setLastEliminated(playerToEliminate);

        const isGameOver = checkWinCondition(updatedPlayers);

        if (isGameOver) {
            setPhase('game_over');
        } else {
            setPhase('round_result');
        }
    };

    const continueGame = () => {
        pickStartingPlayer(players);
        setPhase('playing');
        setLastEliminated(null);
        startTimerForRound();
    };

    const resetGame = () => {
        setPhase('setup');
        setLastEliminated(null);
        setWinnerTeam(null);
        setTimeLeft(0);
        setIsTimerRunning(false);
    };

    return {
        phase, setPhase,
        players, addPlayer, removePlayer, updateName,
        sessionStats,
        impostorCount, setImpostorCount,
        showCategoryToImpostor, setShowCategoryToImpostor,
        showHintToImpostor, setShowHintToImpostor,
        selectedCategory, setSelectedCategory,
        playedWords, clearHistory, noWordsError, setNoWordsError,
        currentTurnIndex, isRevealed, setIsRevealed,
        secretWord, activeCategory, impostorHint,
        handleNextTurn, startGame,
        startingPlayerName,
        timeLeft, isTimerRunning, setIsTimerRunning,
        lastEliminated, winnerTeam,
        handleVote, continueGame, resetGame
    };
};
