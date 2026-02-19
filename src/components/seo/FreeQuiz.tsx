'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QuizQuestion {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FreeQuiz({
  questions,
  certAbbr,
  locale,
}: Readonly<{
  questions: QuizQuestion[];
  certAbbr: string;
  locale: string;
}>) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];

  const handleSelect = useCallback(
    (idx: number) => {
      if (answered) return;
      setSelected(idx);
    },
    [answered]
  );

  const handleCheck = useCallback(() => {
    if (selected === null) return;
    setAnswered(true);
    if (selected === q.correctIndex) {
      setScore((s) => s + 1);
    }
  }, [selected, q?.correctIndex]);

  const handleNext = useCallback(() => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }, [current, questions.length]);

  /* ---- Result screen ---- */
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="seo-quiz">
        <div className="seo-quiz__result">
          <p className="seo-quiz__score">
            {score}/{questions.length} ({pct}%)
          </p>
          <p className="seo-quiz__message">
            {pct >= 70
              ? `Great job! You're showing strong ${certAbbr} fundamentals.`
              : `Keep studying! Focus on your weak areas to improve your ${certAbbr} readiness.`}
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link href={`/${locale}/login`} className="seo-quiz__btn">
              Create Free Account
            </Link>
            <button
              type="button"
              className="seo-quiz__btn"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              onClick={() => {
                setCurrent(0);
                setSelected(null);
                setAnswered(false);
                setScore(0);
                setFinished(false);
              }}
            >
              Retry Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Question screen ---- */
  return (
    <div className="seo-quiz">
      <p className="seo-quiz__progress">
        Question {current + 1} of {questions.length}
      </p>

      <p className="seo-quiz__stem">{q.stem}</p>

      <div className="seo-quiz__options">
        {q.options.map((opt, i) => {
          let cls = 'seo-quiz__option';
          if (answered && i === q.correctIndex)
            cls += ' seo-quiz__option--correct';
          else if (answered && i === selected)
            cls += ' seo-quiz__option--wrong';
          else if (!answered && i === selected)
            cls += ' seo-quiz__option--selected';

          return (
            <button
              key={i}
              type="button"
              className={cls}
              disabled={answered}
              onClick={() => handleSelect(i)}
            >
              <span style={{ fontWeight: 600, minWidth: '1.4rem' }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered && <div className="seo-quiz__explanation">{q.explanation}</div>}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        {!answered ? (
          <button
            type="button"
            className="seo-quiz__btn"
            disabled={selected === null}
            onClick={handleCheck}
          >
            Check Answer
          </button>
        ) : (
          <button type="button" className="seo-quiz__btn" onClick={handleNext}>
            {current + 1 < questions.length ? 'Next Question →' : 'See Results'}
          </button>
        )}
      </div>
    </div>
  );
}
