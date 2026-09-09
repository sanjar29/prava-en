import { userId } from './telegram'

/**
 * Per-user progress, stored locally on the device.
 * Deliberately schema-light so it can later be synced to a backend without
 * changing the call sites: read/write go through these two functions only.
 */

export interface ExamRecord {
  at: number
  correct: number
  total: number
  passed: boolean
  seconds: number
}

export interface Progress {
  /** questionId -> { seen, correct } */
  stats: Record<string, { seen: number; correct: number }>
  exams: ExamRecord[]
  streakDays: number
  lastActiveDay: string | null
}

const empty: Progress = { stats: {}, exams: [], streakDays: 0, lastActiveDay: null }
const key = () => `prava-en:progress:${userId()}`

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(key())
    if (!raw) return { ...empty }
    return { ...empty, ...(JSON.parse(raw) as Progress) }
  } catch {
    return { ...empty }
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(key(), JSON.stringify(p))
  } catch {
    /* private mode / storage disabled — progress is a convenience, not a requirement */
  }
}

const today = () => new Date().toISOString().slice(0, 10)

export function recordAnswer(p: Progress, questionId: string, correct: boolean): Progress {
  const prev = p.stats[questionId] ?? { seen: 0, correct: 0 }
  const next: Progress = {
    ...p,
    stats: {
      ...p.stats,
      [questionId]: { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0) },
    },
  }
  return touchStreak(next)
}

export function recordExam(p: Progress, rec: ExamRecord): Progress {
  return touchStreak({ ...p, exams: [rec, ...p.exams].slice(0, 50) })
}

function touchStreak(p: Progress): Progress {
  const d = today()
  if (p.lastActiveDay === d) return p
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const streakDays = p.lastActiveDay === yesterday ? p.streakDays + 1 : 1
  return { ...p, lastActiveDay: d, streakDays }
}

/** Questions answered wrong at least once and not yet answered right more often than wrong. */
export function weakQuestionIds(p: Progress): string[] {
  return Object.entries(p.stats)
    .filter(([, s]) => s.seen > s.correct)
    .sort((a, b) => a[1].correct / a[1].seen - b[1].correct / b[1].seen)
    .map(([id]) => id)
}

export function categoryAccuracy(p: Progress, ids: string[]): { seen: number; correct: number } {
  return ids.reduce(
    (acc, id) => {
      const s = p.stats[id]
      return s ? { seen: acc.seen + s.seen, correct: acc.correct + s.correct } : acc
    },
    { seen: 0, correct: 0 },
  )
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(key())
  } catch {
    /* ignore */
  }
}
