import { categories, inCategory, questions } from '../lib/questions'
import type { Progress } from '../lib/storage'
import { categoryAccuracy, resetProgress } from '../lib/storage'

interface Props {
  progress: Progress
  onBack: () => void
  onReset: () => void
}

export default function ProgressScreen({ progress, onBack, onReset }: Props) {
  const exams = progress.exams
  const passed = exams.filter((e) => e.passed).length
  const attempted = Object.keys(progress.stats).length
  const totals = Object.values(progress.stats).reduce(
    (a, s) => ({ seen: a.seen + s.seen, correct: a.correct + s.correct }),
    { seen: 0, correct: 0 },
  )
  const overall = totals.seen ? Math.round((totals.correct / totals.seen) * 100) : 0

  return (
    <div className="app">
      <h1 className="h1">Your progress</h1>
      <p className="sub">Stored on this device only.</p>

      <div className="card">
        <div className="row">
          <span>Overall accuracy</span>
          <strong>{totals.seen ? `${overall}%` : '—'}</strong>
        </div>
        <div className="row">
          <span>Coverage</span>
          <strong>
            {attempted} / {questions.length} questions seen
          </strong>
        </div>
        <div className="row">
          <span>Mock exams</span>
          <strong>
            {exams.length} taken · {passed} passed
          </strong>
        </div>
        <div className="row">
          <span>Study streak</span>
          <strong>{progress.streakDays > 0 ? `🔥 ${progress.streakDays} days` : '—'}</strong>
        </div>
      </div>

      <h2 className="h2">By topic</h2>
      {categories.map((c) => {
        const ids = inCategory(c.id).map((q) => q.id)
        const { seen, correct } = categoryAccuracy(progress, ids)
        const pct = seen ? Math.round((correct / seen) * 100) : 0
        const tone = !seen ? '' : pct >= 85 ? '' : pct >= 60 ? ' mid' : ' low'
        return (
          <div className="card" key={c.id} style={{ padding: '11px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>
                {c.icon} {c.name}
              </span>
              <strong>{seen ? `${pct}%` : 'not started'}</strong>
            </div>
            <div className={`bar${tone}`}>
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}

      {exams.length > 0 && (
        <>
          <h2 className="h2">Exam history</h2>
          <div className="card">
            {exams.slice(0, 10).map((e, i) => (
              <div className="row" key={i}>
                <span>{new Date(e.at).toLocaleDateString()}</span>
                <strong style={{ color: e.passed ? 'var(--ok)' : 'var(--bad)' }}>
                  {e.correct}/{e.total} {e.passed ? 'pass' : 'fail'}
                </strong>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn" onClick={onBack}>
        Back
      </button>
      <button
        className="btn secondary"
        onClick={() => {
          resetProgress()
          onReset()
        }}
      >
        Reset all progress
      </button>
    </div>
  )
}
