import React from 'react';
import { Users, UserPlus, Eye, EyeOff, Skull, Crown, AlertTriangle, Settings, Check, Shield, Shuffle, Play, ArrowRight, UserX, RefreshCw, Key, Database, Trash2, MessageCircle } from 'lucide-react';
import { useImpostorGame } from './hooks/useImpostorGame';
import TimerDisplay from './components/TimerDisplay';
import StatsBoard from './components/StatsBoard';
import { WORD_DATA } from './data/words';

export default function ImpostorGame() {
    const {
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
    } = useImpostorGame();

    if (phase === 'setup') {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans selection:bg-indigo-500/30">
                <div className="max-w-md mx-auto space-y-6">
                    <header className="text-center py-6 relative">
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter uppercase drop-shadow-sm">Impostor</h1>
                        <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mt-1">Modo Timer & Stats</p>
                        {playedWords.length > 0 && (
                            <div className="mt-2 text-[10px] text-slate-600 font-mono">
                                {playedWords.length} palabras jugadas
                            </div>
                        )}
                    </header>

                    {noWordsError ? (
                        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-3xl text-center space-y-4 animate-in fade-in zoom-in duration-300">
                            <Database size={48} className="mx-auto text-red-400" />
                            <h3 className="text-xl font-bold text-white">¡Mazo Agotado!</h3>
                            <div className="grid gap-3">
                                <button onClick={clearHistory} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                                    <Trash2 size={18} /> Barajar de Nuevo
                                </button>
                                <button onClick={() => setNoWordsError(false)} className="w-full bg-transparent border border-slate-700 text-slate-400 font-bold py-3 rounded-xl hover:bg-slate-900">
                                    Cambiar Configuración
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                                        <Users size={18} className="text-indigo-400" /> Jugadores
                                    </h2>
                                    <span className="bg-slate-800 px-3 py-1 rounded-full text-xs font-mono text-slate-400">{players.length}</span>
                                </div>
                                <div className="space-y-2 max-h-52 overflow-y-auto mb-4 pr-1 scrollbar-thin">
                                    {players.map((p) => (
                                        <div key={p.id} className="flex gap-2 group">
                                            <input type="text" value={p.name} onChange={(e) => updateName(p.id, e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                            {players.length > 3 && (
                                                <button onClick={() => removePlayer(p.id)} className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 px-3 rounded-xl transition-colors">
                                                    <UserX size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addPlayer} className="w-full py-3 border border-dashed border-slate-700 text-slate-500 rounded-xl hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex justify-center items-center gap-2 text-sm font-bold">
                                    <UserPlus size={16} /> Agregar Jugador
                                </button>
                            </div>

                            <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm space-y-6">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                                    <Settings size={18} className="text-cyan-500" /> Reglas
                                </h2>
                                <div>
                                    <div className="flex justify-between text-sm text-slate-400 mb-3">
                                        <span>Impostores</span>
                                        <span className="font-bold text-white bg-slate-800 px-2 rounded">{impostorCount}</span>
                                    </div>
                                    <input type="range" min="1" max={Math.max(1, Math.floor((players.length - 1) / 2))} value={impostorCount} onChange={(e) => setImpostorCount(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                        <span className="text-sm flex items-center gap-2 text-slate-300"><Shield size={16} className="text-emerald-400" /> Palabra de Coartada</span>
                                        <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${showHintToImpostor ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${showHintToImpostor ? 'translate-x-4' : ''}`}></div>
                                            <input type="checkbox" checked={showHintToImpostor} onChange={() => setShowHintToImpostor(!showHintToImpostor)} className="hidden" />
                                        </div>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                        <span className="text-sm flex items-center gap-2 text-slate-300"><Shuffle size={16} className="text-indigo-400" /> Categoría al Impostor</span>
                                        <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${showCategoryToImpostor ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${showCategoryToImpostor ? 'translate-x-4' : ''}`}></div>
                                            <input type="checkbox" checked={showCategoryToImpostor} onChange={() => setShowCategoryToImpostor(!showCategoryToImpostor)} className="hidden" />
                                        </div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-slate-500 mb-2 tracking-wider">Categoría</label>
                                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm">
                                        <option value="Aleatorio">🎲 Aleatorio (Mezcla Todo)</option>
                                        {Object.keys(WORD_DATA).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                    </select>
                                </div>
                            </div>
                            <button onClick={startGame} className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-2xl shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center gap-3 text-lg">
                                <Play fill="currentColor" size={20} /> JUGAR
                            </button>
                        </>
                    )}
                    {Object.keys(sessionStats).length > 0 && (
                        <button onClick={clearHistory} className="text-slate-600 text-xs w-full hover:text-red-400 transition-colors flex items-center justify-center gap-1">
                            <RefreshCw size={10} /> Reiniciar estadísticas globales
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Distribution Phase
    if (phase === 'distribution') {
        const currentPlayer = players[currentTurnIndex];
        const otherImpostors = players.filter(p => p.role === 'impostor' && p.id !== currentPlayer.id);

        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-full max-w-md bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full">
                        <div className="h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${((currentTurnIndex) / players.length) * 100}%` }}></div>
                    </div>
                    <div className="mt-8 mb-10">
                        <h3 className="text-slate-500 text-xs uppercase tracking-widest mb-3">Turno de</h3>
                        <h2 className="text-4xl font-black text-white tracking-tight">{currentPlayer.name}</h2>
                    </div>
                    {!isRevealed ? (
                        <button onClick={() => setIsRevealed(true)} className="w-48 h-48 bg-slate-800 rounded-full flex flex-col items-center justify-center mx-auto hover:bg-slate-700 transition-all border-8 border-slate-800 hover:border-indigo-500/50 group shadow-inner">
                            <Eye size={48} className="text-slate-500 group-hover:text-white mb-3 transition-colors" />
                            <span className="text-xs font-bold text-slate-400 group-hover:text-white tracking-widest transition-colors">TOCAR PARA VER</span>
                        </button>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-300">
                            {currentPlayer.role === 'impostor' ? (
                                <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl mb-8 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 text-red-500/10"><Skull size={150} /></div>
                                    <div className="relative z-10">
                                        <h2 className="text-3xl font-black text-red-500 mb-2 uppercase tracking-tighter">Impostor</h2>
                                        <p className="text-slate-300 mb-6 text-sm font-medium">Todos te miran. Miente.</p>
                                        <div className="space-y-4 text-left bg-slate-950/80 p-5 rounded-xl border border-red-500/20 shadow-lg">

                                            {/* SECCIÓN DE CÓMPLICES */}
                                            {otherImpostors.length > 0 && (
                                                <div className="mb-4 bg-red-950/50 p-3 rounded-lg border border-red-500/20">
                                                    <div className="flex items-center gap-2 text-red-300 text-[10px] uppercase font-bold mb-1">
                                                        <Users size={12} /> Tienes cómplices
                                                    </div>
                                                    <p className="text-white font-bold text-sm">
                                                        {otherImpostors.map(p => p.name).join(', ')}
                                                    </p>
                                                </div>
                                            )}

                                            {showCategoryToImpostor ? (
                                                <div className="text-sm text-slate-400">Categoría: <span className="text-indigo-400 font-bold block text-lg">{activeCategory}</span></div>
                                            ) : (<div className="text-sm text-slate-600 flex items-center gap-2"><EyeOff size={14} /> Categoría Oculta</div>)}

                                            <div className="h-px bg-slate-800 my-2"></div>

                                            {showHintToImpostor ? (
                                                <div className="text-sm text-slate-400">
                                                    <span className="flex items-center gap-2 mb-1 text-slate-500 text-[10px] uppercase tracking-wider font-bold"><Key size={12} /> Coartada Sugerida</span>
                                                    <span className="text-emerald-400 font-black block text-3xl tracking-wide">"{impostorHint}"</span>
                                                </div>
                                            ) : (<div className="text-sm text-slate-600 flex items-center gap-2"><EyeOff size={14} /> Coartada Oculta</div>)}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-500/10 border border-blue-500/30 p-8 rounded-2xl mb-8 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 text-blue-500/10"><Check size={150} /></div>
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black text-blue-400 mb-1 uppercase tracking-tighter">Civil</h2>
                                        <p className="text-slate-400 text-xs uppercase mb-4 tracking-widest">Memoriza esto</p>
                                        <div className="bg-slate-950 p-6 rounded-xl border border-blue-500/20 shadow-lg">
                                            <span className="text-3xl font-black text-white tracking-wider block mb-2 break-words">{secretWord}</span>
                                            <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Categoría: {activeCategory}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button onClick={handleNextTurn} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700">
                                <EyeOff size={18} /> OCULTAR Y PASAR
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Playing Phase with TIMER & WHO STARTS
    if (phase === 'playing') {
        const aliveCount = players.filter(p => p.alive).length;
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full space-y-6">
                    <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-2xl relative flex flex-col items-center">

                        <div className="absolute top-4 right-4">
                            <div className={`w-3 h-3 rounded-full ${isTimerRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        </div>

                        <Crown size={40} className="text-indigo-500 mx-auto mb-2" />
                        <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Debate</h2>

                        {/* WHO STARTS */}
                        {startingPlayerName && (
                            <div className="bg-indigo-500/20 border border-indigo-500/50 px-4 py-2 rounded-xl mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1 text-indigo-300 text-[10px] uppercase tracking-widest font-bold">
                                    <MessageCircle size={12} /> Empieza hablando
                                </div>
                                <p className="text-white text-xl font-black leading-none">{startingPlayerName}</p>
                            </div>
                        )}

                        {/* TIMER */}
                        <TimerDisplay
                            timeLeft={timeLeft}
                            isTimerRunning={isTimerRunning}
                            setIsTimerRunning={setIsTimerRunning}
                        />

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 w-full">
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Categoría Pública</p>
                            <p className="text-xl font-bold text-slate-200">{activeCategory}</p>
                        </div>

                        <button
                            onClick={() => setPhase('voting')}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/30 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            <Skull size={20} /> VOTAR ELIMINACIÓN
                        </button>
                    </div>

                    <div className="text-xs text-slate-600 font-mono">
                        Quedan {aliveCount} jugadores vivos.
                    </div>
                </div>
            </div>
        );
    }

    // Voting Phase
    if (phase === 'voting') {
        const alivePlayers = players.filter(p => p.alive);
        return (
            <div className="min-h-screen bg-slate-950 p-4 font-sans flex flex-col">
                <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
                    <header className="text-center py-6 mb-4">
                        <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Votación</h2>
                        <p className="text-slate-400 text-sm">Toca para eliminar</p>
                    </header>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {alivePlayers.map(p => (
                            <button key={p.id} onClick={() => handleVote(p)} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-red-500/50 p-4 rounded-2xl transition-all group flex flex-col items-center gap-3 relative overflow-hidden">
                                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-bold text-lg group-hover:bg-red-500 group-hover:text-white transition-colors">{p.name.charAt(0)}</div>
                                <span className="font-bold text-slate-200 text-sm truncate w-full text-center">{p.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-auto pb-6">
                        <button onClick={() => { setPhase('playing'); setIsTimerRunning(true); }} className="w-full bg-transparent border border-slate-700 text-slate-400 font-bold py-3 rounded-xl hover:bg-slate-900 text-sm">
                            Cancelar y Volver al Debate
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Round Result
    if (phase === 'round_result') {
        const wasImpostor = lastEliminated.role === 'impostor';
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                    <h2 className="text-slate-400 text-xs uppercase tracking-widest mb-4">Resultado</h2>
                    <div className="mb-6">
                        <div className="text-3xl font-black text-white mb-2">{lastEliminated.name}</div>
                        <div className={`text-xl font-bold inline-block px-4 py-1 rounded-full ${wasImpostor ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'}`}>
                            {wasImpostor ? 'ERA EL IMPOSTOR' : 'ERA UN CIVIL'}
                        </div>
                    </div>
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-sm">Impostores restantes</span>
                            <div className="flex gap-1">
                                {players.filter(p => p.alive && p.role === 'impostor').map((_, i) => (
                                    <Skull key={i} size={16} className="text-red-500" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={continueGame} className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                        CONTINUAR JUEGO <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'game_over') {
        const impostorsWon = winnerTeam === 'impostor';
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-1000 ${impostorsWon ? 'bg-red-950' : 'bg-blue-950'}`}>
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 w-full max-w-md my-4 max-h-[95vh] overflow-y-auto scrollbar-hide">
                    <div className="mb-4">
                        {impostorsWon ? (
                            <Skull size={60} className="text-red-500 mx-auto drop-shadow-lg" />
                        ) : (
                            <Crown size={60} className="text-yellow-400 mx-auto drop-shadow-lg" />
                        )}
                        <h2 className="text-4xl font-black text-white mt-2 uppercase tracking-tighter leading-none">
                            {impostorsWon ? 'Impostores' : 'Civiles'}
                        </h2>
                        <h3 className="text-lg font-light text-white/80 uppercase tracking-widest">
                            Ganan la partida
                        </h3>
                    </div>

                    <div className="bg-black/30 rounded-2xl p-4 mb-6 text-left border border-white/5 space-y-4">
                        <div>
                            <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Palabra Secreta</p>
                            <p className="text-xl text-white font-bold">{secretWord}</p>
                        </div>

                        <StatsBoard players={players} sessionStats={sessionStats} />

                        <div>
                            <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">Identidades esta ronda</p>
                            <div className="space-y-2">
                                {players.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-sm">
                                        <span className={`${!p.alive ? 'line-through text-white/30' : 'text-white/90'}`}>{p.name}</span>
                                        <span className={`font-bold text-xs px-2 py-0.5 rounded ${p.role === 'impostor' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {p.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button onClick={resetGame} className="w-full bg-white text-slate-900 font-black py-4 rounded-xl shadow-lg hover:bg-slate-200 transition-colors uppercase tracking-wide flex items-center justify-center gap-2">
                        <RefreshCw size={20} /> Jugar Otra Vez
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
