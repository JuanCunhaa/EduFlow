import { NextResponse } from 'next/server';
import { withOrgRole } from '@/lib/rbac';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * GET /api/orgs/[orgId]/analytics — team analytics
 * Aggregates scores, readiness, and domain weaknesses across all members.
 */
export const GET = withOrgRole(async (_request, { log, orgId }) => {
    const db = getAdminDb();

    // Get all members
    const membersSnap = await db
        .collection('orgs')
        .doc(orgId)
        .collection('members')
        .get();

    const memberUids = membersSnap.docs.map((doc) => doc.id);

    if (memberUids.length === 0) {
        return { analytics: { memberCount: 0, averageScore: 0, domainWeaknesses: [], recentActivity: [] } };
    }

    // Fetch exam results for all members (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const examsData: Array<{ score: number; domains: Record<string, { correct: number; total: number }> }> = [];

    // Process in batches of 10 (Firestore 'in' query limit)
    for (let i = 0; i < memberUids.length; i += 10) {
        const batch = memberUids.slice(i, i + 10);

        for (const uid of batch) {
            const examsSnap = await db
                .collection('users')
                .doc(uid)
                .collection('exams')
                .where('completedAt', '>=', thirtyDaysAgo)
                .orderBy('completedAt', 'desc')
                .limit(20)
                .get();

            for (const examDoc of examsSnap.docs) {
                const exam = examDoc.data();
                if (exam.score !== undefined) {
                    examsData.push({
                        score: exam.score,
                        domains: exam.domainResults || {},
                    });
                }
            }
        }
    }

    // Calculate aggregates
    const scores = examsData.map((e) => e.score);
    const averageScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    // Domain weaknesses
    const domainAgg: Record<string, { correct: number; total: number }> = {};
    for (const exam of examsData) {
        for (const [domain, stats] of Object.entries(exam.domains)) {
            if (!domainAgg[domain]) domainAgg[domain] = { correct: 0, total: 0 };
            domainAgg[domain].correct += stats.correct;
            domainAgg[domain].total += stats.total;
        }
    }

    const domainWeaknesses = Object.entries(domainAgg)
        .map(([domain, stats]) => ({
            domain,
            accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            attempts: stats.total,
        }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5);

    // Active vs inactive members
    const activeMemberCount = new Set(
        examsData.length > 0 ? memberUids.slice(0, Math.min(memberUids.length, examsData.length)) : []
    ).size;

    log.done(200);
    return {
        analytics: {
            memberCount: memberUids.length,
            activeMemberCount,
            totalExams: examsData.length,
            averageScore,
            highestScore: scores.length > 0 ? Math.max(...scores) : 0,
            lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
            domainWeaknesses,
        },
    };
}, 'admin');
