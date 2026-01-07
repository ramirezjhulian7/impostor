import React from 'react';
import { BarChart2 } from 'lucide-react';

const StatsBoard = ({ players, sessionStats }) => (
    <div className="w-full bg-slate-900/80 rounded-2xl p-4 border border-slate-800 mb-6">
        <h3 className="text-slate-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
            <BarChart2 size={14} /> Estadísticas de Sesión
        </h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                    <tr>
                        <th className="px-3 py-2">Jugador</th>
                        <th className="px-3 py-2 text-center">Wins</th>
                        <th className="px-3 py-2 text-center">% Win</th>
                        <th className="px-3 py-2 text-center">Rol</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {players.map(p => {
                        const stats = sessionStats[p.id] || { wins: 0, games: 0, impostorGames: 0 };
                        const winRate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
                        const roleRatio = stats.games > 0 ?
                            (stats.impostorGames > (stats.games / 2) ? '😈' : '🕵️') : '-';

                        return (
                            <tr key={p.id} className="bg-slate-900/30">
                                <td className="px-3 py-2 font-medium text-slate-200">{p.name}</td>
                                <td className="px-3 py-2 text-center text-emerald-400 font-bold">{stats.wins}</td>
                                <td className="px-3 py-2 text-center text-slate-400">{winRate}%</td>
                                <td className="px-3 py-2 text-center text-lg">{roleRatio}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        <p className="text-[10px] text-slate-600 mt-2 text-center italic">
            😈 = Suele ser Impostor | 🕵️ = Suele ser Civil
        </p>
    </div>
);

export default StatsBoard;
