import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { Telegraf, Markup } from 'telegraf'
import { getUser, setUser, allUsers } from './store.js'

const TOKEN = process.env.BOT_TOKEN
const WEBAPP_URL = process.env.WEBAPP_URL // e.g. https://sanjar29.github.io/prava-en/
const DAILY_HOUR = Number(process.env.DAILY_HOUR ?? 9) // local hour in Asia/Tashkent
const TZ_OFFSET = 5 // Uzbekistan is UTC+5, no DST

if (!TOKEN) {
  console.error('BOT_TOKEN is missing. Copy .env.example to .env and fill it in.')
  process.exit(1)
}
if (!WEBAPP_URL) {
  console.warn('WEBAPP_URL is not set — the "Open app" button will be hidden.')
}

const bank = JSON.parse(await readFile(new URL('../../data/questions.json', import.meta.url), 'utf8'))
const questions = bank.questions
const categoryName = (id) => bank.categories.find((c) => c.id === id)?.name ?? id
const LETTERS = ['A', 'B', 'C', 'D', 'E']

const bot = new Telegraf(TOKEN)

const openAppKeyboard = () =>
  WEBAPP_URL
    ? Markup.inlineKeyboard([
        [Markup.button.webApp('🚗 Start practising', WEBAPP_URL)],
        [
          Markup.button.callback('📚 Quick quiz', 'topics'),
          Markup.button.callback('📅 Daily question', 'daily'),
        ],
      ])
    : Markup.inlineKeyboard([
        [Markup.button.callback('📚 Quick quiz', 'topics')],
        [Markup.button.callback('📅 Question of the day', 'daily')],
      ])

/** Deterministic question for a given day, so everyone gets the same one. */
function questionOfTheDay(date = new Date()) {
  const day = Math.floor((date.getTime() + TZ_OFFSET * 3600e3) / 86400e3)
  return questions[day % questions.length]
}

/**
 * Options go in the message body, not on the buttons: Telegram truncates long
 * button labels, and most of these options are full sentences. The buttons are
 * just the letters, laid out in one row.
 */
function questionKeyboard(q) {
  return Markup.inlineKeyboard([
    q.options.map((_, i) => Markup.button.callback(LETTERS[i], `a:${q.id}:${i}`)),
  ])
}

function questionText(q) {
  return [
    '📅 *Question of the day*',
    `_${escapeMd(categoryName(q.category))}_`,
    '',
    escapeMd(q.question),
    '',
    ...q.options.map((opt, i) => `*${LETTERS[i]}\\.* ${escapeMd(opt)}`),
  ].join('\n')
}

async function sendQuestion(ctx, q) {
  await ctx.reply(questionText(q), { parse_mode: 'MarkdownV2', ...questionKeyboard(q) })
}

function escapeMd(s) {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`)
}

/* ------------------------------------------------------------------ *
 * In-chat topic quizzes
 *
 * A short round of questions played entirely in the chat, so the bot is
 * useful on its own and not just a launcher for the Mini App.
 * Sessions live in memory: a restart loses in-flight rounds, which is
 * fine — the user just starts another one. Long-term stats go to the store.
 * ------------------------------------------------------------------ */

const ROUND_SIZE = 5
const sessions = new Map() // userId -> { ids, i, correct, category }

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function topicsKeyboard() {
  const rows = []
  for (let i = 0; i < bank.categories.length; i += 2) {
    rows.push(
      bank.categories.slice(i, i + 2).map((c) =>
        Markup.button.callback(`${c.icon} ${c.name}`, `t:${c.id}`),
      ),
    )
  }
  return Markup.inlineKeyboard(rows)
}

function roundKeyboard(q) {
  return Markup.inlineKeyboard([
    q.options.map((_, i) => Markup.button.callback(LETTERS[i], `p:${q.id}:${i}`)),
  ])
}

function roundText(q, session) {
  return [
    `*${escapeMd(categoryName(session.category))}* · question ${session.i + 1} of ${session.ids.length}`,
    '',
    escapeMd(q.question),
    '',
    ...q.options.map((opt, i) => `*${LETTERS[i]}\\.* ${escapeMd(opt)}`),
  ].join('\n')
}

async function sendRoundQuestion(ctx, session) {
  const q = questions.find((x) => x.id === session.ids[session.i])
  await ctx.reply(roundText(q, session), { parse_mode: 'MarkdownV2', ...roundKeyboard(q) })
}

async function startRound(ctx, categoryId) {
  const pool = questions.filter((q) => q.category === categoryId)
  const ids = shuffle(pool).slice(0, ROUND_SIZE).map((q) => q.id)
  const session = { ids, i: 0, correct: 0, category: categoryId }
  sessions.set(ctx.from.id, session)
  await sendRoundQuestion(ctx, session)
}

/**
 * /start is the only screen most people will ever judge this bot on, so it
 * stays short and puts the app one tap away. Detail belongs in /help, not here.
 */
bot.start(async (ctx) => {
  await setUser(ctx.from.id, {
    username: ctx.from.username ?? null,
    name: ctx.from.first_name ?? null,
  })

  const first = ctx.from.first_name ? `${ctx.from.first_name}, t` : 'T'
  await ctx.reply(
    [
      `${first}he Uzbekistan driving theory exam — in English. 🇺🇿`,
      '',
      `${questions.length} questions, every answer explained, and a mock exam under real conditions: ${bank.meta.exam.questionCount} questions in ${bank.meta.exam.timeLimitMinutes} minutes, ${bank.meta.exam.maxMistakes} mistakes allowed.`,
      '',
      WEBAPP_URL ? 'Tap below to start practising.' : 'Tap below for a quick quiz.',
    ].join('\n'),
    openAppKeyboard(),
  )
})

bot.command('exam', async (ctx) => {
  if (!WEBAPP_URL) return ctx.reply('The app is not deployed yet.')
  await ctx.reply('Good luck — 20 questions, 25 minutes, no more than 2 mistakes.', openAppKeyboard())
})

bot.command('daily', async (ctx) => {
  await setUser(ctx.from.id, { daily: true })
  await sendQuestion(ctx, questionOfTheDay())
})

bot.command(['quiz', 'topics'], async (ctx) => {
  await ctx.reply(
    `Pick a topic — ${ROUND_SIZE} questions, answered right here in the chat.`,
    topicsKeyboard(),
  )
})

bot.action(/^t:(.+)$/, async (ctx) => {
  const categoryId = ctx.match[1]
  if (!bank.categories.some((c) => c.id === categoryId)) return ctx.answerCbQuery('Unknown topic.')
  await ctx.answerCbQuery()
  await startRound(ctx, categoryId)
})

bot.action(/^p:(.+):(\d+)$/, async (ctx) => {
  const [, qid, choiceRaw] = ctx.match
  const session = sessions.get(ctx.from.id)
  const q = questions.find((x) => x.id === qid)

  if (!q) return ctx.answerCbQuery('That question expired.')
  if (!session || session.ids[session.i] !== qid) {
    return ctx.answerCbQuery('That round has moved on — send /quiz to start a new one.')
  }

  const choice = Number(choiceRaw)
  const correct = choice === q.answer
  if (correct) session.correct++
  await ctx.answerCbQuery(correct ? '✅ Correct' : '❌ Not quite')

  const u = (await getUser(ctx.from.id)) ?? {}
  await setUser(ctx.from.id, {
    answered: (u.answered ?? 0) + 1,
    correct: (u.correct ?? 0) + (correct ? 1 : 0),
  })

  // Freeze the question with the outcome, so the round reads back as a transcript.
  await ctx.editMessageText(
    [
      `${correct ? '✅' : '❌'} *${escapeMd(q.question)}*`,
      '',
      `*Answer:* ${escapeMd(q.options[q.answer])}`,
      ...(correct ? [] : [`_You chose:_ ${escapeMd(q.options[choice])}`]),
      '',
      escapeMd(q.explanation),
      '',
      `_${escapeMd(q.rule)}_`,
    ].join('\n'),
    { parse_mode: 'MarkdownV2' },
  )

  session.i++
  if (session.i < session.ids.length) {
    await sendRoundQuestion(ctx, session)
    return
  }

  sessions.delete(ctx.from.id)
  const { correct: got, ids } = session
  const verdict =
    got === ids.length ? 'Perfect round.' : got >= ids.length - 1 ? 'Exam standard.' : 'Worth another go.'
  await ctx.reply(
    `${categoryName(session.category)} — ${got}/${ids.length}. ${verdict}`,
    Markup.inlineKeyboard(
      [
        [Markup.button.callback('🔁 Another round', `t:${session.category}`)],
        [Markup.button.callback('📚 Different topic', 'topics')],
        WEBAPP_URL ? [Markup.button.webApp('🚗 Full mock exam', WEBAPP_URL)] : null,
      ].filter(Boolean),
    ),
  )
})

bot.action('topics', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply(`Pick a topic — ${ROUND_SIZE} questions each.`, topicsKeyboard())
})

bot.command('stop', async (ctx) => {
  await setUser(ctx.from.id, { daily: false })
  await ctx.reply('Daily questions are off. Send /daily to turn them back on.')
})

bot.command('stats', async (ctx) => {
  const u = await getUser(ctx.from.id)
  if (!u || !u.answered) return ctx.reply('No answers yet — send /daily to start.')
  const pct = Math.round((u.correct / u.answered) * 100)
  await ctx.reply(
    `Answered here: ${u.answered}\nCorrect: ${u.correct} (${pct}%)\nStreak: ${u.streak} day${u.streak === 1 ? '' : 's'}`,
  )
})

bot.command('help', (ctx) =>
  ctx.reply(
    [
      `/quiz — ${ROUND_SIZE} questions on a topic you pick, here in the chat`,
      '/exam — open the app and take a full mock exam',
      '/daily — question of the day',
      '/stats — your stats',
      '/stop — turn off daily questions',
    ].join('\n'),
  ),
)

bot.action('daily', async (ctx) => {
  await ctx.answerCbQuery()
  await sendQuestion(ctx, questionOfTheDay())
})

bot.action(/^a:(.+):(\d+)$/, async (ctx) => {
  const [, qid, choiceRaw] = ctx.match
  const q = questions.find((x) => x.id === qid)
  if (!q) return ctx.answerCbQuery('That question expired.')

  const choice = Number(choiceRaw)
  const correct = choice === q.answer
  await ctx.answerCbQuery(correct ? '✅ Correct' : '❌ Not quite')

  const today = new Date(Date.now() + TZ_OFFSET * 3600e3).toISOString().slice(0, 10)
  const u = (await getUser(ctx.from.id)) ?? {}
  const yesterday = new Date(Date.now() + TZ_OFFSET * 3600e3 - 86400e3).toISOString().slice(0, 10)
  const streak = u.lastDay === today ? u.streak : u.lastDay === yesterday ? (u.streak ?? 0) + 1 : 1
  await setUser(ctx.from.id, {
    answered: (u.answered ?? 0) + 1,
    correct: (u.correct ?? 0) + (correct ? 1 : 0),
    lastDay: today,
    streak,
  })

  const body = [
    `${correct ? '✅' : '❌'} *${correct ? 'Correct' : 'Not quite'}*`,
    '',
    escapeMd(q.question),
    '',
    `*Answer:* ${escapeMd(q.options[q.answer])}`,
    '',
    escapeMd(q.explanation),
    '',
    `_${escapeMd(q.rule)}_`,
  ].join('\n')

  await ctx.editMessageText(body, {
    parse_mode: 'MarkdownV2',
    ...(WEBAPP_URL
      ? Markup.inlineKeyboard([[Markup.button.webApp('🚗 Practice more in the app', WEBAPP_URL)]])
      : {}),
  })
})

/**
 * Daily broadcast. Checked every 15 minutes; each user gets at most one
 * question per calendar day (Tashkent time), so restarts don't double-send.
 */
async function tickDaily() {
  const now = new Date(Date.now() + TZ_OFFSET * 3600e3)
  if (now.getUTCHours() !== DAILY_HOUR) return
  const day = now.toISOString().slice(0, 10)
  const q = questionOfTheDay()

  for (const u of await allUsers()) {
    if (!u.daily || u.lastSentDay === day) continue
    try {
      await bot.telegram.sendMessage(u.id, questionText(q), {
        parse_mode: 'MarkdownV2',
        ...questionKeyboard(q),
      })
      await setUser(u.id, { lastSentDay: day })
    } catch (err) {
      // 403 = user blocked the bot; stop bothering them.
      if (err?.response?.error_code === 403) await setUser(u.id, { daily: false })
      else console.error('daily send failed for', u.id, err?.message)
    }
    await new Promise((r) => setTimeout(r, 40)) // stay under Telegram's rate limit
  }
}

setInterval(() => tickDaily().catch(console.error), 15 * 60 * 1000)

await bot.telegram.setMyCommands([
  { command: 'quiz', description: 'Quick quiz on a topic' },
  { command: 'exam', description: 'Take a full mock exam' },
  { command: 'daily', description: 'Question of the day' },
  { command: 'stats', description: 'Your stats' },
  { command: 'stop', description: 'Turn off daily questions' },
  { command: 'help', description: 'Help' },
])

bot.launch()
console.log('Prava EN bot is running (long polling).')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))