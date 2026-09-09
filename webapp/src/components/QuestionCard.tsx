import type { Question } from '../lib/questions'
import { categoryIcon, categoryName } from '../lib/questions'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

interface Props {
  question: Question
  index: number
  total: number
  chosen: number | null
  /** Practice reveals the answer immediately; the exam withholds it until the end. */
  reveal: boolean
  onChoose: (i: number) => void
  right?: React.ReactNode
}

export default function QuestionCard({ question, index, total, chosen, reveal, onChoose, right }: Props) {
  const answered = chosen !== null
  const correct = chosen === question.answer

  const optionClass = (i: number) => {
    if (!answered) return 'opt'
    if (!reveal) return chosen === i ? 'opt chosen' : 'opt'
    if (i === question.answer) return 'opt correct'
    if (i === chosen) return 'opt wrong'
    return 'opt'
  }

  return (
    <div>
      <div className="qhead">
        <span>
          {categoryIcon(question.category)} {categoryName(question.category)}
        </span>
        <span>{right ?? `${index + 1} / ${total}`}</span>
      </div>

      <p className="qtext">{question.question}</p>

      {question.options.map((opt, i) => (
        <button
          key={i}
          className={optionClass(i)}
          disabled={answered}
          onClick={() => onChoose(i)}
        >
          <span className="letter">{LETTERS[i]}</span>
          <span>{opt}</span>
        </button>
      ))}

      {answered && reveal && (
        <div className={`explain ${correct ? 'correct' : 'wrong'}`}>
          <div className="verdict">{correct ? 'Correct' : 'Not quite'}</div>
          <div>{question.explanation}</div>
          <div className="rule">{question.rule}</div>
        </div>
      )}
    </div>
  )
}
