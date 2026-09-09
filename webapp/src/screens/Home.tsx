import { EXAM, DISCLAIMER, categories, inCategory, questions } from '../lib/questions'
import type { Progress } from '../lib/storage'
import { categoryAccuracy, weakQuestionIds } from '../lib/storage'
import { userName } from '../lib/telegram'

interface Props {
  progress: Progress
  onExam: () => void
  onPractice: (categoryId: string | null) => void
  onWeakSpots: () => void
  onProgress: () => void
}

export default function Home({ progress, onExam, onPractice, onWeakSpots, onProgress }: Props) {
  const name = userName()
  const weak = weakQuestionIds(progress)
  const answered = Object.keys(progress.stats).length
  const lastExam = progress.exams[0]

  return (
    <div className="app">
      <h1 className="h1">{name ? `Prava EN · Hi, ${name}` : 'Prava EN'}</h1>
      <p className="sub">
        The Uzbekistan driving theory exam, in English. {questions.length} questions across{' '}
        {categories.length} topics.
      </p>

      <button className="btn" onClick={onExam}>
        Start mock exam · {EXAM.questionCount} questions, {EXAM.timeLimitMinutes} min
      </button>
      <button className="btn secondary" onClick={() => onPractice(null)}>
        Quick practice · 10 questions, untimed
      </button>
      {weak.length > 0 && (
        <button className="btn secondary" onClick={onWeakSpots}>
          Drill your weak spots · {weak.length} question{weak.length > 1 ? 's' : ''}
        </button>
      )}

      {(answered > 0 || lastExam) && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row">
            <span>Questions attempted</span>
            <strong>
              {answered} / {questions.length}
            </strong>
          </div>
          {lastExam && (
            <div className="row">
              <span>Last mock exam</span>
              <strong style={{ color: lastExam.passed ? 'var(--ok)' : 'var(--bad)' }}>
                {lastExam.correct}/{lastExam.total} · {lastExam.passed ? 'pass' : 'fail'}
              </strong>
            </div>
          )}
          {progress.streakDays > 1 && (
            <div className="row">
              <span>Study streak</span>
              <strong>🔥 {progress.streakDays} days</strong>
            </div>
          )}
          <button className="linkbtn" style={{ marginTop: 8 }} onClick={onProgress}>
            See full progress →
          </button>
        </div>
      )}

      <h2 className="h2">Study by topic</h2>
      {categories.map((c) => {
        const ids = inCategory(c.id).map((q) => q.id)
        const { seen, correct } = categoryAccuracy(progress, ids)
        const pct = seen ? Math.round((correct / seen) * 100) : 0
        const tone = !seen ? '' : pct >= 85 ? '' : pct >= 60 ? ' mid' : ' low'
        return (
          <button key={c.id} className="tile" onClick={() => onPractice(c.id)}>
            <span className="icon">{c.icon}</span>
            <span className="grow">
              <span className="name">{c.name}</span>
              <span className="meta">
                {ids.length} questions{seen > 0 && ` · ${pct}% accuracy`}
              </span>
              {seen > 0 && (
                <span className={`bar${tone}`}>
                  <span style={{ width: `${pct}%` }} />
                </span>
              )}
            </span>
            <span className="hint">›</span>
          </button>
        )
      })}

      <p className="footer">{DISCLAIMER}</p>
    </div>
  )
}
