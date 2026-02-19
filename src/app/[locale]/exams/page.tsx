'use client';

import { useReducer, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/layout/Shell';
import { ExamSession } from '@/components/exams/ExamSession';
import { ExamResults } from '@/components/exams/ExamResults';
import { ExamErrorBoundary } from '@/components/exams/ExamErrorBoundary';
import dynamic from 'next/dynamic';

const ExamConfigForm = dynamic(
  () =>
    import('@/components/exams/ExamConfigForm').then((m) => ({
      default: m.ExamConfigForm,
    })),
  { ssr: false }
);
import { createExam, saveAnswer, submitExam } from '@/hooks/useExams';
import { useStudies } from '@/hooks/useStudies';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import type { Difficulty, ExamMode } from '@/types';

interface SessionQuestion {
  id: string;
  text: string;
  options: Array<{ label: string; text: string }>;
  domainIds: string[];
  difficulty: string;
}

interface ActiveExam {
  id: string;
  studyId: string;
  studyName: string;
  timeLimitMinutes: number;
  initialTimeRemaining?: number;
  questions: SessionQuestion[];
  answers: Record<string, number | null>;
}

interface ExamResultData {
  examId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  domainScores: Record<
    string,
    { correct: number; total: number; percentage: number }
  >;
  studyName: string;
  newBadges: string[];
}

type ExamPhase =
  | 'config'
  | 'creating'
  | 'session'
  | 'submitting'
  | 'results'
  | 'checking-resume';

interface ExamState {
  phase: ExamPhase;
  activeExam: ActiveExam | null;
  results: ExamResultData | null;
  error: string | null;
}

type ExamAction =
  | { type: 'START_CREATING' }
  | { type: 'EXAM_CREATED'; exam: ActiveExam }
  | { type: 'ANSWER'; questionId: string; optionIndex: number }
  | { type: 'START_SUBMITTING' }
  | { type: 'EXAM_SUBMITTED'; results: ExamResultData }
  | { type: 'RESET' }
  | { type: 'RESUME_EXAM'; exam: ActiveExam }
  | { type: 'SET_CHECKING_RESUME' }
  | { type: 'NO_RESUME_FOUND' }
  | { type: 'ERROR'; message: string };

function examReducer(state: ExamState, action: ExamAction): ExamState {
  switch (action.type) {
    case 'SET_CHECKING_RESUME':
      return { ...state, phase: 'checking-resume' };
    case 'NO_RESUME_FOUND':
      return { ...state, phase: 'config' };
    case 'START_CREATING':
      return { ...state, phase: 'creating', error: null };
    case 'EXAM_CREATED':
      return {
        ...state,
        phase: 'session',
        activeExam: action.exam,
        error: null,
      };
    case 'RESUME_EXAM':
      return {
        ...state,
        phase: 'session',
        activeExam: action.exam,
        error: null,
      };
    case 'ANSWER':
      if (!state.activeExam) return state;
      return {
        ...state,
        activeExam: {
          ...state.activeExam,
          answers: {
            ...state.activeExam.answers,
            [action.questionId]: action.optionIndex,
          },
        },
      };
    case 'START_SUBMITTING':
      return { ...state, phase: 'submitting' };
    case 'EXAM_SUBMITTED':
      return {
        ...state,
        phase: 'results',
        results: action.results,
        activeExam: null,
      };
    case 'RESET':
      return { phase: 'config', activeExam: null, results: null, error: null };
    case 'ERROR':
      return {
        ...state,
        phase: state.activeExam ? 'session' : 'config',
        error: action.message,
      };
    default:
      return state;
  }
}

const STORAGE_KEY = 'eduflow_active_exam';

interface PendingSave {
  examId: string;
  questionId: string;
  optionIndex: number;
  attempt: number;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function useAnswerRetryQueue() {
  const queueRef = useRef<PendingSave[]>([]);
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const item = queueRef.current[0];
      try {
        await saveAnswer(item.examId, item.questionId, item.optionIndex);
        queueRef.current.shift();
      } catch {
        if (item.attempt >= MAX_RETRIES) {
          queueRef.current.shift();
          continue;
        }
        item.attempt++;
        const delay = BASE_DELAY_MS * Math.pow(2, item.attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    processingRef.current = false;
  }, []);

  const enqueue = useCallback(
    (examId: string, questionId: string, optionIndex: number) => {
      queueRef.current = queueRef.current.filter(
        (p: PendingSave) => p.questionId !== questionId
      );
      queueRef.current.push({ examId, questionId, optionIndex, attempt: 0 });
      processQueue();
    },
    [processQueue]
  );

  return enqueue;
}

function persistExam(exam: ActiveExam) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(exam));
  } catch {
    /* quota exceeded */
  }
}

function recoverExam(): ActiveExam | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveExam;
  } catch {
    return null;
  }
}

function clearPersistedExam() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default function ExamsPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner size={28} />
          </div>
        </Shell>
      }
    >
      <ExamsContent />
    </Suspense>
  );
}

function ExamsContent() {
  const t = useTranslations('examsPage');
  const tErr = useTranslations('examError');
  const [state, dispatch] = useReducer(examReducer, {
    phase: 'config',
    activeExam: null,
    results: null,
    error: null,
  });
  const { addToast } = useToast();
  const { studies } = useStudies();
  const searchParams = useSearchParams();
  const preselectedStudyId = searchParams.get('studyId') || undefined;
  const enqueueSave = useAnswerRetryQueue();

  useEffect(() => {
    const recovered = recoverExam();
    if (recovered) {
      dispatch({ type: 'RESUME_EXAM', exam: recovered });
      return;
    }

    dispatch({ type: 'SET_CHECKING_RESUME' });
    fetch('/api/exams/in-progress')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const studyName =
            studies.find((s) => s.id === json.data.studyId)?.name ||
            json.data.studyId;
          const exam: ActiveExam = {
            id: json.data.id,
            studyId: json.data.studyId || json.data.certification || '',
            studyName,
            timeLimitMinutes: json.data.config?.timeLimitMinutes || 0,
            initialTimeRemaining: json.data.serverRemainingSeconds,
            questions: json.data.questions || [],
            answers: json.data.answers || {},
          };
          dispatch({ type: 'RESUME_EXAM', exam });
          persistExam(exam);
        } else {
          dispatch({ type: 'NO_RESUME_FOUND' });
        }
      })
      .catch(() => {
        dispatch({ type: 'NO_RESUME_FOUND' });
      });
  }, [studies]);

  useEffect(() => {
    if (state.activeExam) {
      persistExam(state.activeExam);
    }
  }, [state.activeExam]);

  async function handleStartExam(config: {
    studyId: string;
    questionCount: number;
    timeLimitMinutes: number;
    difficulty: Difficulty | 'all';
    domainIds: string[];
    mode: ExamMode;
  }) {
    dispatch({ type: 'START_CREATING' });
    try {
      const result = await createExam(config);
      const answers: Record<string, number | null> = {};
      for (const q of result.questions) {
        answers[q.id] = null;
      }

      const studyName =
        studies.find((s) => s.id === config.studyId)?.name || config.studyId;

      const exam: ActiveExam = {
        id: result.id,
        studyId: config.studyId,
        studyName,
        timeLimitMinutes: config.timeLimitMinutes,
        questions: result.questions,
        answers,
      };

      dispatch({ type: 'EXAM_CREATED', exam });
      persistExam(exam);
    } catch (error) {
      dispatch({
        type: 'ERROR',
        message: error instanceof Error ? error.message : t('createFailed'),
      });
      addToast(
        error instanceof Error ? error.message : t('createFailed'),
        'error'
      );
    }
  }

  function handleAnswer(questionId: string, selectedOptionIndex: number) {
    if (!state.activeExam) return;
    dispatch({ type: 'ANSWER', questionId, optionIndex: selectedOptionIndex });
    enqueueSave(state.activeExam.id, questionId, selectedOptionIndex);
  }

  const handleSubmit = useCallback(async () => {
    if (!state.activeExam || state.phase === 'submitting') return;

    dispatch({ type: 'START_SUBMITTING' });
    try {
      const result = await submitExam(
        state.activeExam.id,
        state.activeExam.answers
      );
      clearPersistedExam();

      const badges = result.newBadges || [];
      dispatch({
        type: 'EXAM_SUBMITTED',
        results: {
          examId: state.activeExam.id,
          score: result.score,
          correctAnswers: result.correctAnswers,
          totalQuestions: result.totalQuestions,
          domainScores: result.domainScores,
          studyName: state.activeExam.studyName,
          newBadges: badges,
        },
      });

      if (badges.length > 0) {
        const BADGE_EMOJI: Record<string, string> = {
          first_exam: '🎓',
          streak_3: '🔥',
          streak_7: '⚡',
          streak_30: '💎',
          perfect_score: '🏆',
          centurion: '💯',
          domain_master: '🎯',
        };
        for (const b of badges) {
          addToast(
            `${BADGE_EMOJI[b] || '🏅'} ${t('badgeUnlocked', { badge: b.replace(/_/g, ' ') })}`,
            'success'
          );
        }
      }
    } catch (error) {
      dispatch({
        type: 'ERROR',
        message: error instanceof Error ? error.message : t('submitFailed'),
      });
      addToast(
        error instanceof Error ? error.message : t('submitFailed'),
        'error'
      );
    }
  }, [state.activeExam, state.phase, addToast, t]);

  if (state.phase === 'checking-resume') {
    return (
      <Shell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size={28} />
        </div>
      </Shell>
    );
  }

  if (
    (state.phase === 'session' || state.phase === 'submitting') &&
    state.activeExam
  ) {
    const activeStudy = studies.find((s) => s.id === state.activeExam!.studyId);
    const domainMap: Record<string, string> = {};
    if (activeStudy) {
      for (const d of activeStudy.domains) {
        domainMap[d.id] = d.abbreviation;
      }
    }

    return (
      <ExamErrorBoundary
        examId={state.activeExam.id}
        labels={{
          title: tErr('title'),
          description: tErr('description'),
          resume: tErr('resume'),
          backToExams: tErr('backToExams'),
        }}
      >
        <ExamSession
          questions={state.activeExam.questions}
          timeLimitMinutes={state.activeExam.timeLimitMinutes}
          initialTimeRemaining={state.activeExam.initialTimeRemaining}
          answers={state.activeExam.answers}
          onAnswer={handleAnswer}
          onSubmit={handleSubmit}
          domainMap={domainMap}
        />
      </ExamErrorBoundary>
    );
  }

  return (
    <Shell>
      {(state.phase === 'config' || state.phase === 'creating') && (
        <div className="space-y-6">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              {t('startExam')}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('configureExam')}
            </p>
          </div>
          <ExamConfigForm
            studies={studies}
            activeStudyId={preselectedStudyId}
            onStart={handleStartExam}
            isLoading={state.phase === 'creating'}
          />
        </div>
      )}

      {state.phase === 'results' && state.results && (
        <ExamResults
          examId={state.results.examId}
          score={state.results.score}
          correctAnswers={state.results.correctAnswers}
          totalQuestions={state.results.totalQuestions}
          domainScores={state.results.domainScores}
          studyName={state.results.studyName}
          newBadges={state.results.newBadges as import('@/types').BadgeId[]}
          onBackToExams={() => dispatch({ type: 'RESET' })}
          onRetry={() => dispatch({ type: 'RESET' })}
        />
      )}
    </Shell>
  );
}
