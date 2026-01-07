import React from 'react';
import { Clock, Play, Pause } from 'lucide-react';
import { formatTime } from '../utils/helpers';

const TimerDisplay = ({ timeLeft, isTimerRunning, setIsTimerRunning }) => (
    <div className={`flex items-center gap-3 px-6 py-3 rounded-full border-2 mb-4 transition-all ${timeLeft <= 10 && timeLeft > 0 ? 'bg-red-500/20 border-red-500 animate-pulse' : 'bg-slate-900 border-slate-700'}`}>
        <Clock size={24} className={timeLeft <= 10 ? 'text-red-500' : 'text-indigo-400'} />
        <span className={`text-3xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
            {formatTime(timeLeft)}
        </span>
        <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="ml-2 bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition-colors"
        >
            {isTimerRunning ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
        </button>
    </div>
);

export default TimerDisplay;
