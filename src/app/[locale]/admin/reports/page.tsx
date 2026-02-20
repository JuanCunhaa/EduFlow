'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { usePlan } from '@/hooks/usePlan';
import { useToast } from '@/components/ui/Toast';
import { Loader2, CheckCircle, XCircle, Archive, AlertCircle } from 'lucide-react';

export default function AdminReportsPage() {
    const { isAdmin, isLoading: planLoading } = usePlan();
    const { addToast } = useToast();

    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('open');

    const fetchReports = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/reports?status=${statusFilter}&limit=50`);
            if (res.ok) {
                const data = await res.json();
                setReports(data.data || []);
            } else {
                addToast('Error fetching reports', 'error');
            }
        } catch (err) {
            addToast('Fetch failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!planLoading) {
            fetchReports();
        }
    }, [isAdmin, planLoading, statusFilter]);

    const handleResolve = async (reportId: string, status: string) => {
        const resolution = globalThis.prompt(`Enter resolution notes for ${status}:`);
        if (resolution === null) return; // cancelled

        setResolvingId(reportId);
        try {
            const res = await fetch(`/api/reports/${reportId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, resolution }),
            });

            if (res.ok) {
                addToast('Report resolved successfully', 'success');
                fetchReports();
            } else {
                const err = await res.json().catch(() => ({}));
                addToast(`Error resolving report: ${err.error || 'Unknown error'}`, 'error');
            }
        } catch (err) {
            addToast('Resolution failed', 'error');
        } finally {
            setResolvingId(null);
        }
    };

    if (planLoading || loading) {
        return (
            <Shell>
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Shell>
        );
    }

    if (!isAdmin) {
        return (
            <Shell>
                <div className="p-6 text-center text-muted-foreground">Access denied. Admins only.</div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="mx-auto max-w-5xl space-y-8 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Reported Questions</h1>
                    <p className="text-muted-foreground">Manage user reports for marketplace and study questions.</p>
                </div>

                <div className="flex items-center gap-4 border-b border-border pb-4">
                    <label htmlFor="status-filter" className="text-sm font-medium text-foreground">Filter by Status:</label>
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border-border bg-card text-foreground focus:border-primary/50 focus:ring-primary/30 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1"
                    >
                        <option value="">All</option>
                        <option value="open">Open</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="resolved_fixed">Resolved (Fixed)</option>
                        <option value="resolved_rejected">Resolved (Rejected)</option>
                        <option value="resolved_archived">Resolved (Archived)</option>
                    </select>
                </div>

                {reports.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto h-8 w-8 mb-4 opacity-50" />
                        <p>No reports found for this filter.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div key={report.id} className="rounded-lg border border-border bg-card p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                                                {report.reason.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Status: <span className="text-foreground capitalize">{report.status.replace('_', ' ')}</span>
                                            </span>
                                        </div>
                                        <h3 className="text-base flex items-center gap-2 font-medium text-foreground">
                                            Question: <span className="font-mono text-xs">{report.questionId}</span>
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-2">{report.description}</p>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        <p>Reporter: {report.reportedBy}</p>
                                        <p>Date: {report.createdAt?._seconds ? new Date(report.createdAt._seconds * 1000).toLocaleDateString() : 'Unknown date'}</p>
                                    </div>
                                </div>

                                {report.resolution && (
                                    <div className="bg-muted p-3 rounded-md border border-border">
                                        <p className="text-xs text-muted-foreground mb-1"><strong>Resolution:</strong> (by {report.resolvedBy})</p>
                                        <p className="text-sm text-foreground">{report.resolution}</p>
                                    </div>
                                )}

                                {report.status === 'open' && (
                                    <div className="flex items-center gap-3 pt-4 border-t border-border">
                                        <button
                                            disabled={resolvingId === report.id}
                                            onClick={() => handleResolve(report.id, 'resolved_fixed')}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                                        >
                                            {resolvingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                            Fixed
                                        </button>
                                        <button
                                            disabled={resolvingId === report.id}
                                            onClick={() => handleResolve(report.id, 'resolved_rejected')}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                                        >
                                            {resolvingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                            Reject
                                        </button>
                                        <button
                                            disabled={resolvingId === report.id}
                                            onClick={() => handleResolve(report.id, 'resolved_archived')}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                                        >
                                            {resolvingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                            Archived
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Shell>
    );
}
