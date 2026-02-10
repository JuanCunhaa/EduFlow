import type { Timestamp } from 'firebase/firestore';

// === Enums & Literals ===

export type Certification = 'CISSP' | 'CC' | 'SSCP' | 'CCSP' | 'CGRC';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ExamStatus = 'in_progress' | 'completed' | 'abandoned';

// === Question ===

export interface Option {
    label: string; // "A", "B", "C", "D"
    text: string;
}

export interface Question {
    id: string;
    certification: Certification;
    domain: string;
    domainNumber: number;
    text: string;
    options: Option[];
    correctOptionIndex: number;
    explanation: string;
    difficulty: Difficulty;
    tags: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/** Question as sent to the client during an active exam (no correct answer) */
export type ExamQuestion = Omit<Question, 'correctOptionIndex' | 'explanation'>;

// === Exam ===

export interface ExamConfig {
    questionCount: number;
    timeLimitMinutes: number; // 0 = untimed (study mode)
    domains: number[];        // empty = all domains
    difficulty: Difficulty | 'all';
}

export interface DomainScore {
    domain: string;
    correct: number;
    total: number;
    percentage: number;
}

export interface Exam {
    id: string;
    userId: string;
    certification: Certification;
    status: ExamStatus;
    config: ExamConfig;
    questionIds: string[];
    answers: Record<string, number | null>; // questionId → selectedOptionIndex
    score: number | null;
    domainScores: Record<string, DomainScore>;
    startedAt: Timestamp;
    completedAt: Timestamp | null;
    timeSpentSeconds: number;
}

// === User ===

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    targetCertification: Certification;
    examsTaken: number;
    averageScore: number;
    createdAt: Timestamp;
    lastActiveAt: Timestamp;
}

export interface ExamAttemptSummary {
    examId: string;
    certification: Certification;
    score: number;
    questionCount: number;
    timeSpentSeconds: number;
    completedAt: Timestamp;
}

// === API ===

export interface ApiError {
    error: string;
    details?: string;
}

export interface ApiSuccess<T = unknown> {
    data: T;
}
