import { describe, it, expect } from 'vitest';
import {
    AppError,
    ValidationError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    InternalError,
    ExamNotFoundError,
    ExamAlreadyCompletedError,
    ExamTimeLimitExceededError,
    QuestionNotFoundError,
    QuestionNotInExamError,
    NoQuestionsAvailableError,
} from '@/lib/errors';

describe('AppError', () => {
    it('sets message, statusCode, code, and details', () => {
        const err = new AppError('test error', 500, 'TEST_CODE', { foo: 'bar' });
        expect(err.message).toBe('test error');
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe('TEST_CODE');
        expect(err.details).toEqual({ foo: 'bar' });
    });

    it('is an instance of Error', () => {
        const err = new AppError('x', 500, 'X');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(AppError);
    });

    it('has a stack trace', () => {
        const err = new AppError('x', 500, 'X');
        expect(err.stack).toBeDefined();
    });
});

describe('ValidationError (400)', () => {
    it('defaults to 400 and VALIDATION_ERROR', () => {
        const err = new ValidationError();
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(err.message).toBe('Validation failed');
        expect(err.name).toBe('ValidationError');
    });

    it('accepts custom message and details', () => {
        const details = { field: 'email', issue: 'invalid' };
        const err = new ValidationError('Bad email', details);
        expect(err.message).toBe('Bad email');
        expect(err.details).toEqual(details);
    });

    it('is instanceof AppError and Error', () => {
        const err = new ValidationError();
        expect(err).toBeInstanceOf(AppError);
        expect(err).toBeInstanceOf(Error);
    });
});

describe('BadRequestError (400)', () => {
    it('defaults correctly', () => {
        const err = new BadRequestError();
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('BAD_REQUEST');
        expect(err.name).toBe('BadRequestError');
    });
});

describe('UnauthorizedError (401)', () => {
    it('defaults correctly', () => {
        const err = new UnauthorizedError();
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
        expect(err.name).toBe('UnauthorizedError');
    });
});

describe('ForbiddenError (403)', () => {
    it('defaults correctly', () => {
        const err = new ForbiddenError();
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
        expect(err.name).toBe('ForbiddenError');
    });
});

describe('NotFoundError (404)', () => {
    it('includes resource name in message', () => {
        const err = new NotFoundError('User');
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe('User not found');
        expect(err.code).toBe('NOT_FOUND');
    });

    it('defaults to "Resource"', () => {
        const err = new NotFoundError();
        expect(err.message).toBe('Resource not found');
    });
});

describe('ConflictError (409)', () => {
    it('defaults correctly', () => {
        const err = new ConflictError();
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('CONFLICT');
    });
});

describe('RateLimitError (429)', () => {
    it('defaults correctly', () => {
        const err = new RateLimitError();
        expect(err.statusCode).toBe(429);
        expect(err.code).toBe('RATE_LIMITED');
        expect(err.name).toBe('RateLimitError');
    });
});

describe('InternalError (500)', () => {
    it('defaults correctly', () => {
        const err = new InternalError();
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe('INTERNAL_ERROR');
    });
});

describe('Domain-specific errors', () => {
    it('ExamNotFoundError is a 404', () => {
        const err = new ExamNotFoundError();
        expect(err).toBeInstanceOf(NotFoundError);
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe('Exam not found');
        expect(err.name).toBe('ExamNotFoundError');
    });

    it('ExamAlreadyCompletedError is a 409', () => {
        const err = new ExamAlreadyCompletedError();
        expect(err).toBeInstanceOf(ConflictError);
        expect(err.statusCode).toBe(409);
        expect(err.message).toBe('Exam already completed');
    });

    it('ExamTimeLimitExceededError is a 400', () => {
        const err = new ExamTimeLimitExceededError();
        expect(err).toBeInstanceOf(BadRequestError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('Exam time limit exceeded');
    });

    it('QuestionNotFoundError is a 404', () => {
        const err = new QuestionNotFoundError();
        expect(err).toBeInstanceOf(NotFoundError);
        expect(err.message).toBe('Question not found');
    });

    it('QuestionNotInExamError is a 400', () => {
        const err = new QuestionNotInExamError();
        expect(err).toBeInstanceOf(BadRequestError);
        expect(err.message).toBe('Question not in this exam');
    });

    it('NoQuestionsAvailableError is a 400', () => {
        const err = new NoQuestionsAvailableError();
        expect(err).toBeInstanceOf(BadRequestError);
        expect(err.message).toBe('No questions available for this configuration');
    });
});
