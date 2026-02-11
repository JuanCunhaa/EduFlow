'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    examId?: string;
    /** i18n labels — injected by parent since class components can't use hooks */
    labels?: {
        title: string;
        description: string;
        resume: string;
        backToExams: string;
    };
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * P2 #11: Error boundary wrapping the ExamSession component.
 * If an error occurs mid-exam, it shows a recovery prompt instead of
 * crashing to the root error page and losing session state.
 */
export class ExamErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ExamErrorBoundary caught:', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    handleGoBack = () => {
        window.location.href = '/exams';
    };

    render() {
        if (this.state.hasError) {
            const labels = this.props.labels || {
                title: 'Something went wrong during your exam',
                description: "Don't worry — your answers are saved. You can try resuming or go back to exams.",
                resume: 'Try to Resume',
                backToExams: 'Back to Exams',
            };
            return (
                <div className="flex flex-col items-center gap-6 py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
                        <AlertTriangle className="h-8 w-8 text-yellow-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">
                            {labels.title}
                        </h2>
                        <p className="mt-2 max-w-md text-sm text-muted-foreground">
                            {labels.description}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleRetry}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            {labels.resume}
                        </button>
                        <button
                            onClick={this.handleGoBack}
                            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            {labels.backToExams}
                        </button>
                    </div>
                    {this.state.error && (
                        <p className="text-xs text-muted-foreground/60">
                            {this.state.error.message}
                        </p>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
