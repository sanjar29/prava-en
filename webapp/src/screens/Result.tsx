import { useState } from 'react'
import type { QuizResult } from './Quiz'
import { EXAM, categoryName } from '../lib/questions'

interface Props {
  result: QuizResult
  onRetry: () => void
  onHome: () => void
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Result({ result, onRetry, onHome }: Props) {
  const [showReview, setShowReview] = useState(false)
  const { questions, answers, correct, passed, seconds, timedOut, mode } = result
  const wrong = questions
    .map((q, i) => ({ q, a: answers[i] }))
    .filter(({ q, a }) => a !== q.answer)

  return (
    <div className="app">
      <div className="verdictbig">
        <div className="mark">{passed ? '✅' : '❌'}</div>
        <div className="title">
          {mode === 'exam' ? (passed ? 'Passed' : 'Failed') : passed ? 'Perfect round' : 'Round complete'}
        </div>
        <div className="score">
          {correct} of {questions.length} correct · {mmss(seconds)}
        </div>
      </div>

      {mode === 'exam' && (
        <div className="card">
          <div className="row">
            <span>Mistakes</span>
            <strong>
              {questions.length - correct} / {EXAM.maxMistakes} allowed
            </strong>
          </div>
          <div className="row">
            <span>Pass mark</span>
            <strong>{EXAM.passScore} correct</strong>
          </div>
          <div className="row">
            <span>Time used</span>
            <strong>
              {mmss(seconds)} of {EXAM.timeLimitMinutes}:00
            </strong>
          </div>
          {timedOut && <div className="row" style={{ color: 'var(--bad)' }}>Time ran out before you finished.</div>}
        </div>
      )}

      {wrong.length > 0 && (
        <button className="btn secondary" onClick={() => setShowReview((s) => !s)}>
          {showReview ? 'Hide' : `Review ${wrong.length} mistake${wrong.length > 1 ? 's' : ''}`}
        </button>
      )}

      {showReview &&
        wrong.map(({ q, a }) => (
          <div className="card" key={q.id} style={{ marginTop: 10 }}>
            <div className="hint">{categoryName(q.category)}</div>
            <p style={{ fontWeight: 600, margin: '6px 0 10px' }}>{q.question}</p>
            <div className="explain wrong" style={{ margin: 0 }}>
              <div className="verdict">
                Your answer: {a === null ? 'not answered' : q.options[a]}
              </div>
              <div style={{ marginTop: 6 }}>
                <strong>Correct:</strong> {q.options[q.answer]}
              </div>
              <div style={{ marginTop: 6 }}>{q.explanation}</div>
              <div className="rule">{q.rule}</div>
            </div>
          </div>
        ))}

      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={onRetry}>
          {mode === 'exam' ? 'Take another mock exam' : 'Another round'}
        </button>
        <button className="btn secondary" onClick={onHome}>
          Back to menu
        </button>
      </div>
    </div>
  )
}
