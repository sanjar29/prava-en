import { useCallback, useEffect, useState } from 'react'
import Home from './screens/Home'
import Quiz, { type QuizResult } from './screens/Quiz'
import Result from './screens/Result'
import ProgressScreen from './screens/ProgressScreen'
import { EXAM, buildExam, buildPractice, type Question } from './lib/questions'
import {
  loadProgress,
  recordAnswer,
  recordExam,
  saveProgress,
  weakQuestionIds,
  type Progress,
} from './lib/storage'
import { initTelegram, tg } from './lib/telegram'

type View =
  | { name: 'home' }
  | { name: 'quiz'; mode: 'exam' | 'practice'; questions: Question[]; from: 'exam' | 'practice' | 'weak'; categoryId: string | null }
  | { name: 'result'; result: QuizResult; from: 'exam' | 'practice' | 'weak'; categoryId: string | null }
  | { name: 'progress' }

export default function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [view, setView] = useState<View>({ name: 'home' })

  useEffect(() => {
    initTelegram()
  }, [])

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  // Telegram's native back button mirrors in-app navigation.
  useEffect(() => {
    const back = tg()?.BackButton
    if (!back) return
    const go = () => setView({ name: 'home' })
    if (view.name === 'home') {
      back.hide()
    } else {
      back.show()
      back.onClick(go)
    }
    return () => back.offClick(go)
  }, [view.name])

  const startExam = useCallback(() => {
    setView({ name: 'quiz', mode: 'exam', questions: buildExam(), from: 'exam', categoryId: null })
  }, [])

  const startPractice = useCallback(
    (categoryId: string | null) => {
      const qs = buildPractice(categoryId, weakQuestionIds(progress), 10)
      setView({ name: 'quiz', mode: 'practice', questions: qs, from: 'practice', categoryId })
    },
    [progress],
  )

  const startWeakSpots = useCallback(() => {
    const weak = weakQuestionIds(progress)
    const qs = buildPractice(null, weak, Math.min(10, weak.length))
    setView({ name: 'quiz', mode: 'practice', questions: qs, from: 'weak', categoryId: null })
  }, [progress])

  const handleAnswer = useCallback((q: Question, correct: boolean) => {
    setProgress((p) => recordAnswer(p, q.id, correct))
  }, [])

  const handleFinish = useCallback(
    (result: QuizResult) => {
      if (result.mode === 'exam') {
        setProgress((p) =>
          recordExam(p, {
            at: Date.now(),
            correct: result.correct,
            total: result.questions.length,
            passed: result.passed,
            seconds: result.seconds,
          }),
        )
      }
      setView((v) =>
        v.name === 'quiz'
          ? { name: 'result', result, from: v.from, categoryId: v.categoryId }
          : { name: 'result', result, from: 'practice', categoryId: null },
      )
    },
    [],
  )

  if (view.name === 'quiz') {
    return (
      <Quiz
        key={view.questions.map((q) => q.id).join()}
        mode={view.mode}
        questions={view.questions}
        onAnswer={handleAnswer}
        onFinish={handleFinish}
        onQuit={() => setView({ name: 'home' })}
      />
    )
  }

  if (view.name === 'result') {
    return (
      <Result
        result={view.result}
        onHome={() => setView({ name: 'home' })}
        onRetry={() => {
          if (view.from === 'exam') startExam()
          else if (view.from === 'weak') startWeakSpots()
          else startPractice(view.categoryId)
        }}
      />
    )
  }

  if (view.name === 'progress') {
    return (
      <ProgressScreen
        progress={progress}
        onBack={() => setView({ name: 'home' })}
        onReset={() => {
          setProgress(loadProgress())
          setView({ name: 'home' })
        }}
      />
    )
  }

  return (
    <Home
      progress={progress}
      onExam={startExam}
      onPractice={startPractice}
      onWeakSpots={startWeakSpots}
      onProgress={() => setView({ name: 'progress' })}
    />
  )
}

export { EXAM }
