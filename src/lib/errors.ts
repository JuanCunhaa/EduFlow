/**
 * Domain-specific error classes.
 * Provide structured error information for API responses and logging.
 */

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown;

    constructor(message: string, statusCode: number, code: string, details?: unknown) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        // Maintains proper stack trace in V8
        if ('captureStackTrace' in Error) {
            (Error as { captureStackTrace: (t: object, c: Function) => void })
                .captureStackTrace(this, this.constructor);
        }
    }
}

// ── 400 Bad Request ──────────────────────────────
export class ValidationError extends AppError {
    constructor(message = 'Validation failed', details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Bad request', details?: unknown) {
        super(message, 400, 'BAD_REQUEST', details);
        this.name = 'BadRequestError';
    }
}

// ── 401 Unauthorized ─────────────────────────────
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

// ── 403 Forbidden ────────────────────────────────
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

// ── 404 Not Found ────────────────────────────────
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

// ── 409 Conflict ─────────────────────────────────
export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

// ── 429 Too Many Requests ────────────────────────
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMITED');
        this.name = 'RateLimitError';
    }
}

// ── 500 Internal ─────────────────────────────────
export class InternalError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'INTERNAL_ERROR');
        this.name = 'InternalError';
    }
}

// ── Domain-specific errors ───────────────────────
export class ExamNotFoundError extends NotFoundError {
    constructor() {
        super('Exam');
        this.name = 'ExamNotFoundError';
    }
}

export class ExamAlreadyCompletedError extends ConflictError {
    constructor() {
        super('Exam already completed');
        this.name = 'ExamAlreadyCompletedError';
    }
}

export class ExamTimeLimitExceededError extends BadRequestError {
    constructor() {
        super('Exam time limit exceeded');
        this.name = 'ExamTimeLimitExceededError';
    }
}

export class QuestionNotFoundError extends NotFoundError {
    constructor() {
        super('Question');
        this.name = 'QuestionNotFoundError';
    }
}

export class StudyNotFoundError extends NotFoundError {
    constructor() {
        super('Study');
        this.name = 'StudyNotFoundError';
    }
}

export class QuestionNotInExamError extends BadRequestError {
    constructor() {
        super('Question not in this exam');
        this.name = 'QuestionNotInExamError';
    }
}

export class NoQuestionsAvailableError extends BadRequestError {
    constructor(message = 'No questions available for this configuration') {
        super(message);
        this.name = 'NoQuestionsAvailableError';
    }
}
