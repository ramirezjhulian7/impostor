import React, { useState } from 'react';
import { Smartphone, Users, Wifi } from 'lucide-react';
import { SocketProvider } from './context/SocketContext';
import LocalGame from './components/LocalGame';
import MultiplayerGame from './components/MultiplayerGame';

function ModeSelector({ onSelectMode }) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans flex flex-col items-center justify-center selection:bg-indigo-500/30">
            <div className="max-w-md w-full space-y-8">
                <header className="text-center space-y-2">
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 tracking-tighter uppercase drop-shadow-sm">Impostor</h1>
                    <p className="text-slate-500 text-sm font-bold tracking-widest uppercase">Selecciona tu modo de juego</p>
                </header>

                <div className="grid gap-4">
                    <button
                        onClick={() => onSelectMode('local')}
                        className="group relative overflow-hidden bg-slate-900 hover:bg-slate-800 p-6 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-all text-left shadow-xl"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Smartphone size={100} />
                        </div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="bg-indigo-500/20 p-3 rounded-2xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                <Smartphone size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Pass & Play</h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">Un solo dispositivo. Pásalo a tus amigos para ver su rol.</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelectMode('online')}
                        className="group relative overflow-hidden bg-slate-900 hover:bg-slate-800 p-6 rounded-3xl border border-slate-800 hover:border-purple-500/50 transition-all text-left shadow-xl"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wifi size={100} />
                        </div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="bg-purple-500/20 p-3 rounded-2xl text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <Users size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Multijugador LAN</h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">Cada uno en su celular. Conéctate a la misma red WiFi.</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [gameMode, setGameMode] = useState(null); // 'local' | 'online' | null

    return (
        <SocketProvider>
            {gameMode === 'local' ? (
                <LocalGame onBack={() => setGameMode(null)} />
            ) : gameMode === 'online' ? (
                <MultiplayerGame onBack={() => setGameMode(null)} />
            ) : (
                <ModeSelector onSelectMode={setGameMode} />
            )}
        </SocketProvider>
    );
}
