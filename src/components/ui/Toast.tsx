'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

const ICONS: Record<ToastType, React.ElementType> = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const STYLES: Record<ToastType, string> = {
    success: 'border-emerald-500/20 text-emerald-400',
    error: 'border-red-500/20 text-red-400',
    warning: 'border-amber-500/20 text-amber-400',
    info: 'border-primary/20 text-primary',
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = nextId++;
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {/* Toast container */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
    const Icon = ICONS[toast.type];
    const style = STYLES[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    return (
        <div
            className={`flex items-center gap-3 rounded-xl border glass-panel px-4 py-3 shadow-xl animate-slide-up ${style}`}
            role="alert"
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium text-foreground">{toast.message}</span>
            <button
                onClick={() => onDismiss(toast.id)}
                className="ml-2 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
