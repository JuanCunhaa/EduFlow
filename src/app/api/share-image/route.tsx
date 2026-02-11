import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase/server-auth';
import { getStats } from '@/services/stats-service';
import { getStudy } from '@/services/study-service';
import { getAdminAuth } from '@/lib/firebase/admin';

/**
 * GET /api/share-image?studyId=xxx&name=Juan
 * Generates a shareable progress card as a 1200x630 PNG image.
 * Shows: study name, streak, accuracy, badge count, daily goal progress.
 * Privacy: uses ?name= param, falls back to Firebase displayName, never email.
 */
export async function GET(request: Request) {
    // ── Auth ──
    const user = await verifyAuth();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    const customName = searchParams.get('name');

    if (!studyId) {
        return NextResponse.json({ error: 'studyId is required' }, { status: 400 });
    }

    const [stats, study, firebaseUser] = await Promise.all([
        getStats(user.uid),
        getStudy(user.uid, studyId),
        getAdminAuth().getUser(user.uid).catch(() => null),
    ]);

    // Privacy: user-chosen name → Firebase displayName → 'Student' (never email)
    const displayName = customName || firebaseUser?.displayName || 'Student';

    // Calculate today's goal progress
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = stats.recentDays.find(d => d.date === today);
    const todayAnswered = todayRecord?.questionsAnswered ?? 0;
    const goalPercent = Math.min(100, Math.round((todayAnswered / stats.dailyGoal) * 100));

    // Calculate overall accuracy from recent 30 days
    const totalCorrect = stats.recentDays.reduce((sum, d) => sum + d.correctAnswers, 0);
    const totalAnswered = stats.recentDays.reduce((sum, d) => sum + d.questionsAnswered, 0);
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
                    padding: '48px',
                    fontFamily: 'system-ui, sans-serif',
                    color: '#f8fafc',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '32px',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                            style={{
                                fontSize: '18px',
                                color: '#94a3b8',
                                letterSpacing: '2px',
                                textTransform: 'uppercase' as const,
                            }}
                        >
                            Study Progress
                        </div>
                        <div
                            style={{
                                fontSize: '36px',
                                fontWeight: 700,
                                marginTop: '4px',
                            }}
                        >
                            {study.abbreviation} — {study.name}
                        </div>
                    </div>
                    <div style={{ display: 'flex', fontSize: '14px', color: '#64748b' }}>
                        EduFlow
                    </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
                    {/* Streak */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '14px', color: '#94a3b8' }}>🔥 Streak</div>
                        <div style={{ fontSize: '48px', fontWeight: 700, color: '#f97316' }}>
                            {stats.currentStreak}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                            days · best {stats.longestStreak}
                        </div>
                    </div>

                    {/* Accuracy */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '14px', color: '#94a3b8' }}>🎯 Accuracy</div>
                        <div style={{ fontSize: '48px', fontWeight: 700, color: '#22c55e' }}>
                            {accuracy}%
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                            {stats.totalQuestionsAnswered} questions
                        </div>
                    </div>

                    {/* Badges */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '14px', color: '#94a3b8' }}>🏅 Badges</div>
                        <div style={{ fontSize: '48px', fontWeight: 700, color: '#a78bfa' }}>
                            {stats.badges.length}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                            earned · {stats.totalExamsCompleted} exams
                        </div>
                    </div>

                    {/* Daily Goal */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '14px', color: '#94a3b8' }}>📈 Daily Goal</div>
                        <div style={{ fontSize: '48px', fontWeight: 700, color: '#38bdf8' }}>
                            {goalPercent}%
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                            {todayAnswered}/{stats.dailyGoal} today
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'auto',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                        {displayName}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                        {new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </div>
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
