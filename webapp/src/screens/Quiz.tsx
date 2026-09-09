import { useEffect, useMemo, useRef, useState } from 'react'
import QuestionCard from '../components/QuestionCard'
import type { Question } from '../lib/questions'
import { EXAM } from '../lib/questions'
import { haptic } from '../lib/telegram'

export interface QuizResult {
  mode: 'exam' | 'practice'
  questions: Question[]
  answers: (number | null)[]
  correct: number
  seconds: number
  passed: boolean
  timedOut: boolean
}

interface Props {
  mode: 'exam' | 'practice'
  questions: Question[]
  onAnswer: (q: Question, correct: boolean) => void
  onFinish: (r: QuizResult) => void
  onQuit: () => void
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Quiz({ mode, questions, onAnswer, onFinish, onQuit }: Props) {
  const isExam = mode === 'exam'
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [left, setLeft] = useState(EXAM.timeLimitMinutes * 60)
  const startedAt = useRef(Date.now())
  const finished = useRef(false)

  const answered = answers[i] !== null
  const q = questions[i]

  const finish = useMemo(
    () =>
      (final: (number | null)[], timedOut = false) => {
        if (finished.current) return
        finished.current = true
        const correct = final.reduce<number>(
          (n, a, k) => n + (a !== null && a === questions[k].answer ? 1 : 0),
          0,
        )
        const seconds = Math.round((Date.now() - startedAt.current) / 1000)
        const passed = isExam
          ? correct >= questions.length - EXAM.maxMistakes && !timedOut
          : correct === questions.length
        haptic(passed ? 'success' : 'error')
        onFinish({ mode, questions, answers: final, correct, seconds, passed, timedOut })
      },
    [isExam, mode, onFinish, questions],
  )

  // Exam clock. Practice is untimed, so no interval is started at all.
  useEffect(() => {
    if (!isExam) return
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          setAnswers((a) => {
            finish(a, true)
            return a
          })
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [isExam, finish])

  function choose(choice: number) {
    if (answers[i] !== null) return
    const next = answers.slice()
    next[i] = choice
    setAnswers(next)
    const isCorrect = choice === q.answer
    onAnswer(q, isCorrect)
    haptic(isExam ? 'select' : isCorrect ? 'success' : 'error')

    // In the exam, advance automatically the way the real terminal does.
    if (isExam) {
      setTimeout(() => {
        if (i + 1 < questions.length) setI(i + 1)
        else finish(next)
      }, 180)
    }
  }

  function next() {
    if (i + 1 < questions.length) setI(i + 1)
    else finish(answers)
  }

  return (
    <div className="app">
      <div className="progressdots">
        {questions.map((qq, k) => {
          const a = answers[k]
          let cls = ''
          if (a !== null) cls = isExam ? 'done' : a === qq.answer ? 'ok' : 'no'
          return <i key={qq.id} className={cls} />
        })}
      </div>

      <QuestionCard
        question={q}
        index={i}
        total={questions.length}
        chosen={answers[i]}
        reveal={!isExam}
        onChoose={choose}
        right={
          isExam ? (
            <span className={`timer${left <= 60 ? ' urgent' : ''}`}>
              {mmss(left)} · {i + 1}/{questions.length}
            </span>
          ) : undefined
        }
      />

      {!isExam && (
        <button className="btn" disabled={!answered} onClick={next}>
          {i + 1 < questions.length ? 'Next question' : 'Finish'}
        </button>
      )}

      <button className="btn secondary" onClick={onQuit}>
        {isExam ? 'Abandon exam' : 'Back'}
      </button>

      {isExam && (
        <p className="footer">
          Real exam conditions: {EXAM.questionCount} questions, {EXAM.timeLimitMinutes} minutes, no more than{' '}
          {EXAM.maxMistakes} mistakes. Answers are revealed at the end.
        </p>
      )}
    </div>
  )
}
