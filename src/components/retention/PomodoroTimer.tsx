'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { useTranslations } from 'next-intl';

type TimerPhase = 'focus' | 'break';

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

function formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function PomodoroTimer() {
    const t = useTranslations('pomodoro');
    const [phase, setPhase] = useState<TimerPhase>('focus');
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(FOCUS_MINUTES * 60);
    const [completedSessions, setCompletedSessions] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const totalSeconds = phase === 'focus' ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60;
    const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

    const switchPhase = useCallback((newPhase: TimerPhase) => {
        setPhase(newPhase);
        setTimeLeft(newPhase === 'focus' ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60);
        setIsRunning(false);
    }, []);

    useEffect(() => {
        if (!isRunning) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRunning(false);
                    if (phase === 'focus') {
                        setCompletedSessions(s => s + 1);
                        // Auto-switch to break
                        setTimeout(() => switchPhase('break'), 100);
                    } else {
                        setTimeout(() => switchPhase('focus'), 100);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, phase, switchPhase]);

    function handleReset() {
        setIsRunning(false);
        setTimeLeft(phase === 'focus' ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60);
    }

    return (
        <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground">{t('title')}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-mono">{completedSessions}</span> {t('sessions', { count: completedSessions })}
                </div>
            </div>

            {/* Phase indicator */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={() => switchPhase('focus')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        phase === 'focus'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('focus')}
                </button>
                <button
                    onClick={() => switchPhase('break')}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        phase === 'break'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Coffee className="h-3 w-3" /> {t('break')}
                </button>
            </div>

            {/* Timer display */}
            <div className="relative flex items-center justify-center mb-4">
                {/* Progress ring */}
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50" cy="50" r="44"
                        fill="none"
                        className="stroke-muted/30"
                        strokeWidth="4"
                    />
                    <circle
                        cx="50" cy="50" r="44"
                        fill="none"
                        className={phase === 'focus' ? 'stroke-primary' : 'stroke-emerald-400'}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 44}`}
                        strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-3xl font-bold text-foreground">
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={handleReset}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title={t('reset')}
                >
                    <RotateCcw className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                        isRunning
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20'
                    }`}
                    title={isRunning ? t('pause') : t('start')}
                >
                    {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </button>
            </div>
        </div>
    );
}
