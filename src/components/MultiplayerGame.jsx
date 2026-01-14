import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Eye, EyeOff, Skull, Crown, AlertTriangle, Settings, Check, Shield, Shuffle, Play, ArrowRight, UserX, RefreshCw, Key, MessageCircle, Copy, Loader, Wifi, Edit2 } from 'lucide-react';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { useSocket } from '../context/SocketContext';
import { WORD_DATA } from '../data/words';
import TimerDisplay from './TimerDisplay';

export default function MultiplayerGame({ onBack }) {
    const {
        roomCode, isHost, myPlayerId, players,
        phase, settings, gameData, playedWords,
        error, setError, isLoading,
        joinRoom, createRoom, updateSettings,
        startGame, nextPhase, votePlayer, endVoting, eliminatePlayer, resetGame, kickPlayer
    } = useMultiplayerGame();

    const { serverUrl, updateServerUrl } = useSocket();

    const [playerName, setPlayerName] = useState(() => localStorage.getItem('impostor_name') || '');
    const [joinCode, setJoinCode] = useState('');
    const [showUrlEdit, setShowUrlEdit] = useState(false);
    const [customUrl, setCustomUrl] = useState(serverUrl);
    const [roleRevealed, setRoleRevealed] = useState(false);

    const [localTimeLeft, setLocalTimeLeft] = useState(0);
    const [isLocalTimerRunning, setIsLocalTimerRunning] = useState(false);

    useEffect(() => {
        if (playerName) localStorage.setItem('impostor_name', playerName);
    }, [playerName]);

    useEffect(() => {
        if (!isLocalTimerRunning) return;

        const interval = setInterval(() => {
            setLocalTimeLeft(prev => {
                if (prev <= 1) {
                    setIsLocalTimerRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isLocalTimerRunning]);

    useEffect(() => {
        if (phase === 'distribution') setRoleRevealed(false);
        if (phase === 'playing') {
            setLocalTimeLeft(180);
            setIsLocalTimerRunning(true);
        } else {
            setIsLocalTimerRunning(false);
        }
    }, [phase]);

    const myPlayer = players.find(p => p.id === myPlayerId);
    const isImpostor = myPlayer?.role === 'impostor';
    const otherImpostors = players.filter(p => p.role === 'impostor' && p.id !== myPlayerId);

    const handleCreate = () => {
        if (!playerName.trim()) return setError('Ingresa tu nombre');
        createRoom(playerName);
    };

    const handleJoin = () => {
        if (!playerName.trim()) return setError('Ingresa tu nombre');
        if (!joinCode.trim()) return setError('Ingresa el código');
        joinRoom(joinCode, playerName);
    };

    const handleStartGame = () => {
        let cat = settings.category;

        let availableWordsArr = [];

        if (cat === 'Aleatorio') {
            Object.keys(WORD_DATA).forEach(c => {
                WORD_DATA[c].forEach(item => {
                    if (!playedWords.includes(item.word)) {
                        availableWordsArr.push({ ...item, category: c });
                    }
                });
            });
        } else {
            const words = WORD_DATA[cat];
            availableWordsArr = words.filter(w => !playedWords.includes(w.word)).map(item => ({ ...item, category: cat }));
        }

        if (availableWordsArr.length === 0) {
            // Fallback or Alert
            // If strictly enforced, we stop. If loose, we fallback to all words.
            setError('¡Se acabaron las palabras nuevas! Reinicia la sala para limpiar historial.');
            return;
        }

        const randomWordObj = availableWordsArr[Math.floor(Math.random() * availableWordsArr.length)];
        const secretWord = randomWordObj.word;
        const impostorHint = randomWordObj.hint;
        const activeCategory = randomWordObj.category;

        const startingPlayerIndex = Math.floor(Math.random() * players.length);

        startGame({
            secretWord,
            activeCategory,
            impostorHint,
            startingPlayerIndex,
            timer: 180
        });
    };

    if (!roomCode) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans flex flex-col items-center justify-center">
                <div className="max-w-md w-full space-y-8">
                    <header className="text-center relative">
                        <button onClick={onBack} className="absolute left-0 top-6 p-2 z-50 text-slate-500 hover:text-white transition-colors">
                            <ArrowRight size={24} className="rotate-180" />
                        </button>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 tracking-tighter uppercase drop-shadow-sm">Impostor</h1>
                        <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mt-1">Multijugador LAN</p>
                    </header>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-400 text-sm text-center font-bold animate-pulse">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-12">
                            <Loader className="animate-spin mx-auto text-purple-500 mb-4" size={48} />
                            <p className="text-slate-400">Conectando...</p>
                        </div>
                    ) : (
                        <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm space-y-6">
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-2 tracking-wider">Tu Nombre</label>
                                <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors" placeholder="Ej. Jugador 1" />
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-2 tracking-wider">Unirse a Sala</label>
                                <div className="flex gap-2">
                                    <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors uppercase tracking-widest font-mono" placeholder="CÓDIGO" maxLength={4} />
                                    <button onClick={handleJoin} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 rounded-xl transition-colors">ENTRAR</button>
                                </div>
                            </div>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-800"></div>
                                <span className="flex-shrink mx-4 text-slate-600 text-xs uppercase font-bold">O Crear Sala</span>
                                <div className="flex-grow border-t border-slate-800"></div>
                            </div>

                            <button onClick={handleCreate} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/40 hover:scale-[1.02] transition-all flex justify-center items-center gap-2">
                                <Users size={20} /> CREAR NUEVA SALA
                            </button>

                            <div className="text-center pt-4">
                                <button onClick={() => setShowUrlEdit(!showUrlEdit)} className="text-[10px] text-slate-600 flex items-center justify-center gap-1 mx-auto hover:text-slate-400">
                                    <Wifi size={10} /> {serverUrl} <Edit2 size={8} />
                                </button>
                                {showUrlEdit && (
                                    <div className="mt-2 flex gap-2">
                                        <input value={customUrl} onChange={e => setCustomUrl(e.target.value)} className="bg-slate-950 text-xs border border-slate-800 rounded p-2 flex-1 text-slate-400" />
                                        <button onClick={() => { updateServerUrl(customUrl); setShowUrlEdit(false); }} className="bg-slate-800 text-[10px] px-3 rounded text-slate-300">Guardar</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (phase === 'lobby') {
        const canStart = players.length >= 3;
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans max-w-md mx-auto flex flex-col">
                <header className="py-6 grid grid-cols-3 gap-2 items-start">
                    <div>
                        <h2 className="text-2xl font-black text-white">SALA</h2>
                        <div className="flex items-center gap-2 text-purple-400 font-mono text-xl font-bold bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/30 mt-1 cursor-pointer" onClick={() => navigator.clipboard.writeText(roomCode)}>
                            {roomCode} <Copy size={14} className="opacity-50" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Palabras Jugadas</p>
                        <p className="text-2xl font-bold text-emerald-400">{playedWords.length}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Jugadores</p>
                        <p className="text-2xl font-bold text-white">{players.length}</p>
                    </div>
                </header>

                <div className="flex-1 space-y-6 overflow-y-auto pb-20">
                    <div className="grid grid-cols-2 gap-3">
                        {players.map(p => (
                            <div key={p.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                    {p.name.charAt(0)}
                                </div>
                                <span className={`text-sm font-bold truncate ${p.id === myPlayerId ? 'text-purple-400' : 'text-slate-300'}`}>
                                    {p.name} {p.isHost && '👑'}
                                </span>
                                {isHost && !p.isHost && (
                                    <button onClick={() => kickPlayer(p.id)} className="ml-auto text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors" title="Expulsar">
                                        <UserX size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {isHost ? (
                        <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2"><Settings size={16} /> Configuración</h3>
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-2"><span>Impostores</span><span className="font-bold text-white bg-slate-800 px-2 rounded">{settings.impostorCount}</span></div>
                                <input type="range" min="1" max={Math.max(1, Math.floor((players.length - 1) / 2))} value={settings.impostorCount} onChange={(e) => updateSettings({ impostorCount: parseInt(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center justify-between cursor-pointer p-2 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="text-xs text-slate-300">Palabra de Coartada</span>
                                    <input type="checkbox" checked={settings.showHint} onChange={() => updateSettings({ showHint: !settings.showHint })} className="accent-purple-500" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer p-2 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="text-xs text-slate-300">Mostrar Categoría</span>
                                    <input type="checkbox" checked={settings.showCategory} onChange={() => updateSettings({ showCategory: !settings.showCategory })} className="accent-purple-500" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer p-2 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="text-xs text-slate-300">Votación Anónima</span>
                                    <input type="checkbox" checked={settings.anonymousVoting} onChange={() => updateSettings({ anonymousVoting: !settings.anonymousVoting })} className="accent-purple-500" />
                                </label>
                            </div>
                            <select value={settings.category} onChange={(e) => updateSettings({ category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300 text-xs">
                                <option value="Aleatorio">🎲 Aleatorio</option>
                                {Object.keys(WORD_DATA).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                            </select>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 text-sm py-4 animate-pulse">Esperando al anfitrión...</div>
                    )}
                </div>
                {isHost && (
                    <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-950/80 backdrop-blur">
                        <div className="max-w-md mx-auto">
                            <button onClick={handleStartGame} disabled={!canStart} className={`w-full font-black py-4 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-3 text-lg ${canStart ? 'bg-slate-100 text-slate-900 hover:scale-[1.02]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
                                <Play fill="currentColor" size={20} /> INICIAR JUEGO
                            </button>
                            {!canStart && <p className="text-center text-[10px] text-slate-600 mt-2">Mínimo 3 jugadores</p>}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (phase === 'distribution') {
        const secretWord = gameData?.secretWord;
        const activeCategory = gameData?.activeCategory;
        const hint = gameData?.impostorHint;

        // Safety check to prevent crash if data hasn't arrived
        if (!myPlayer || (!isImpostor && !secretWord)) {
            return (
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                    <Loader className="animate-spin mx-auto text-purple-500 mb-4" size={48} />
                    <p className="text-slate-400">Sincronizando partida...</p>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-full max-w-md">
                    <h2 className="text-slate-500 text-xs uppercase tracking-widest mb-6">Tu Identidad</h2>
                    {!roleRevealed ? (
                        <button onClick={() => setRoleRevealed(true)} className="w-64 h-64 bg-slate-800 rounded-full flex flex-col items-center justify-center mx-auto hover:bg-slate-700 transition-all border-8 border-slate-800 hover:border-purple-500/50 group shadow-2xl animate-in zoom-in duration-500">
                            <Eye size={64} className="text-slate-500 group-hover:text-white mb-4 transition-colors" />
                            <span className="text-sm font-bold text-slate-400 group-hover:text-white tracking-widest transition-colors">TOCAR PARA VER</span>
                        </button>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-300">
                            {isImpostor ? (
                                <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-3xl mb-8 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 text-red-500/10"><Skull size={150} /></div>
                                    <h2 className="text-4xl font-black text-red-500 mb-2 uppercase tracking-tighter relative z-10">Impostor</h2>
                                    <p className="text-slate-300 mb-6 text-sm font-medium relative z-10">Engaña a todos.</p>
                                    <div className="space-y-4 text-left bg-slate-950/80 p-5 rounded-xl border border-red-500/20 shadow-lg relative z-10">
                                        {otherImpostors.length > 0 && (
                                            <div className="text-red-300 text-xs font-bold">CÓMPLICES: {otherImpostors.map(p => p.name).join(', ')}</div>
                                        )}
                                        {settings.showCategory ? (
                                            <div className="text-sm text-slate-400">Categoría: <span className="text-purple-400 font-bold block text-lg">{activeCategory}</span></div>
                                        ) : (<div className="text-xs text-slate-600 flex items-center gap-2"><EyeOff size={12} /> Categoría Oculta</div>)}
                                        {settings.showHint && (
                                            <div className="text-sm text-slate-400"><span className="text-[10px] uppercase text-slate-500 font-bold">Pista</span><span className="text-emerald-400 font-black block text-2xl">"{hint}"</span></div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-500/10 border border-blue-500/30 p-8 rounded-3xl mb-8 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 text-blue-500/10"><Check size={150} /></div>
                                    <h2 className="text-4xl font-black text-blue-400 mb-2 uppercase tracking-tighter relative z-10">Civil</h2>
                                    <p className="text-slate-300 mb-6 text-sm font-medium relative z-10">Descubre al impostor.</p>
                                    <div className="bg-slate-950 p-6 rounded-xl border border-blue-500/20 shadow-lg relative z-10">
                                        <span className="text-4xl font-black text-white tracking-wider block mb-2 break-words">{secretWord}</span>
                                        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Categoría: {activeCategory}</span>
                                    </div>
                                </div>
                            )}
                            {isHost ? (
                                <button onClick={() => nextPhase('playing')} className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-xl hover:scale-[1.02] transition-transform">EMPEZAR RONDA</button>
                            ) : (
                                <p className="text-slate-500 text-sm animate-pulse">Esperando al anfitrión...</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (phase === 'playing') {
        const aliveCount = players.filter(p => p.alive).length;
        const startingPlayer = players[gameData.startingPlayerIndex];
        return (
            <div className={`min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center transition-colors duration-500 ${localTimeLeft < 10 && localTimeLeft > 0 ? 'bg-red-950/30 shadow-[inset_0_0_100px_rgba(220,38,38,0.2)]' : ''}`}>
                <div className="max-w-md w-full space-y-6">
                    <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-2xl relative flex flex-col items-center">
                        <div className="absolute top-4 right-4"><div className={`w-3 h-3 rounded-full ${isLocalTimerRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div></div>
                        <Crown size={40} className="text-purple-500 mx-auto mb-2" />
                        <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Debate</h2>
                        {startingPlayer && (
                            <div className="bg-purple-500/20 border border-purple-500/50 px-4 py-2 rounded-xl mb-4 flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1 text-purple-300 text-[10px] uppercase tracking-widest font-bold"><MessageCircle size={12} /> Empieza</div>
                                <p className="text-white text-xl font-black leading-none">{startingPlayer.name}</p>
                            </div>
                        )}
                        <TimerDisplay timeLeft={localTimeLeft} isTimerRunning={isLocalTimerRunning} setIsTimerRunning={setIsLocalTimerRunning} />
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 w-full"><p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Categoría</p><p className="text-xl font-bold text-slate-200">{gameData.activeCategory}</p></div>
                        {isHost ? (
                            <button onClick={() => nextPhase('voting')} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/30 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"><Skull size={20} /> INICIAR VOTACIÓN</button>
                        ) : (<p className="text-slate-500 text-sm">Debate en curso...</p>)}
                    </div>
                    <div className="text-xs text-slate-600 font-mono">Quedan {aliveCount} jugadores vivos.</div>
                </div>
            </div>
        );
    }

    if (phase === 'voting') {
        const isTieBreaker = gameData?.isTieBreaker;
        const candidates = gameData?.tieCandidates || [];

        // Filter players to show: normally everyone alive, but if tie-breaker only candidates
        const playersToShow = players.filter(p => p.alive);

        // If tie breaker, we still show everyone but visually dim non-candidates or just highlight candidates?
        // Let's keep showing everyone but disable voting for non-candidates to keep context.

        const myVoteTargetId = gameData?.votes?.[myPlayerId];
        const amIAlive = players.find(me => me.id === myPlayerId)?.alive;

        // Determine eligibility to vote: In tie breaker, usually everyone votes? Or only non-candidates?
        // Standard Mafia/Among Us rules: Everyone alive votes.
        const canVote = amIAlive;

        return (
            <div className="min-h-screen bg-slate-950 p-4 font-sans flex flex-col">
                <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
                    <header className="text-center py-6 mb-4">
                        <AlertTriangle size={32} className={`mx-auto mb-3 ${isTieBreaker ? 'text-yellow-500 animate-bounce' : 'text-red-500'}`} />
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                            {isTieBreaker ? '¡EMPATE! Desempate' : 'Votación'}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {isTieBreaker ? 'Vota por uno de los empatados' : 'Toca a un jugador para votar'}
                        </p>
                    </header>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {playersToShow.map(p => {
                            const isCandidate = !isTieBreaker || candidates.includes(p.id);
                            const isMyVote = myVoteTargetId === p.id;
                            const voteCount = p.votes || 0;
                            const showDetailedVotes = !settings.anonymousVoting && gameData?.votes;
                            // Check who voted for this player if detailed is on
                            const votersForThis = showDetailedVotes ? Object.keys(gameData.votes).filter(voterId => gameData.votes[voterId] === p.id) : [];

                            return (
                                <button
                                    key={p.id}
                                    onClick={() => isCandidate && votePlayer(p.id)}
                                    disabled={!canVote || !isCandidate}
                                    className={`
                                        bg-slate-900 border transition-all p-4 rounded-2xl flex flex-col items-center gap-3 relative overflow-visible
                                        ${!isCandidate ? 'opacity-30 border-slate-800' :
                                            isMyVote ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50' :
                                                'border-slate-800 hover:bg-slate-800'}
                                    `}
                                >
                                    {/* Vote Count Badge */}
                                    {voteCount > 0 && (
                                        <div className="absolute -top-2 -right-2 bg-red-600/90 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg z-10 animate-in zoom-in">
                                            {voteCount}
                                        </div>
                                    )}

                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-bold text-lg">
                                        {p.name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-slate-200 text-sm truncate w-full text-center">{p.name}</span>

                                    {/* Show voters rings (non-anonymous only) */}
                                    {showDetailedVotes && votersForThis.length > 0 && (
                                        <div className="flex -space-x-2 mt-1">
                                            {votersForThis.map(voterId => {
                                                const v = players.find(u => u.id === voterId);
                                                return v ? (
                                                    <div key={voterId} className="w-6 h-6 rounded-full bg-slate-700 border border-slate-900 flex items-center justify-center text-[8px] text-white" title={v.name}>
                                                        {v.name.charAt(0)}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto pb-6 space-y-3">
                        {/* Vote status for everyone including host */}
                        <div className="text-center p-4 bg-slate-900 rounded-xl border border-slate-800">
                            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Tu voto</p>
                            <p className="text-white font-bold">
                                {myVoteTargetId ? players.find(p => p.id === myVoteTargetId)?.name : 'Sin voto'}
                            </p>
                        </div>

                        {/* End voting button only for host */}
                        {isHost && (
                            <button
                                onClick={endVoting}
                                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/30 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <Skull size={20} /> FINALIZAR VOTACIÓN
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'round_result') {
        const lastEliminated = gameData.lastEliminated;
        const wasImpostor = lastEliminated?.role === 'impostor';
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                    <h2 className="text-slate-400 text-xs uppercase tracking-widest mb-4">Resultado</h2>
                    <div className="mb-6">
                        <div className="text-3xl font-black text-white mb-2">{lastEliminated?.name}</div>

                        <div className="relative h-12 flex items-center justify-center overflow-hidden">
                            {/* Reveal Animation */}
                            <div className="opacity-0 animate-reveal flex flex-col items-center">
                                <div className={`text-xl font-bold inline-block px-4 py-1 rounded-full ${wasImpostor ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'} shadow-[0_0_30px_rgba(255,255,255,0.1)]`}>
                                    {wasImpostor ? 'ERA EL IMPOSTOR' : 'ERA UN CIVIL'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-sm">Impostores restantes</span>
                            <div className="flex gap-1">{players.filter(p => p.alive && p.role === 'impostor').map((_, i) => (<Skull key={i} size={16} className="text-red-500" />))}</div>
                        </div>
                    </div>
                    {isHost ? (
                        <button onClick={() => nextPhase('playing')} className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">CONTINUAR JUEGO <ArrowRight size={20} /></button>
                    ) : (<p className="text-slate-500 text-sm animate-pulse">Esperando al anfitrión...</p>)}
                </div>
            </div>
        );
    }

    if (phase === 'game_over') {
        const impostorsWon = gameData.winnerTeam === 'impostor';
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-1000 ${impostorsWon ? 'bg-red-950' : 'bg-blue-950'}`}>
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 w-full max-w-md my-4 max-h-[95vh] overflow-y-auto scrollbar-hide">
                    <div className="mb-4">
                        {impostorsWon ? (<Skull size={60} className="text-red-500 mx-auto drop-shadow-lg" />) : (<Crown size={60} className="text-yellow-400 mx-auto drop-shadow-lg" />)}
                        <h2 className="text-4xl font-black text-white mt-2 uppercase tracking-tighter leading-none">{impostorsWon ? 'Impostores' : 'Civiles'}</h2>
                        <h3 className="text-lg font-light text-white/80 uppercase tracking-widest">Ganan la partida</h3>
                    </div>
                    <div className="bg-black/30 rounded-2xl p-4 mb-6 text-left border border-white/5 space-y-4">
                        <div><p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Palabra Secreta</p><p className="text-xl text-white font-bold">{gameData.secretWord}</p></div>
                        <div>
                            <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">Identidades</p>
                            <div className="space-y-2">
                                {players.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-sm">
                                        <span className={`${!p.alive ? 'line-through text-white/30' : 'text-white/90'}`}>{p.name}</span>
                                        <span className={`font-bold text-xs px-2 py-0.5 rounded ${p.role === 'impostor' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{p.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {isHost ? (
                        <button onClick={resetGame} className="w-full bg-white text-slate-900 font-black py-4 rounded-xl shadow-lg hover:bg-slate-200 transition-colors uppercase tracking-wide flex items-center justify-center gap-2"><RefreshCw size={20} /> Jugar Otra Vez</button>
                    ) : (
                        <div className="text-center"><p className="text-slate-400 text-sm mb-4">Esperando al anfitrión...</p><button onClick={() => window.location.reload()} className="text-xs text-white/50 border-b border-white/20 pb-1">Salir al menú</button></div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
