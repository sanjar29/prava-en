import bank from '../../../data/questions.json'

export interface Question {
  id: string
  category: string
  question: string
  options: string[]
  answer: number
  explanation: string
  rule: string
}

export interface Category {
  id: string
  name: string
  icon: string
}

export const EXAM = bank.meta.exam as {
  questionCount: number
  timeLimitMinutes: number
  maxMistakes: number
  passScore: number
}

export const DISCLAIMER = bank.meta.disclaimer as string
export const categories = bank.categories as Category[]
export const questions = bank.questions as Question[]

export const byId = new Map(questions.map((q) => [q.id, q]))
export const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id
export const categoryIcon = (id: string) => categories.find((c) => c.id === id)?.icon ?? '•'

export const inCategory = (id: string) => questions.filter((q) => q.category === id)

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Builds an exam paper that mirrors the real one: EXAM.questionCount questions,
 * spread proportionally across categories so no single topic dominates.
 */
export function buildExam(count = EXAM.questionCount): Question[] {
  const pools = categories.map((c) => shuffle(inCategory(c.id)))
  const picked: Question[] = []
  let round = 0
  while (picked.length < count && round < 50) {
    for (const pool of pools) {
      if (picked.length >= count) break
      const q = pool[round]
      if (q) picked.push(q)
    }
    round++
  }
  return shuffle(picked).slice(0, count)
}

/** A practice set: weakest-first, so repeated mistakes come back around. */
export function buildPractice(categoryId: string | null, weakIds: string[], count = 10): Question[] {
  const pool = categoryId ? inCategory(categoryId) : questions
  const weak = pool.filter((q) => weakIds.includes(q.id))
  const rest = shuffle(pool.filter((q) => !weakIds.includes(q.id)))
  return [...shuffle(weak), ...rest].slice(0, count)
}
