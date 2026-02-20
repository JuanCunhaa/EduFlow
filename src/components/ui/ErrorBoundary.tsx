'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    /** Optional custom fallback. Receives reset function. */
    fallback?: (reset: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

/**
 * ErrorBoundary — catches render errors in child subtrees.
 * Prevents a single broken section from crashing the full page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <RiskyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message };
    }

    reset = () => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback(this.reset);
            }

            return (
                <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
                    <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-xl">
                        <AlertTriangle className="text-destructive h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-foreground text-sm font-semibold">
                            Something went wrong
                        </h3>
                        <p className="text-muted-foreground text-xs">
                            This section failed to load. Your data is safe.
                        </p>
                    </div>
                    <button
                        onClick={this.reset}
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
